import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Transactional email.
 *
 * The site had no mail provider, so this uses Resend (the provider the
 * p8courses platform already uses) through its REST API. Configure:
 *   RESEND_API_KEY  server-side key
 *   MAIL_FROM       e.g. "Pulse 8 website <website@pulse8.ie>", on a domain
 *                   verified in Resend
 *
 * Without a key in development, messages are written to .data/outbox as JSON
 * so the headers (From, To, Reply-To) can be inspected without sending
 * anything. In production a missing key is a send failure, never a silent
 * success. MAIL_TRANSPORT=fail forces failures, for testing that path.
 *
 * Message bodies and credentials are never logged.
 */

export type OutgoingMail = {
  to: string[];
  /** a single, already-validated address */
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
  /** stable per logical message, so a retried send is not delivered twice */
  idempotencyKey?: string;
};

export type SendResult = { ok: true; id?: string } | { ok: false; error: string };

function transport(): "resend" | "outbox" | "fail" | "unconfigured" {
  if (process.env.MAIL_TRANSPORT === "fail") return "fail";
  if (process.env.MAIL_TRANSPORT === "outbox") return "outbox";
  if (process.env.RESEND_API_KEY && process.env.MAIL_FROM) return "resend";
  return process.env.NODE_ENV === "production" ? "unconfigured" : "outbox";
}

function fromAddress(): string {
  return process.env.MAIL_FROM ?? "Pulse 8 website <website@pulse8.ie>";
}

const TIMEOUT_MS = 10_000;

export async function sendMail(mail: OutgoingMail): Promise<SendResult> {
  const mode = transport();

  if (mode === "fail") return { ok: false, error: "Mail transport forced to fail (MAIL_TRANSPORT=fail)." };
  if (mode === "unconfigured") return { ok: false, error: "Email is not configured on this server." };

  if (mode === "outbox") {
    const id = `outbox_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const dir = path.join(process.env.BOOKING_DATA_DIR ?? path.join(process.cwd(), ".data"), "outbox");
    try {
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, `${id}.json`),
        `${JSON.stringify(
          {
            headers: {
              From: fromAddress(),
              To: mail.to.join(", "),
              "Reply-To": mail.replyTo ?? null,
              Subject: mail.subject,
              "Idempotency-Key": mail.idempotencyKey ?? null,
            },
            text: mail.text,
            html: mail.html,
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
      return { ok: true, id };
    } catch {
      return { ok: false, error: "Could not write to the development outbox." };
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        ...(mail.idempotencyKey ? { "Idempotency-Key": mail.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: mail.to,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        ...(mail.replyTo ? { reply_to: [mail.replyTo] } : {}),
      }),
    });

    if (!response.ok) {
      // Status only. The response body can echo the message.
      return { ok: false, error: `Email provider returned ${response.status}.` };
    }
    const body = (await response.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: body.id };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return { ok: false, error: aborted ? "Email provider timed out." : "Email provider unreachable." };
  } finally {
    clearTimeout(timer);
  }
}

/** Escapes a value for an HTML email body. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** A two-column table of label and value, escaped, for staff notifications. */
export function detailsHtml(rows: Array<[string, string]>): string {
  const body = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 16px 4px 0;color:#5b6270;vertical-align:top">${escapeHtml(label)}</td><td style="padding:4px 0;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  return `<table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">${body}</table>`;
}

export function detailsText(rows: Array<[string, string]>): string {
  return rows.map(([label, value]) => `${label}: ${value}`).join("\n");
}
