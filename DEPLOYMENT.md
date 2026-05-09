# Hargen Energy - Deployment Guide

This guide covers the steps required to deploy the Hargen Energy website and backend to a production environment.

## 1. Environment Variables

Ensure all required environment variables are set in your production environment (e.g., Vercel, Railway, or VPS). Refer to `.env.example` for the full list.

### Required for Runtime
- `DATABASE_URL`: PostgreSQL connection string.
- `AUTH_SECRET`: Secret key for Auth.js (generate with `npx auth secret`).
- `APP_URL` / `NEXT_PUBLIC_APP_URL`: The full URL of your production site (e.g., `https://hargenenergy.com`).

### Required for First Admin Setup
- `ADMIN_SETUP_TOKEN`: A high-entropy random string (e.g., `openssl rand -hex 32`). Used **once** to create the first admin via `/setup/admin`. Setup automatically closes once an admin exists. May be removed after setup.

### Required for Email (Resend)
- `RESEND_API_KEY`: Your Resend API key.
- `SUPPORT_FROM_EMAIL`: The verified sender email in Resend.
- `SUPPORT_NOTIFICATION_EMAIL`: The internal email address for admin alerts.

### Required for Stripe
- `STRIPE_SECRET_KEY`: Your Stripe secret key (Live or Test).
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook signing secret.
- `STRIPE_LIGHT_PRICE_ID` / `STRIPE_CORE_PRICE_ID` / `STRIPE_PRIORITY_PRICE_ID`: Price IDs for support blocks.

### Optional (manual seed only)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`: **Not used by production builds.** Only consumed by `npm run prisma:seed` for local development convenience.

## 2. Database & First Admin Setup

The production build no longer runs `prisma db seed`. The build script is:

```
prisma migrate deploy && prisma generate && next build
```

### First-time admin bootstrap (production)

1. Add `ADMIN_SETUP_TOKEN` to your production environment (Vercel → Project → Settings → Environment Variables).
2. Deploy the application. Migrations will run automatically during build.
3. Visit `https://yourdomain.com/setup/admin`.
4. Enter the setup token, your name, email, and a strong password (min. 12 characters, at least one letter and one number).
5. Submit. You will be redirected to `/login`.
6. Sign in with your new admin credentials.
7. (Optional) Remove `ADMIN_SETUP_TOKEN` from production env after setup. The route also refuses further setup once any `ADMIN` user exists, so leaving it in place is harmless but unnecessary.

> Notes
> - If `ADMIN_SETUP_TOKEN` is missing, `/setup/admin` fails closed with a generic "unavailable" message.
> - The setup token is compared server-side using a constant-time comparison; never store the token in the database.
> - The page at `/setup/admin` is no-indexed.

### Resetting an admin password

Admins can reset their password from the sign-in page:

1. Click **Forgot password?** on `/login`.
2. Enter the account email at `/forgot-password`. The page always shows the same generic success message regardless of whether the email exists.
3. Open the email from Hargen Energy. Click the reset link (`/reset-password?token=...`).
4. Choose a new password (min. 12 characters, at least one letter and one number) and confirm.
5. Sign back in at `/login`.

Reset tokens are single-use, hashed at rest, and expire after 30 minutes.

### Admin changes own password while signed in

Signed-in admins can change their password under `/admin/account`. The form requires the current password before accepting a new one.

## 3. Stripe Configuration

1. **Webhook Setup**:
    - Add a new webhook endpoint in the Stripe Dashboard pointing to `https://yourdomain.com/api/stripe/webhook`.
    - Select the following events:
        - `checkout.session.completed`
        - `customer.subscription.created`
        - `customer.subscription.updated`
        - `customer.subscription.deleted`
        - `invoice.payment_failed`
    - Copy the Webhook Signing Secret to `STRIPE_WEBHOOK_SECRET`.

2. **Price IDs**:
    - Ensure the Price IDs in your environment variables match the products you've created in Stripe (Subscriptions, not one-time).

## 4. Resend Configuration

1. **Domain Verification**:
    - Verify your domain in the Resend dashboard to use a custom `SUPPORT_FROM_EMAIL`.
    - Until verified, you may be restricted to sending to your own email address or using the default Resend testing domain.

## 5. Security Verification

- **Admin Protection**: Visit `/admin` while logged out. You should be redirected to `/login`.
- **Setup Closure**: After the first admin is created, visit `/setup/admin` again — it should display "Admin setup is already complete."
- **Portal Ownership**: Log in as a client user and try to access `/portal/requests/[id]` for a request belonging to another client. You should see a 404 or "Not Found".
- **Internal Notes**: Verify that internal notes added by admins are NOT visible in the Client Portal.
- **Login error messages**: Confirm that production login errors do not reveal whether an account exists. The user only sees "Invalid email or password." or "Authentication service unavailable."

## 6. Final Launch Checklist

### Pre-deploy
- [ ] Production database created (PostgreSQL).
- [ ] All required environment variables added (Vercel/Hosting), including `ADMIN_SETUP_TOKEN`.
- [ ] `APP_URL` and `NEXT_PUBLIC_APP_URL` set to the production domain.
- [ ] Stripe products and prices created in the appropriate mode (Test/Live).
- [ ] Resend sender domain verified in the Resend dashboard.
- [ ] `SUPPORT_FROM_EMAIL` matches the verified domain.
- [ ] `SUPPORT_NOTIFICATION_EMAIL` set to the intended admin recipient.

### Deploy
- [ ] Confirm the build runs `prisma migrate deploy && prisma generate && next build` (no `db seed`).
- [ ] Confirm the application boots and is accessible.
- [ ] Visit `/setup/admin` and create the first admin.
- [ ] Sign in at `/login`.

### Post-deploy Verification
- [ ] **Public Website**: Homepage, Services, Pricing, and About pages load correctly.
- [ ] **Request Intake**: Submit the "Request Help" form.
    - [ ] Verify client confirmation email is received.
    - [ ] Verify internal admin alert email is received.
- [ ] **Admin Access**: Visit `/admin`.
    - [ ] Verify redirect to `/login` for unauthenticated users.
    - [ ] Log in with admin credentials.
    - [ ] Verify the submitted request appears in the dashboard.
    - [ ] Visit `/admin/account` and confirm change-password flow works end-to-end.
    - [ ] Update request status and verify "client-visible update" email (if selected).
    - [ ] Log time against the request and verify capacity tracking updates.
- [ ] **Forgot / Reset Password**:
    - [ ] Submit a known email at `/forgot-password`. Generic success message shown.
    - [ ] Click reset link in email; complete password update at `/reset-password`.
    - [ ] Confirm token is single-use (link cannot be reused).
- [ ] **Client Portal**:
    - [ ] Verify redirect to `/login` for unauthenticated users.
    - [ ] Log in as a client user (created via admin or manual DB entry).
    - [ ] Verify only own requests are visible.
    - [ ] Submit a new portal request and verify admin alert.
    - [ ] Respond to a "Needs Info" request and verify admin visibility.
- [ ] **Stripe**:
    - [ ] Create a checkout session from a client detail page.
    - [ ] Complete a test payment (if in test mode).
    - [ ] Verify the webhook updates the client's subscription status in the database.

## 7. Security Verification
- [ ] Verify no internal notes or admin-only data are visible in the Client Portal.
- [ ] Verify that a client user cannot access another client's request by manually changing the URL ID.
- [ ] Verify that server actions for time logging and billing require the `ADMIN` role.
- [ ] Verify that `/setup/admin` refuses creation when an admin already exists.
- [ ] Verify that `/admin/account` rejects an incorrect current password.
