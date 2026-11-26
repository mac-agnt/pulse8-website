# Demo for Tom: a blended course from Blended Learning to a paid booking

The demo runs on https://www.pulse8.ie. While Stripe is in **Test mode** no real
money moves; once live payments are on, use a real card and refund it after.

## Before the meeting (5 minutes)

- Rehearse it once, start to finish, with a different test email.
- Have a fresh customer email for the demo, e.g. a Gmail alias
  `yourname+tomdemo1@gmail.com`. Don't use a staff address: Blended
  Learning's Learners list hides staff, so the last step wouldn't show.
- Open two windows:
  - **Window A (Tom, staff):** your normal browser, signed in to Blended
    Learning admin (https://blendedlearning-ebon.vercel.app/admin) and to the
    Stripe dashboard (Test mode switch on, top right).
  - **Window B (the customer):** a private / incognito window. Nobody signed
    in.
- Open the customer's inbox in a third tab, ready to refresh.

## The demo, click by click

### 1. Tom sets up a date (Window A, Blended Learning admin)

1. **Courses** → open **First Aid Response (Blended)** (the PHECC FAR course).
2. **Details** tab → **Price (€)**: type the price, e.g. `350` →
   **Save changes**.
3. **Practical days** tab (or **Sessions** in the side menu) → add a session:
   **Date**, **Starts** / **Ends**, **Location** and **Address**,
   **Capacity** (places, e.g. `8`) → save.
4. Check the course is **Published** (its status at the top of the course).

Say to Tom: "That's all you do. The website picks it up by itself."

### 2. It appears on the website (Window B)

1. Go to https://www.pulse8.ie/book (or **Courses** →
   **Blended learning**).
2. The new date shows under First Aid Response (Blended), with the places
   left. If it isn't there yet, refresh once: Blended Learning tells the
   website about changes straight away, but the page can take a few seconds.

### 3. The customer books and pays (Window B)

1. Click **Book a place** on that date.
2. Number of places: `1`. Enter the attendee's first name, last name and the
   demo email.
3. Continue to payment. Stripe's checkout page opens (it says **Test mode**).
4. Test mode: card `4242 4242 4242 4242`, any future expiry (e.g. `12/30`),
   any CVC (`123`) → **Pay**. Live mode: a real card, refunded afterwards.
5. You land back on the website's "booking confirmed" page (`/book/return`).

### 4. The emails (customer inbox, and info@pulse8.ie)

- Customer: the booking confirmation from **Pulse 8 <bookings@pulse8.ie>**.
- Staff (info@pulse8.ie): "new paid booking" with the attendee and date.
- Customer: Stripe's own receipt (Test mode receipts only go out if
  receipts are on; it may not arrive in Test mode, that's normal).

### 5. Blended Learning takes over (customer inbox, then Window B)

1. The customer gets Blended Learning's sign-in email.
2. Click its link in Window B → they're signed in and see **First Aid
   Response (Blended)** on their dashboard, with the practical day booked.

### 6. Tom sees the learner (Window A)

1. Blended Learning admin → **Learners**: the new learner is there.
2. **Sessions** → the date: one seat taken, places left down by one.
3. Stripe → **Payments**: the test payment for the course price.

## Optional: a refund

Stripe → **Payments** → the payment → **Refund** → full amount → **Refund**.
Within a minute the website marks the booking refunded, the place is free
again on `/book`, and Blended Learning is told.

## If something doesn't show

| What | Most likely reason |
| --- | --- |
| The date isn't on the website | Course not published, no price (it then says "Enquire"), or the date is in the past. |
| "Enquire" instead of "Book a place" | No price set in Blended Learning, or payments not switched on in Vercel. |
| No emails | Resend's pulse8.ie domain not yet "Verified" (Blacknight records). |
| No Blended Learning sign-in email | Check the Learners list; the booking may still be retried by the daily job. |
