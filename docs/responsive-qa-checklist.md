# Responsive QA Checklist

## Viewports

- `375x812` (phone)
- `768x1024` (tablet)
- `1024x768` (small desktop)

## Baseline checks on every route

- [ ] Primary navigation is reachable without direct URL edits.
- [ ] No horizontal page overflow.
- [ ] Tables either scroll horizontally or render readable card fallbacks.
- [ ] Dialogs/sheets stay within viewport and allow vertical scrolling.
- [ ] Primary actions remain visible and tappable.

## Route matrix

### Marketing and public

- [ ] `/`
- [ ] `/how-it-works`
- [ ] `/services`
- [ ] `/pricing`
- [ ] `/about`
- [ ] `/request-help`
- [ ] `/schedule/discovery/[token]`
- [ ] `/privacy`
- [ ] `/terms`

### Auth

- [ ] `/login`
- [ ] `/forgot-password`
- [ ] `/reset-password`

### Admin

- [ ] `/admin`
- [ ] `/admin/clients`
- [ ] `/admin/clients/[id]`
- [ ] `/admin/requests`
- [ ] `/admin/requests/[id]`
- [ ] `/admin/outreach`
- [ ] `/admin/outreach/search`
- [ ] `/admin/outreach/companies`
- [ ] `/admin/outreach/follow-ups`
- [ ] `/admin/time`
- [ ] `/admin/billing`
- [ ] `/admin/team`
- [ ] `/admin/services`
- [ ] `/admin/settings/calendar`
- [ ] `/admin/settings/discovery-availability`
- [ ] `/admin/account`

### Portal

- [ ] `/portal`
- [ ] `/portal/requests`
- [ ] `/portal/requests/new`
- [ ] `/portal/requests/[id]`
- [ ] `/portal/access`
- [ ] `/portal/team`
- [ ] `/portal/account`

## Current pass notes

- Implemented admin and portal mobile sheet navigation.
- Added mobile card fallbacks on `admin/requests` and `admin/clients` non-active tabs.
- Added overflow protections for dialog/sheet surfaces and responsive grid/touch-target fixes from the deep-dive plan.
- Automated viewport checks are added via Playwright in this branch to catch regressions in CI.
