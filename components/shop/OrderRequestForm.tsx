"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle, CircleNotch, Warning } from "@phosphor-icons/react";
import { Button, SubmitButton } from "@/components/ui/Button";
import { useBasket, type BasketLine } from "@/lib/basket";

type Status = "idle" | "sending" | "error";
type Problem = "fields" | "consent";

/** What the order endpoint will receive once it exists. */
export type OrderRequest = {
  customer: {
    name: string;
    email: string;
    phone: string;
    organisation: string;
    address: string;
    eircode: string;
    notes: string;
  };
  lines: Array<{
    slug: string;
    name: string;
    option?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  /** euro */
  subtotal: number;
};

const field =
  "h-11 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3.5 text-[0.9375rem] text-ink placeholder:text-ink-faint focus-visible:border-ink-faint";

const label = "mb-2 block text-[0.875rem] font-medium text-ink";

const optional = <span className="font-normal text-ink-muted">(optional)</span>;

function buildOrderRequest(
  form: HTMLFormElement,
  lines: BasketLine[],
  subtotal: number,
): OrderRequest {
  const data = new FormData(form);
  const text = (key: string) => {
    const value = data.get(key);
    return typeof value === "string" ? value.trim() : "";
  };

  return {
    customer: {
      name: text("name"),
      email: text("email"),
      phone: text("phone"),
      organisation: text("organisation"),
      address: text("address"),
      eircode: text("eircode").toUpperCase(),
      notes: text("notes"),
    },
    lines: lines.map((line) => ({
      slug: line.slug,
      name: line.product.name,
      option: line.option,
      quantity: line.quantity,
      unitPrice: line.product.price,
      lineTotal: line.lineTotal,
    })),
    subtotal,
  };
}

/**
 * Stand-in for the network. There is no backend on this build: this holds the
 * sending state for a moment and then succeeds, so every state can be seen.
 * Before launch, replace it with a POST of `request` to the order endpoint
 * (a route handler or the Pulse 8 form endpoint) and report failures.
 */
function sendOrderRequest(request: OrderRequest): Promise<OrderRequest> {
  return new Promise((resolve) => setTimeout(() => resolve(request), 700));
}

/**
 * Order request form for the basket page.
 *
 * Same fields, states and validation pattern as the quote form, set for a
 * light surface. Payment is not taken here: the request goes to Pulse 8, who
 * confirm stock, delivery and payment by email. On success the basket clears
 * and the page swaps to the confirmation through `onSent`.
 */
export function OrderRequestForm({
  lines,
  subtotal,
  onSent,
}: {
  lines: BasketLine[];
  subtotal: number;
  onSent: () => void;
}) {
  const { clear } = useBasket();
  const [status, setStatus] = useState<Status>("idle");
  const [problem, setProblem] = useState<Problem>("fields");
  const [attempted, setAttempted] = useState(false);
  const [consent, setConsent] = useState(false);

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
    await sendOrderRequest(buildOrderRequest(form, lines, subtotal));
    onSent();
    clear();
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
                Sending
              </>
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
export function OrderReceived() {
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
        We will email you to confirm stock, delivery and payment.
      </p>
      <div className="mt-7">
        <Button href="/shop" variant="secondary">
          Back to the shop
        </Button>
      </div>
    </div>
  );
}
