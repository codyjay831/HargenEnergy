# Security Review Summary (Quick Pass)

**Date:** 2026-05-29  
**Scope:** Authorization, OAuth state, browser headers, CI/supply chain  
**Depth:** Quick pass (high-impact fixes implemented)

## Implemented Remediations

### P0 — Authorization (RBAC)

Privileged server actions now enforce capability checks via `requireStaff(...)` / `authorizeStaffAction(...)`:

| Area | Capability | Files |
|------|------------|-------|
| Disbursements (create, mark paid) | `billing.manage` | `src/app/actions/disbursements.ts` |
| Client billing mode | `billing.manage` | `src/app/actions/clients.ts` |
| Client lifecycle / engagement / ops requests | `clients.manage` | `src/app/actions/clients.ts`, `agreement.ts`, `system-access.ts` |
| Staff directory listing | `staff.manage` | `src/app/actions/staff-users.ts` |
| Discovery scheduling admin | `ops.full` | `src/app/actions/discovery-scheduling-admin.ts` |
| Time, timer, recurring, requests, outreach | `ops.full` | `time.ts`, `timer.ts`, `recurring.ts`, `requests.ts`, `outreach.ts` |
| Admin error reporting | authenticated staff | `admin-error-report.ts` (no anonymous Sentry/log spam) |

Added `authorizeStaffAction()` for actions that return `{ error }` instead of throwing.  
Tests: `src/lib/auth-guards.test.ts`.

**Effect:** `MEMBER` staff can no longer invoke owner-only billing/disbursement or staff-management actions.

### P0 — Google OAuth state (fail-closed)

- Production without Redis throws on `createGoogleOAuthState` and rejects `consumeGoogleOAuthState` (no embedded `userId` fallback).
- Dev/local fallback unchanged for DX.
- Tests: `src/lib/google-calendar/oauth-state.test.ts`.

### P1 — Browser security headers

- CSP moved from **Report-Only** to **enforced** in `next.config.ts`.
- Added **HSTS** (`max-age=31536000; includeSubDomains`).

### P1 — CI / supply chain

- CI runs `npm test` and `npm audit --audit-level=high`.
- Added `.github/dependabot.yml` for weekly npm updates.

## Residual Risks (Accepted / Deferred)

| Risk | Severity | Notes |
|------|----------|-------|
| CSP still allows `'unsafe-inline'` for scripts/styles | Medium | Needed for current Next/Stripe integration; tighten with nonces in a follow-up |
| 6 moderate npm audit findings (no high/critical) | Medium | Transitive (`prisma`, `next`, `qs`); track via Dependabot |
| `/api/health` unauthenticated | Low | Infra fingerprinting; restrict or internalize if exposed publicly |
| `ADMIN_SETUP_TOKEN` after bootstrap | Medium | Remove token after first admin (operational) |
| Middleware does not cover `/api/*` | Medium | Relies on per-route checks; periodic API route audit recommended |
| `next-auth@5.0.0-beta.31` | Medium | Move to stable when available |

## Verification

- `npm test` — 144 tests passed
- `npm audit --audit-level=high` — exit 0 (moderate issues remain, documented above)

## Recommended Next Sprint

1. CSP nonces / hash-based `script-src` to drop `'unsafe-inline'`.
2. Convert `scripts/test-auth-guards.ts` and `scripts/test-permissions.ts` into Vitest or run them in CI.
3. API route inventory with explicit auth matrix (cron, webhooks, uploads, health).
4. Upgrade `next-auth` to stable release when compatible.
