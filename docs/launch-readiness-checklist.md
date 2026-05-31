# Launch Readiness Checklist

**Purpose:** Senior-dev audit of what must be built, verified, hardened, and operated before a safe production launch of Hargen Energy (marketing site + admin + client portal).

**Audit date:** 2026-05-25  
**Codebase snapshot:** Next.js 16, NextAuth v5 beta, Prisma 7, PostgreSQL, Vercel Blob, Stripe, Resend, optional Upstash Redis.

**Related docs:**
- [DEPLOYMENT.md](../DEPLOYMENT.md) — env vars, deploy steps, manual verification scripts
- [product-system-ux-roadmap.md](./product-system-ux-roadmap.md) — product/UX gaps (mostly post-launch)

---

## How to use this doc

| Tag | Meaning |
|-----|---------|
| 🔴 **LAUNCH BLOCKER** | Must be done or explicitly accepted before taking paying customers |
| 🟠 **HIGH BREAK RISK** | Works today but fragile; likely to fail silently or corrupt data under real load |
| 🔴 **HIGH SECURITY RISK** | Exploit, leak, or bypass that could harm customers or the business |
| 🟡 **HIGH MAINTENANCE** | Ongoing manual ops, upgrade debt, or complexity tax |
| ✅ **DONE** | Implemented and reasonably verified in code |
| ⬜ **TODO** | Not done or not production-verified |

Check boxes as you complete verification. Items tagged 🔴/🟠/🟡 deserve explicit owner + target date.

---

## 1. Executive summary

### Current posture

| Area | Status | Notes |
|------|--------|-------|
| Auth (credentials, bcrypt, session) | ✅ Mostly solid | Timing-safe login, password reset, session invalidation on password change |
| Tenant isolation (portal) | ✅ Strong | Request/detail queries filter by `clientId`; attachments gated by pathname + session |
| Admin RBAC | ✅ Consistent | Server actions use `requireAdmin()` / role checks |
| Email (Resend) | ⬜ Config-dependent | Fails closed in prod if domain not verified |
| File uploads (Vercel Blob) | ✅ Implemented | Two-step authorize + upload; private read via `/api/files/read` |
| Stripe billing | ⬜ Config + test needed | Webhook handler exists; live mode not verified here |
| Rate limiting | 🟠 **Conditional** | **Inactive without Upstash Redis in production** |
| Automated tests / CI | 🔴 **Missing** | One manual script only; no CI pipeline |
| Service catalog | ⬜ Manual seed | Empty DB → portal cannot submit until admin seeds catalog |
| Observability | 🔴 **Missing** | No Sentry, health checks, or structured alerting |

### Minimum viable launch (commercial)

1. Production PostgreSQL + all required env vars (see §3)
2. **Upstash Redis** for rate limits + password-session stamps
3. First admin via `/setup/admin`, then remove `ADMIN_SETUP_TOKEN`
4. Resend domain verified; Stripe live products + webhook
5. Vercel Blob linked; cross-tenant file read test
6. Seed service catalog (`seedInitialServices` in admin)
7. Run full manual QA matrix (§10)
8. Accept or fix 🔴 **HIGH SECURITY RISK** items in §5

### Soft launch (marketing + intake only, no portal clients)

Possible with: DB, Resend, honeypot intake, admin for discovery queue. Stripe/portal/blob can wait if no client invites yet.

---

## 2. Pre-launch blockers (🔴)

### 2.1 Infrastructure & environment

- [ ] ⬜ Production PostgreSQL provisioned with backups enabled (provider-level; not documented in repo)
- [ ] ⬜ `DATABASE_URL` set for **build and runtime** (migrations run at build: `prisma migrate deploy`)
- [ ] ⬜ `AUTH_SECRET` set (`npx auth secret`) — app throws in prod if missing (`src/auth.ts`)
- [ ] ⬜ `APP_URL` and `NEXT_PUBLIC_APP_URL` match production domain (email links, Stripe redirects)
- [ ] ⬜ `ADMIN_SETUP_TOKEN` set for first deploy only; removed after first admin created
- [ ] ⬜ Resend: `RESEND_API_KEY`, verified `RESEND_FROM_EMAIL`, `SUPPORT_NOTIFICATION_EMAIL`
- [ ] ⬜ Stripe live: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, optional `STRIPE_SUPPORT_PRODUCT_ID`
- [ ] ⬜ Vercel Blob: store linked; `BLOB_READ_WRITE_TOKEN` locally for dev
- [ ] 🔴 ⬜ **Upstash Redis:** `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (see §5.1)

### 2.2 First-run bootstrap (empty database)

- [ ] ⬜ Deploy succeeds (migrations apply)
- [ ] ⬜ Visit `/setup/admin` → create first admin → sign in at `/login`
- [ ] ⬜ Confirm `/setup/admin` refuses second setup
- [ ] ⬜ Admin → **Service Management** → run **Seed catalog v2** (`seedInitialServices`) — **empty catalog blocks portal work types**
- [ ] ⬜ Create at least one active client, configure engagement + approved work tasks, send portal invite
- [ ] ⬜ Stripe webhook endpoint registered with events listed in `DEPLOYMENT.md`

### 2.3 Legal / trust (operational, not in code)

- [ ] ⬜ Privacy policy + terms linked from marketing site (not present in repo audit)
- [ ] ⬜ Cookie/consent if analytics added later
- [ ] ⬜ Data processing posture for client vault links / credentials stored in app

---

## 3. Environment variable matrix

| Variable | Required | Launch impact if missing |
|----------|----------|---------------------------|
| `DATABASE_URL` | Yes | Build/runtime failure |
| `AUTH_SECRET` | Yes | Prod boot failure |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | Yes | Broken email/Stripe links |
| `ADMIN_SETUP_TOKEN` | First deploy | Cannot bootstrap admin |
| `RESEND_*` | Yes (email) | Intake/invites/alerts silent |
| `STRIPE_*` | Yes (paid clients) | No subscriptions |
| `BLOB_READ_WRITE_TOKEN` | Yes (attachments) | Upload 503 |
| `UPSTASH_REDIS_*` | **Strongly yes** | Rate limits off; password revoke broken multi-instance |
| `RATE_LIMIT_ALLOW_MEMORY=1` | No | Single-node only; not for Vercel scale |
| Outreach API keys | No | Admin outreach tools degraded |

Full list: [.env.example](../.env.example)

---

## 4. Security checklist

### 4.1 Verified strengths ✅

- [x] ✅ Admin routes gated in middleware + layout (`src/middleware.ts`, `src/app/admin/layout.tsx`)
- [x] ✅ Portal routes require auth; admins redirected away from portal layout
- [x] ✅ Login uses dummy bcrypt compare for unknown emails (timing skew mitigation)
- [x] ✅ Generic login/forgot-password messages (no account enumeration)
- [x] ✅ Password reset: hashed tokens, 30-min TTL, single-use
- [x] ✅ Password change invalidates older JWTs via `passwordChangedAt` stamp
- [x] ✅ Admin setup: constant-time token compare, rate limited, closes after first admin
- [x] ✅ Public intake honeypot + rate limit bucket `public-intake`
- [x] ✅ Portal request submit validates attachment URLs against tenant pathname (`src/lib/validations.ts`, `blob-ref.ts`)
- [x] ✅ `/api/files/read` requires session + tenant pathname check
- [x] ✅ Upload authorize validates pathname prefix per session (`upload-auth.ts`)
- [x] ✅ Internal comments filtered in portal (`isInternal: false`)
- [x] ✅ `internalNotes` admin-only in UI (not selected in portal queries)
- [x] ✅ Basic security headers in `next.config.ts` (nosniff, referrer-policy, X-Frame-Options)
- [x] ✅ `robots.txt` disallows `/admin/`, `/portal/`, `/api/`, `/setup/`

### 4.2 🔴 HIGH SECURITY RISK — fix or accept before launch

| # | Issue | Why it matters | Location | Remediation |
|---|--------|----------------|----------|-------------|
| S1 | **Rate limiting disabled without Upstash** | Login, intake, password reset, setup brute-forceable at scale | `src/lib/rate-limit.ts` L157–165 | Provision Upstash; verify limits in prod |
| S2 | **Password session stamp not distributed without Redis** | Password change may not log out other sessions on multi-instance | `src/lib/password-session-stamp.ts` | Same Upstash as S1 |
| S3 | **Server actions without session binding on `clientId`** | `getPortalSubmitOptions(clientId)` and `getClientPortalSupportSetup(clientId)` do not verify caller owns `clientId` — leaks Stripe IDs, billing override metadata to any authenticated user who passes another ID | `src/app/actions/portal.ts` L37–48, `src/lib/portal-support.ts` | Add `auth()` + `session.user.clientId === clientId` (or admin) |
| S4 | **Credentials in DB plaintext** | `vaultLink`, `adminSecureNote`, client-submitted vault links stored unencrypted | `ClientSystemAccess` model, `system-access.ts` | Encrypt at rest (KMS/app-level) or external vault only; field-level encryption minimum |
| S5 | **No MFA / no SSO** | Single factor for admin + client accounts | Auth stack | Accept risk for v1 or add TOTP for admins |
| S6 | **Upload MIME trust client `Content-Type` only** | Malicious file could declare `image/jpeg` while serving executable content | `validation.ts`, upload routes | Add server-side magic-byte sniff or post-upload scan |
| S7 | **Public intake upserts `Client` by email** | Repeat submission overwrites contact fields for existing clients (including ACTIVE) | `src/app/actions/requests.ts` L81–105 | On upsert, restrict updates by `status` or merge non-destructively |
| S8 | **Stripe webhook missing `dynamic = "force-dynamic"`** | Next.js may cache/stale webhook route in some deployments | `src/app/api/stripe/webhook/route.ts` | Add `export const dynamic = "force-dynamic"` |
| S9 | **No Content-Security-Policy** | XSS impact amplified if any injection found | `next.config.ts` | Add CSP (start report-only) |
| S10 | **Server-side fetch to arbitrary URLs (logo pull, outreach enrich)** | SSRF / internal network probe if admin triggers on malicious URL | `src/lib/client-branding.ts`, `outreach.ts` | Block private IP ranges; allowlist schemes; optional disable in prod |
| S11 | **No audit log for admin actions** | Cannot investigate tampering (status changes, billing overrides, time entries) | App-wide | Append-only audit table or external log sink |
| S12 | **Single-admin bootstrap only** | No UI to add second admin; recovery = DB access | `admin-setup.ts` | Document break-glass; add admin invite flow |
| S13 | **`prisma:seed` can upsert admin with env password** | Dangerous if run against prod with `ADMIN_PASSWORD` set | `prisma/seed.ts` | Never set seed vars in prod; document |

### 4.3 Security verification matrix (manual)

Run after deploy — also in `DEPLOYMENT.md` §6–8:

- [ ] ⬜ Logged out → `/admin` redirects to login
- [ ] ⬜ Client A cannot open Client B request by URL ID (404)
- [ ] ⬜ Client A cannot read Client B blob via `/api/files/read?url=...` (403)
- [ ] ⬜ Internal notes/comments not visible in portal
- [ ] ⬜ `/setup/admin` blocked after first admin
- [ ] ⬜ Password reset link single-use
- [ ] ⬜ Rate limit triggers on repeated login (with Upstash configured)
- [ ] ⬜ Stripe webhook rejects bad signature
- [ ] ⬜ Upload rejects pathname outside tenant prefix

---

## 5. 🟠 HIGH BREAK RISK — fragile under real use

| # | Issue | Symptom | Location | Fix |
|---|--------|---------|----------|-----|
| B1 | **Responsive regressions can slip without viewport checks** | Mobile/tablet UI issues can ship unnoticed | Repo-wide | CI now runs lint, unit tests, build, and Playwright responsive smoke (`mobile`/`tablet`/`desktop`) with `scripts/seed-e2e.ts` |
| B2 | **Service catalog empty on fresh DB** | Portal "Submit Request" has no work types | `seedInitialServices` in `services.ts` | Run seed post-deploy; or migration seed |
| B3 | **Email send failures often non-blocking** | Request created but no admin alert | `requests.ts`, `portal.ts` catch blocks | Queue/retry; surface admin banner if Resend down |
| B4 | **Recurring tasks not scheduled** | Recurring work never auto-creates | `processRecurringTasks` requires manual admin call | Vercel Cron + secret-protected route |
| B5 | **Billing override expiry is read-time only** | Demo/manual billing stays visually "expired" but no auto job | `client-billing-readiness.ts` | Cron to notify admin; optional auto-pause portal submit |
| B6 | **Orphan Blob objects in `pending/`** | Storage cost; abandoned uploads never linked to requests | Upload flow §DEPLOYMENT.md | Lifecycle cleanup job (list unreferenced paths) |
| B7 | **Stripe subscription deleted → `weeklyHours: 0`** | Client appears to have zero capacity silently | `webhook/route.ts` L87–96 | Align with business rule; notify admin |
| B8 | **NextAuth v5 beta + Next 16** | Upgrade may break auth callbacks | `package.json` | Pin versions; test auth on every dep bump |
| B9 | **`getAppBaseUrl()` fixed at module load** | Wrong URLs if env changes without restart | `src/lib/app-url.ts` | Read env inside functions (minor on Vercel) |
| B10 | **Timer start/stop not transactional** | Double-click could duplicate time entries | `timer.ts` | Idempotency or DB lock on `timerStartedAt` |
| B11 | **No health/readiness endpoint** | Deploy "green" while DB/Redis/email broken | — | Add `/api/health` checking DB + Redis |
| B12 | **Firebase → Vercel Blob migration in flight** | Old attachment URLs in DB may 404 if any prod data used Firebase | Git status | Migration script for existing `fileUrl` values if applicable |

---

## 6. 🟡 HIGH MAINTENANCE — ongoing cost

| # | Area | Why it's expensive | Mitigation |
|---|------|-------------------|------------|
| M1 | **Next.js 16 + NextAuth 5 beta + Prisma 7** | Bleeding-edge stack; sparse community fixes | Pin versions; dedicated upgrade windows |
| M2 | **Dual engagement models** | SUPPORT_BLOCK vs REQUEST_BASED diverge in billing, catalog, timer, portal gating | Keep domain docs; avoid cross-contamination in new features |
| M3 | **BillingMode matrix** | STRIPE / MANUAL / COMPED / DEMO + overrides + Stripe drift | Admin training doc; billing dashboard review weekly |
| M4 | **Vercel Blob pending paths** | Objects not moved post-submit; cleanup manual | Scheduled sweeper |
| M5 | **Outreach CRM submodule** | Many external APIs (Google, Yelp, Gemini, PermitStack, Apollo), rate buckets | Feature-flag; disable keys until needed |
| M6 | **Service catalog v2 replace/purge** | Requires typed confirmation strings; can break client approved tasks | Run only with backup; test on staging |
| M7 | **Manual admin workflows** | No bulk ops, recurring cron, or second admin | Prioritize from roadmap |
| M8 | **Server actions as API surface** | ~15 action files; auth pattern duplicated | Centralize `requireAdmin` / `requireClient` helpers (already partial) |
| M9 | **No staging environment documented** | Prod becomes staging | Add Vercel preview + staging DB |
| M10 | **README still create-next-app boilerplate** | Onboarding friction for new devs | Replace with project-specific README |

---

## 7. Feature completeness — build vs defer

### 7.1 Core launch path (must work)

| Feature | Status | Notes |
|---------|--------|-------|
| Marketing pages | ✅ | Home, services, pricing, about, how-it-works |
| Public request help form | ✅ | Honeypot + rate limit |
| Admin dashboard + client CRM | ✅ | |
| Discovery / intake queue | ✅ | PROSPECT_INTAKE kind |
| Client activation + portal invite | ✅ | Via password reset link |
| Portal: dashboard, requests, submit, detail, comments | ✅ | ACTIVE clients only |
| Portal: system access handoff | ✅ | Vault links in DB — see S4 |
| Portal: attachments | ✅ | Vercel Blob |
| Admin: time logging + timer | ✅ | STAGED entries need confirm flow in UI |
| Admin: billing / Stripe checkout | ⬜ Verify live | Portal billing portal for clients |
| Admin: disbursements | ✅ | Text-only receipts — no file upload |
| Password reset (admin + client) | ✅ | |
| Change password while signed in | ⚠️ Admin only | Clients use forgot-password only (`/admin/account` has form; portal account does not) |
| Email notifications | ⬜ Verify domain | Many flows |

### 7.2 Explicitly incomplete (OK for v1 if documented)

| Feature | Status | Ref |
|---------|--------|-----|
| Disbursement receipt upload | ⬜ Not started | product roadmap |
| Admin request attachment upload | ⬜ Text-only admin forms | roadmap |
| Encrypted system access vault | ⬜ Partial | roadmap |
| Stripe fully automated lifecycle emails | ⬜ | roadmap |
| Portal "Action Needed" dashboard alerts | ⬜ UX | roadmap |
| Expired invite "request new link" self-service | ⬜ | roadmap |
| Turnstile / CAPTCHA beyond honeypot | ⬜ Monitor intake spam | roadmap |
| Analytics / admin metrics | ⬜ Deferred | roadmap |

---

## 8. Data & compliance

- [ ] ⬜ **Database backups:** enable PITR or daily snapshots (Neon/Supabase/RDS — provider setting)
- [ ] ⬜ **Restore drill:** restore backup to staging once before launch
- [ ] ⬜ **Retention policy:** attachments, outreach data, deleted clients — undefined in code
- [ ] ⬜ **GDPR/export/delete:** no self-service account deletion
- [ ] ⬜ **PII inventory:** Client email/phone, vault links, support request content, time entries
- [ ] 🟡 **Secrets in DB:** vault links and admin secure notes — treat DB as sensitive (encryption at rest on Postgres provider minimum)

---

## 9. Observability & incident response

| Item | Status | Recommendation |
|------|--------|----------------|
| Error tracking (Sentry etc.) | ⬜ | Add with PII scrubbing |
| Uptime monitoring | ⬜ | Ping `/` and authenticated smoke |
| Log aggregation | ⬜ | Vercel logs minimum |
| Stripe webhook failure alerts | ⬜ | Stripe dashboard + alert on 5xx |
| Resend bounce/complaint handling | ⬜ | Resend dashboard |
| On-call runbook | ⬜ | "Site down", "email broken", "payments broken" |
| `DEPLOYMENT.md` rollback steps | ⬜ | Document Vercel rollback + migration caution |

---

## 10. Manual QA matrix (full launch)

### Public

- [ ] Homepage, pricing, services, about, request-help load
- [ ] Submit request-help → confirmation email + internal alert
- [ ] Honeypot filled → silent success, no DB noise

### Auth

- [ ] Admin login/logout
- [ ] Forgot password → reset → login
- [ ] Client invite email → set password → portal access
- [ ] Wrong password → generic error

### Admin

- [ ] Intake appears in dashboard
- [ ] Client activate → engagement → approved tasks → billing mode
- [ ] Stripe checkout (test then live)
- [ ] Create portal user / resend invite
- [ ] Log time; timer start/pause/stop
- [ ] Update request status + client-visible email
- [ ] Internal note stays admin-only
- [ ] Disbursement create → client approve/decline → mark paid
- [ ] Service catalog seed + portal shows work types
- [ ] Logo upload + display in portal sidebar

### Portal (client)

- [ ] Dashboard, request list, new request with attachment
- [ ] Needs-info flow + comment notifies admin
- [ ] System access handoff saves
- [ ] Billing portal link (Support Block + Stripe customer)
- [ ] Cannot see other tenant data (IDOR tests)

### Files

- [ ] Upload authorize → upload → submit → download via `/api/files/read`
- [ ] Cross-tenant read blocked
- [ ] Missing `BLOB_READ_WRITE_TOKEN` → clear error

### Stripe webhook

- [ ] `checkout.session.completed` updates client
- [ ] `invoice.payment_failed` → past_due
- [ ] `customer.subscription.deleted` → canceled

---

## 11. Suggested fix order (engineering)

**Week 0 — before first paying client**

1. 🔴 S1/S2 — Upstash Redis in production
2. 🔴 S3 — Auth-bind portal server actions to session `clientId`
3. 🔴 S8 — Stripe webhook `force-dynamic`
4. 🟠 B2 — Seed service catalog on first admin login or migration
5. 🟠 B1 — CI: lint + build + attachment validation script
6. Run §10 QA on staging

**Week 1 — hardening**

7. 🔴 S7 — Safer public intake client upsert
8. 🔴 S6 — Upload content verification beyond MIME
9. 🟠 B4 — Cron for recurring tasks
10. 🟠 B11 — Health endpoint
11. 🔴 S11 — Minimal audit log (request status, billing mode, time entry confirm)

**Post-launch**

12. S4 encryption for system access fields
13. S9 CSP
14. B6 blob cleanup
15. Client portal change-password UI (reuse `ChangePasswordForm`)
16. Second admin invite flow

---

## 12. Quick reference — what's already documented elsewhere

| Topic | Doc |
|-------|-----|
| Env vars + deploy steps | [DEPLOYMENT.md](../DEPLOYMENT.md) |
| Blob upload/read flow | DEPLOYMENT.md §5 |
| UX/feature backlog | [product-system-ux-roadmap.md](./product-system-ux-roadmap.md) |
| Attachment URL unit checks | `npx tsx scripts/test-attachment-url-validation.ts` |

---

## 13. Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Engineering | | | |
| Security review | | | Accept S4/S5/S11 or fix |
| Operations | | | Backups, Redis, monitoring |
| Business owner | | | Soft vs full launch scope |

---

*This checklist is derived from static code review and existing deployment docs. Re-audit after major changes (auth, storage, billing, tenant isolation).*
