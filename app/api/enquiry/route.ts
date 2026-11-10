import { NextResponse } from "next/server";
import { readContent } from "@/lib/content.server";
import { isPublished } from "@/lib/data";
import { detailsHtml, detailsText, sendMail } from "@/lib/mail/send.server";
import {
  clientKey,
  emailAddress,
  multiLine,
  phoneNumber,
  rateLimited,
  singleLine,
  sourcePath,
} from "@/lib/validate.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Every enquiry goes here. Set on the server; nothing in the form can change it. */
const ENQUIRY_TO = ["info@pulse8.ie"];

const BOOKING_TYPES = new Set(["Group", "Individual"]);

type Field = "name" | "email" | "phone" | "county" | "company" | "course" | "message" | "bookingType";

function fail(status: number, error: string, fields?: Field[]) {
  return NextResponse.json({ ok: false, error, fields }, { status });
}

/**
 * Enquiry form handler, shared by the home page and /contact.
 *
 * Sends one email to info@pulse8.ie with Reply-To set to the customer's own,
 * validated address, so pressing Reply in the inbox writes straight back to
 * them. Reports success only once the provider has accepted the message.
 */
export async function POST(request: Request) {
  if (rateLimited(`enquiry:${clientKey(request)}`, 5, 10 * 60_000)) {
    return fail(429, "Too many enquiries from this connection. Please wait a few minutes or email info@pulse8.ie.");
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return fail(400, "The form could not be read.");
  }

  // Honeypot: a field people never see. Anything in it is a bot; drop it
  // quietly so the bot learns nothing.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = singleLine(body.name, 120);
  const email = emailAddress(body.email);
  const phone = phoneNumber(body.phone);
  const county = singleLine(body.county, 60);
  const company = singleLine(body.company ?? "", 160);
  const message = multiLine(body.message ?? "", 4000);
  const bookingType = singleLine(body.bookingType ?? "Group", 20);
  const courseSlug = singleLine(body.course ?? "", 120);

  const invalid: Field[] = [];
  if (!name) invalid.push("name");
  if (!email) invalid.push("email");
  if (!phone) invalid.push("phone");
  if (!county) invalid.push("county");
  if (company === null) invalid.push("company");
  if (message === null) invalid.push("message");
  if (!bookingType || !BOOKING_TYPES.has(bookingType)) invalid.push("bookingType");
  if (courseSlug === null) invalid.push("course");
  if (body.consent !== true) {
    return fail(400, "Tick the privacy policy box before sending.");
  }

  // Only a published catalogue course can be named; its title comes from the catalogue.
  let courseTitle = "Not sure yet";
  if (courseSlug) {
    const { courses } = await readContent();
    const course = courses.find((item) => item.slug === courseSlug && isPublished(item));
    if (!course) invalid.push("course");
    else courseTitle = course.title;
  }

  if (invalid.length || !name || !email || !phone || !county) {
    return fail(400, "Some details need another look.", invalid);
  }

  const rows: Array<[string, string]> = [
    ["Name", name],
    ["Email", email],
    ["Phone", phone],
    ["Organisation", company || "Not given"],
    ["Group or individual", bookingType ?? "Group"],
    ["County", county],
    ["Course", courseTitle],
    ["Message", message || "None"],
    ["Sent from", sourcePath(body.source)],
  ];

  const subject = courseSlug ? `New website enquiry | ${courseTitle}` : "New website enquiry";

  const result = await sendMail({
    to: ENQUIRY_TO,
    replyTo: email,
    subject,
    text: `New enquiry from the Pulse 8 website. Reply to this email to answer ${name} directly.\n\n${detailsText(rows)}\n`,
    html: `<p style="font-family:Arial,sans-serif;font-size:14px">New enquiry from the Pulse 8 website. Reply to this email to answer the customer directly.</p>${detailsHtml(rows)}`,
  });

  if (!result.ok) {
    console.error("[enquiry] send failed:", result.error);
    return fail(502, "We couldn\u2019t send your enquiry. Please try again or email info@pulse8.ie.");
  }

  return NextResponse.json({ ok: true });
}
