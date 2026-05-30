# Staging Go-Live Rehearsal

Click-by-click QA checklist for the first Support Block paying client. Run this on **staging** (or local with Stripe test mode) before taking a real customer live.

**Pass criteria:** One company goes from public intake → paid subscription → first portal work submission → first admin time log, with **zero manual DB edits**.

---

## 0. Preflight (5 min)

| Step | Action | Expected |
|------|--------|----------|
| 0.1 | Open `GET /api/health` | `{ ok: true, checks.db.ok: true }` |
| 0.2 | Confirm env vars: `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `NEXT_PUBLIC_APP_URL`, Stripe test keys + 3 price IDs, `STRIPE_WEBHOOK_SECRET`, Resend keys | Build/deploy succeeds |
| 0.2b | After deploy: confirm migration `20260531023000_add_fixed_fee_payment_fields` applied (`prisma migrate deploy` at build) | Fixed-fee payment fields exist on `SupportRequest` |
| 0.3 | Stripe CLI or dashboard webhook pointed at `{APP_URL}/api/stripe/webhook` | Webhook receives events |
| 0.4 | Admin signed in at `/login` | Admin dashboard loads |
| 0.5 | Admin → `/admin/services` → **Seed Default Services** (if catalog empty) | Portal work types available |

**Stripe test card:** `4242 4242 4242 4242`, any future expiry, any CVC.

---

## 1. Public discovery intake

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | Visit `/request-help` (logged out) | Form loads |
| 1.2 | Submit as a new company (unique email) | Success screen; internal alert email (if Resend configured) |
| 1.3 | Admin → `/admin/clients` → **Onboarding** tab | New LEAD appears |
| 1.4 | Open prospect → `/admin/clients/{id}` | **Prospect onboarding** view (not full client billing/work) |

---

## 2. Discovery → approve as client

| Step | Action | Expected |
|------|--------|----------|
| 2.1 | On prospect page: record fit decision (**Good fit**) | Saved |
| 2.2 | **Engagement & approved work**: enable **Support Block** only; select approved work tasks; Save | Scope saved |
| 2.3 | Set plan (Light / Core / Priority) and weekly hours if prompted in client setup | Matches intended block size |
| 2.4 | Click **Approve as Client** | `Client.status` → ACTIVE |
| 2.5 | Confirm page switches to **Active client** view with setup checklist | Next steps visible (scope, agreement, billing, invite) |

---

## 3. Agreement + billing setup (admin)

| Step | Action | Expected |
|------|--------|----------|
| 3.1 | **Agreement**: Mark **Sent** or **Waived** (or **Signed** if already done offline) | Agreement step shows satisfied in setup guide |
| 3.2 | **Billing**: Ensure billing mode is **Stripe** (not Manual/Comped unless testing override path) | Billing card shows Stripe authoritative |
| 3.3 | Do **not** use admin checkout for the happy path — client will self-serve pay | — |

---

## 4. Portal invite + client login

| Step | Action | Expected |
|------|--------|----------|
| 4.1 | **Portal access**: Send portal invite to client owner email | Invite email received (Resend) |
| 4.2 | Client opens invite link, sets password, signs in | Lands on `/portal` |
| 4.3 | Portal home shows **onboarding / setup guide** (not full dashboard with stats) | Steps: portal → agreement status → payment → support areas |
| 4.4 | Agreement step is **informational only** (no client sign button) | Copy reflects admin-marked status |

---

## 5. Client self-serve subscription (critical path)

| Step | Action | Expected |
|------|--------|----------|
| 5.1 | Client → **Account** → `#support-setup` (or setup guide payment step) | Support setup card visible |
| 5.2 | Click **Start subscription** | Redirect to Stripe Checkout (subscription mode) |
| 5.3 | Complete payment with test card | Redirect to `/portal/account?checkout=success` |
| 5.4 | Webhook fires `checkout.session.completed` | Client record: `subscriptionStatus` = `active`, `stripeSubscriptionId` set |
| 5.5 | Refresh portal home | Setup completes; **Send work** becomes available (if agreement + scope already OK) |
| 5.6 | Optional: **Manage retainer billing** appears after customer exists | Stripe billing portal opens |

**If payment blocker persists:** Check webhook logs, `billingMode === STRIPE`, and `metadata.clientId` on checkout session.

---

## 6. Client sends first Support Block work

| Step | Action | Expected |
|------|--------|----------|
| 6.1 | Portal → **Send work** (`/portal/requests/new`) | Form loads with approved work types only |
| 6.2 | Submit a work request | Success; appears under **My work** |
| 6.3 | Admin → `/admin/requests` | New CLIENT_OPS request visible |

---

## 7. Admin logs time (work gate)

| Step | Action | Expected |
|------|--------|----------|
| 7.1 | Admin → open request detail | Request page loads |
| 7.2 | **Log time** or start **timer** on the request | Time entry created (not blocked) |
| 7.3 | Repeat with a **second LEAD/unpaid** test client (optional negative test) | Timer/time **blocked** with payment/scope message |

---

## 8. Negative checks (quick)

Run after happy path passes.

| Scenario | How | Expected |
|----------|-----|----------|
| Unpaid Support Block | ACTIVE client, agreement OK, scope OK, no subscription | Portal: **Start subscription**; submit work blocked |
| Agreement pending | Agreement = SENT, not SIGNED/WAIVED | Portal shows waiting copy; work blocked |
| No scope | Support Block with zero approved tasks | Scope blocker; invite may be blocked |
| Hybrid unpaid block | Both lanes active; block unpaid; fixed-fee lane open | Fixed-fee catalog may submit; **block-scoped task** still blocked until subscription active |

---

## 9. Fixed-Fee path (only if testing Phase 6)

| Step | Action | Expected |
|------|--------|----------|
| 9.1 | Client with **Request-Based / Fixed-Fee** lane only (or hybrid) | — |
| 9.2 | Admin prices request: handoff + FLAT fee | `paymentStatus` → PENDING |
| 9.3 | Admin → **Create payment link** on request | Stripe one-time checkout |
| 9.4 | Client pays | Webhook marks request `paymentStatus` = PAID |
| 9.5 | Move request to **In progress** / log billable time | Allowed only after PAID or WAIVED |

---

## 10. Sign-off

- [ ] Preflight health + catalog seeded
- [ ] Intake → LEAD → ACTIVE without DB edits
- [ ] Portal invite → client login → onboarding gate (not full dashboard early)
- [ ] Client **Start subscription** → webhook → active subscription
- [ ] Portal work submit succeeds
- [ ] Admin time/timer succeeds on paid client
- [ ] Negative: unpaid client cannot log included billable work
- [ ] (Optional) Fixed-fee payment link + gate

**Tester / date / environment:**

**Notes / failures:**
