# MFA Epic (Optional / Policy-Driven)

MFA is not enabled by default in this launch scope. Activate this epic only when contractual, compliance, or customer policy requires it.

## Scope recommendation

- Start with TOTP app-based MFA for `ADMIN` accounts first.
- Add backup recovery codes.
- Require step-up verification for sensitive actions (staff role changes, billing overrides, ownership transfers).

## Rollout phases

1. **Foundation**
   - Add MFA secret + recovery code storage (encrypted at rest).
   - Add enrollment and challenge pages.
2. **Optional enforcement**
   - Allow users to opt in and validate login challenge flow.
3. **Required enforcement**
   - Enforce MFA for owners/admins.
   - Add break-glass recovery runbook.

## Operational requirements

- Incident runbook for lost device / lockout.
- Audit logs for MFA enroll/disable/recovery.
- Support communication template for rollout and enforcement dates.
