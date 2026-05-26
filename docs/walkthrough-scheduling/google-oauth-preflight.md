# Google OAuth Preflight — Walkthrough Scheduling

Complete this checklist before enabling `WALKTHROUGH_SCHEDULING_ENABLED` in production.

## Checklist

- [ ] Google Cloud project created for Hargen Energy
- [ ] Google Calendar API enabled in the project
- [ ] OAuth consent screen configured (External or Internal)
- [ ] Scope approved: `https://www.googleapis.com/auth/calendar.events`
- [ ] Authorized redirect URI registered:
  - Production: `https://hargenenergy.com/api/integrations/google/callback`
  - Staging: `{STAGING_APP_URL}/api/integrations/google/callback`
  - Local: `http://localhost:3000/api/integrations/google/callback`
- [ ] OAuth consent screen **In production** (or Internal workspace) — Testing mode only allows test users for **admin** connect
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set in Vercel (Production + Preview as needed)
- [ ] `FIELD_ENCRYPTION_KEY` set in production (required for token storage)
- [ ] Admin connect flow tested on target domain

## Record (fill in at go-live)

| Field | Value |
|-------|-------|
| Google Cloud Project ID | _pending_ |
| Consent screen status | _pending_ |
| Verification date | _pending_ |
| Redirect URIs registered | _pending_ |
| Test connect result | _pending_ |
| Sign-off | _pending_ |

## Notes

- Only **admin** users complete Google OAuth. Customers book via public scheduling links; they do not sign in with Google.
- Customer self-scheduling does not require Google app verification for end users, but admin calendar connect must work on the production domain.

## Go / No-Go

- **Go:** All checklist items pass; admin can connect calendar and select a calendar on staging/production.
- **No-Go:** OAuth in Testing mode with non-test admin accounts, missing redirect URI, or Calendar API disabled.
