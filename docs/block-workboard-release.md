# Client-scoped block work release checklist

Use this when deploying Support Block work surfaces (proof-of-work updates, client nudges, activity timeline) — separate from priced work requests.

## 1) Pre-deploy (local / staging)

- [ ] Confirm migration exists: `prisma/migrations/20260530010000_add_block_workboard_foundation/migration.sql`
- [ ] Run migration against staging DB:

  ```bash
  npx prisma migrate deploy
  ```

- [ ] Regenerate client (if needed):

  ```bash
  npx prisma generate
  ```

- [ ] Run targeted tests:

  ```bash
  npm run test -- src/lib/block-work-policy.test.ts src/lib/block-work.test.ts src/lib/admin-client-tabs.test.ts src/app/actions/block-work.test.ts
  ```

## 2) Feature flag (production)

Gated by `isBlockWorkboardEnabled()` in `src/lib/block-work-policy.ts`:

| Environment | Behavior |
|-------------|----------|
| Development | Enabled automatically (`NODE_ENV !== "production"`) |
| Production | Set `BLOCK_WORKBOARD_ENABLED=1` before exposing UI |

Without the flag in production, client Work tab / portal My work block sections are hidden and server actions return an error.

Legacy routes redirect: `/admin/block-work` → `/admin/clients`, `/portal/block-work` → `/portal/requests`.

## 3) Deploy order

1. Deploy application code.
2. Run `npx prisma migrate deploy` (creates tables + backfills from approved Support Block tasks).
3. Set `BLOCK_WORKBOARD_ENABLED=1` when ready to go live.
4. Restart / redeploy so env is picked up.

Do not enable the flag before the migration runs.

## 4) Admin smoke test (~5–10 min)

1. **Clients → [active Support Block client] → Setup → Engagement**: save approved block tasks; confirm block items sync.
2. Header: **Log proof of work** → pick task → describe work → **Continue** → activity appears on **Work** tab timeline.
3. **Work** tab shows unified activity, subscribed tasks list, and priced work requests.
4. Priced path unchanged: **Log request** / `/admin/requests`.

## 5) Portal smoke test (client)

1. Log in as a block client → **My work** (`/portal/requests`).
2. **Updates from Hargen** shows client-visible activity feed.
3. **Request attention** → pick task + note → nudge succeeds.
4. **Send work** (`/portal/requests/new`) unchanged for priced / out-of-scope items.

## 6) Hybrid clients

When both **Support Block** and **Request-Based** are active:

- Work tab / My work = approved block tasks + activity
- Send work / Log request = request / catalog path with pricing gates
- Server action `convertBlockWorkToRequest` still available for escalations (not exposed in v2 UI by default)

## 7) Data integrity (optional SQL)

Duplicate rows per client + task (should return zero rows):

```sql
SELECT "clientId", "workTaskId", COUNT(*)
FROM "BlockWorkItem"
GROUP BY "clientId", "workTaskId"
HAVING COUNT(*) > 1;
```

## 8) Rollback

| Level | Action |
|-------|--------|
| Soft | Remove `BLOCK_WORKBOARD_ENABLED` — UI/actions disabled; data retained |
| Hard | Revert app deploy; migration is additive — only drop tables if you accept losing block history |

## 9) Post-launch ops habit

- Admin: **Log proof of work** from the client header when completing block PM work
- Client: **Request attention** on My work when volume spikes; avoid treating every nudge as a new priced request
- Escalate true deliverables via **Log request** / **Send work**

## Related code

| Area | Path |
|------|------|
| Schema | `prisma/schema.prisma` (`BlockWorkItem`, `BlockWorkActivity`) |
| Policy / flag | `src/lib/block-work-policy.ts` |
| Loaders / sync | `src/lib/block-work.ts` |
| Server actions | `src/app/actions/block-work.ts` |
| Engagement sync | `src/app/actions/clients.ts` (`updateClientEngagement`) |
| Admin UI | `src/app/admin/clients/[id]/page.tsx`, `src/components/admin/client-work/*` |
| Portal UI | `src/app/portal/requests/page.tsx`, `src/components/portal/portal-work/*` |
