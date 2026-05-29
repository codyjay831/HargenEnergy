# Block Workboard release checklist

Use this when deploying the Block PM workboard (priority nudges, proof-of-work updates, separate from priced requests).

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
  npm run test -- src/lib/block-work-policy.test.ts src/app/actions/block-work.test.ts
  ```

## 2) Feature flag (production)

Gated by `isBlockWorkboardEnabled()` in `src/lib/block-work-policy.ts`:

| Environment | Behavior |
|-------------|----------|
| Development | Enabled automatically (`NODE_ENV !== "production"`) |
| Production | Set `BLOCK_WORKBOARD_ENABLED=1` before exposing UI |

Without the flag in production, `/admin/block-work` and `/portal/block-work` show “unavailable” and server actions return an error.

## 3) Deploy order

1. Deploy application code.
2. Run `npx prisma migrate deploy` (creates tables + backfills from approved Support Block tasks).
3. Set `BLOCK_WORKBOARD_ENABLED=1` when ready to go live.
4. Restart / redeploy so env is picked up.

Do not enable the flag before the migration runs.

## 4) Admin smoke test (~5–10 min)

1. Open `/admin/block-work` — board loads or shows empty state.
2. **Clients → Setup → Engagement**: save approved block tasks; confirm items sync to the board.
3. On one item:
   - Set priority (P1–P5)
   - **Post Update** with body + optional completed/pending counts
   - Confirm activity appears on the card
4. **Convert to Priced Request** — confirm request in `/admin/requests` and conversion activity on the block item.
5. **Pause** / **Archive** — item leaves the active queue.

## 5) Portal smoke test (client)

1. Log in as a block client → `/portal/block-work`
2. Subscribed tasks align with **Account → Approved support areas**
3. **Request Attention** (note + optional volume/window)
4. Priority / activity updates visible on the card
5. Priced path unchanged: `/portal/requests/new`

## 6) Hybrid clients

When both **Support Block** and **Request-Based** are active:

- Block board = approved tasks only
- Send work = request / catalog path with pricing gates
- Conversion from block item creates a linked `SupportRequest` without breaking request pricing rules

## 7) Data integrity (optional SQL)

Duplicate rows per client + task (should return zero rows):

```sql
SELECT "clientId", "workTaskId", COUNT(*)
FROM "BlockWorkItem"
GROUP BY "clientId", "workTaskId"
HAVING COUNT(*) > 1;
```

Backfill populated:

```sql
SELECT COUNT(*) FROM "BlockWorkItem";
```

## 8) Rollback

| Level | Action |
|-------|--------|
| Soft | Remove `BLOCK_WORKBOARD_ENABLED` — UI/actions disabled; data retained |
| Hard | Revert app deploy; migration is additive — only drop tables if you accept losing block history |

## 9) Post-launch ops habit

- Admin: post structured updates (counts + what was done) on block items
- Client: nudge when volume spikes; avoid treating every nudge as a new priced request
- Escalate true deliverables via **Convert to Priced Request** only

## Related code

| Area | Path |
|------|------|
| Schema | `prisma/schema.prisma` (`BlockWorkItem`, `BlockWorkActivity`) |
| Policy / flag | `src/lib/block-work-policy.ts` |
| Loaders / sync | `src/lib/block-work.ts` |
| Server actions | `src/app/actions/block-work.ts` |
| Engagement sync | `src/app/actions/clients.ts` (`updateClientEngagement`) |
| Admin UI | `src/app/admin/block-work/page.tsx` |
| Portal UI | `src/app/portal/block-work/page.tsx` |
