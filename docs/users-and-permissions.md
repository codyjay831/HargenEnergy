# Users and Permissions

This app uses two auth realms:

- `ADMIN` users: Hargen staff admin area (`/admin`)
- `CLIENT` users: customer portal area (`/portal`)

Within each realm, role-based access is intentionally simple:

## Staff roles (`ADMIN`)

- `OWNER`
  - Manage staff users and roles
  - Manage billing controls
  - Manage service catalog destructive actions
  - All ops actions
- `MEMBER`
  - All ops actions
  - Client management actions
  - No staff management, billing management, or catalog management

## Client roles (`CLIENT`)

- `OWNER`
  - Manage company team users
  - Access billing portal
  - Approve/decline disbursements
  - All portal work actions
- `MEMBER`
  - Portal work actions only
  - No team management, billing portal, or disbursement approvals

## Security invariants

- `role=ADMIN` must have `staffRole` set.
- `role=CLIENT` must have `clientRole` set and a `clientId`.
- Deactivated users (`deactivatedAt` set) are denied sign-in/session refresh.
- Last-owner protections prevent removing the final owner in each realm/tenant.

## Invite flows

- Hargen owners invite staff from `/admin/team`.
- Client owners invite team members from `/portal/team`.
- Invites use single-use password reset links (30-minute TTL).

## Operational notes

- Existing bootstrap admin is backfilled to `OWNER`.
- Existing client users are backfilled: first per tenant `OWNER`, others `MEMBER`.
- Audit logs are recorded for invite, role, deactivate, and transfer actions.
