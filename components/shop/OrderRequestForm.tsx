"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle, CircleNotch, Warning } from "@phosphor-icons/react";
import { Button, SubmitButton } from "@/components/ui/Button";
import { useBasket, type BasketLine } from "@/lib/basket";

type Status = "idle" | "sending" | "error";
type Problem = "fields" | "consent" | "server";

/**
 * What /api/shop/checkout receives. Only what is ordered and by whom: the
 * server prices every line from the catalogue itself.
 */
export type OrderRequest = {
  attemptKey: string;
  consent: true;
  name: string;
  email: string;
  phone: string;
  organisation: string;
  address: string;
  eircode: string;
  notes: string;
  lines: Array<{ slug: string; option?: string; quantity: number }>;
};

type OrderResponse = { url?: string; requested?: boolean; reference?: string; error?: string };

const SEND_FAILED = "We couldn't send your order. Please try again or email info@pulse8.ie.";

const field =
  "h-11 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3.5 text-[0.9375rem] text-ink placeholder:text-ink-faint focus-visible:border-ink-faint";

const label = "mb-2 block text-[0.875rem] font-medium text-ink";

const optional = <span className="font-normal text-ink-muted">(optional)</span>;

function buildOrderRequest(form: HTMLFormElement, lines: BasketLine[], attemptKey: string): OrderRequest {
  const data = new FormData(form);
  const text = (key: string) => {
    const value = data.get(key);
    return typeof value === "string" ? value.trim() : "";
  };

  return {
    attemptKey,
    consent: true,
    name: text("name"),
    email: text("email"),
    phone: text("phone"),
    organisation: text("organisation"),
    address: text("address"),
    eircode: text("eircode").toUpperCase(),
    notes: text("notes"),
    lines: lines.map((line) => ({
      slug: line.slug,
      ...(line.option ? { option: line.option } : {}),
      quantity: line.quantity,
    })),
  };
}

async function sendOrder(request: OrderRequest): Promise<OrderResponse> {
  try {
    const response = await fetch("/api/shop/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    const body = (await response.json().catch(() => ({}))) as OrderResponse;
    if (!response.ok) return { error: body.error ?? SEND_FAILED };
    return body;
  } catch {
    return { error: "We couldn't reach the shop. Check your connection and try again." };
  }
}

/**
 * Order form for the basket page.
 *
 * Same fields, states and validation pattern as the quote form, set for a
 * light surface. With payments on (`payments`), sending takes the customer to
 * Stripe Checkout and the basket clears on the way back. With payments off,
 * the order goes to Pulse 8 as a request, who confirm stock, delivery and
 * payment by email; the basket clears and the page swaps to the confirmation
 * through `onSent`. Either way the server prices the order itself.
 */
export function OrderRequestForm({
  lines,
  payments,
  onSent,
}: {
  lines: BasketLine[];
  payments: boolean;
  onSent: (reference: string) => void;
}) {
  const { clear } = useBasket();
  const [status, setStatus] = useState<Status>("idle");
  const [problem, setProblem] = useState<Problem>("fields");
  const [serverError, setServerError] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [consent, setConsent] = useState(false);
  // One key per basket: a double submit reuses the same order, a changed basket starts a new one.
  const basketKey = lines.map((line) => `${line.key}x${line.quantity}`).join(",");
  const attemptKey = useMemo(() => {
    void basketKey;
    return crypto.randomUUID();
  }, [basketKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setAttempted(true);

    if (!form.checkValidity()) {
      setProblem("fields");
      setStatus("error");
      form.querySelector<HTMLElement>(":invalid")?.focus();
      return;
    }

    if (!consent) {
      setProblem("consent");
      setStatus("error");
      return;
    }

    setStatus("sending");
    const result = await sendOrder(buildOrderRequest(form, lines, attemptKey));
    if (result.url) {
      // Stays "sending" while the browser leaves for Stripe.
      window.location.assign(result.url);
      return;
    }
    if (result.requested && result.reference) {
      onSent(result.reference);
      clear();
      return;
    }
    setServerError(result.error ?? SEND_FAILED);
    setProblem("server");
    setStatus("error");
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      data-attempted={attempted ? "" : undefined}
      className="@container [&[data-attempted]_:invalid]:border-accent"
    >
      <div className="grid gap-5 @md:grid-cols-2">
        <div>
          <label className={label} htmlFor="order-name">
            Name
          </label>
          <input id="order-name" name="name" required autoComplete="name" className={field} />
        </div>

        <div>
          <label className={label} htmlFor="order-email">
            Email
          </label>
          <input
            id="order-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={field}
          />
        </div>

        <div>
          <label className={label} htmlFor="order-phone">
            Phone
          </label>
          <input
            id="order-phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            className={field}
          />
        </div>

        <div>
          <label className={label} htmlFor="order-organisation">
            Organisation {optional}
          </label>
          <input
            id="order-organisation"
            name="organisation"
            autoComplete="organization"
            className={field}
          />
        </div>

        <div className="@md:col-span-2">
          <label className={label} htmlFor="order-address">
            Delivery address
          </label>
          <textarea
            id="order-address"
            name="address"
            rows={3}
            required
            autoComplete="street-address"
            className={`${field} h-auto py-3`}
          />
        </div>

        <div>
          <label className={label} htmlFor="order-eircode">
            Eircode
          </label>
          <input
            id="order-eircode"
            name="eircode"
            required
            maxLength={8}
            autoComplete="postal-code"
            className={`${field} uppercase`}
          />
        </div>

        <div className="@md:col-span-2">
          <label className={label} htmlFor="order-notes">
            Notes {optional}
          </label>
          <textarea
            id="order-notes"
            name="notes"
            rows={3}
            placeholder="Delivery times, a PO number, anything we should know"
            className={`${field} h-auto py-3`}
          />
        </div>

        <div className="@md:col-span-2">
          <label className="flex items-start gap-3 text-[0.875rem] text-ink-muted">
            <input
              type="checkbox"
              name="consent"
              checked={consent}
              onChange={(event) => {
                setConsent(event.target.checked);
                if (status === "error" && problem === "consent") setStatus("idle");
              }}
              className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
            />
            <span>
              I agree to the{" "}
              <Link
                href="/policies/privacy"
                className="text-ink underline underline-offset-4 hover:text-accent"
              >
                privacy policy
              </Link>
              .
            </span>
          </label>
        </div>

        <div className="@md:col-span-2">
          <SubmitButton
            type="submit"
            size="lg"
            disabled={status === "sending"}
            className="w-full disabled:cursor-wait"
          >
            {status === "sending" ? (
              <>
                <CircleNotch size={17} weight="bold" className="animate-spin" />
                {payments ? "Going to payment" : "Sending"}
              </>
            ) : payments ? (
              "Continue to payment"
            ) : (
              "Send order request"
            )}
          </SubmitButton>

          <p role="status" aria-live="polite" className="mt-3 text-[0.875rem] text-ink">
            {status === "error" ? (
              <span className="flex items-start gap-2">
                <Warning size={16} weight="fill" className="mt-0.5 shrink-0 text-accent" />
                {problem === "consent"
                  ? "Tick the privacy policy box before sending."
                  : problem === "server"
                    ? serverError
                    : "Fill in your name, email, phone, delivery address and Eircode."}
              </span>
            ) : null}
          </p>
        </div>
      </div>
    </form>
  );
}

/**
 * Shown in place of the basket once a request has gone. Focus moves to the
 * heading so keyboard and screen reader users land on the confirmation.
 */
export function OrderReceived({ reference }: { reference: string }) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-7 sm:p-10">
      <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent">
        <CheckCircle size={26} weight="fill" />
      </span>
      <h2
        ref={heading}
        tabIndex={-1}
        className="mt-5 text-2xl font-semibold focus:outline-none"
      >
        Order request received
      </h2>
      <p className="mt-3 max-w-[46ch] text-ink-muted">
        We will email you to confirm stock, delivery and payment. Your reference is{" "}
        <span className="figure font-medium text-ink">{reference}</span>.
      </p>
      <div className="mt-7">
        <Button href="/shop" variant="secondary">
          Back to the shop
        </Button>
      </div>
    </div>
  );
}
