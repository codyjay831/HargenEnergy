# Hargen Energy - Deployment Guide

This guide covers the steps required to deploy the Hargen Energy website and backend to a production environment.

## 1. Environment Variables

Ensure all required environment variables are set in your production environment (e.g., Vercel, Railway, or VPS). Refer to `.env.example` for the full list.

### Required for Runtime
- `DATABASE_URL`: PostgreSQL connection string.
- `AUTH_SECRET`: Secret key for Auth.js (generate with `npx auth secret`).
- `APP_URL`: The full URL of your production site (e.g., `https://hargenenergy.com`).

### Required for Email (Resend)
- `RESEND_API_KEY`: Your Resend API key.
- `SUPPORT_FROM_EMAIL`: The verified sender email in Resend.
- `SUPPORT_NOTIFICATION_EMAIL`: The internal email address for admin alerts.

### Required for Stripe
- `STRIPE_SECRET_KEY`: Your Stripe secret key (Live or Test).
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook signing secret.
- `STRIPE_LIGHT_PRICE_ID`: Price ID for the Light Support plan.
- `STRIPE_CORE_PRICE_ID`: Price ID for the Core Support plan.
- `STRIPE_PRIORITY_PRICE_ID`: Price ID for the Priority Support plan.

## 2. Database Setup

1.  **Run Migrations**:
    ```bash
    npx prisma migrate deploy
    ```

2.  **Seed Initial Admin**:
    Ensure `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` are set in your environment, then run:
    ```bash
    npm run prisma:seed
    ```

## 3. Stripe Configuration

1.  **Webhook Setup**:
    - Add a new webhook endpoint in the Stripe Dashboard pointing to `https://yourdomain.com/api/stripe/webhook`.
    - Select the following events:
        - `checkout.session.completed`
        - `customer.subscription.created`
        - `customer.subscription.updated`
        - `customer.subscription.deleted`
        - `invoice.payment_failed`
    - Copy the Webhook Signing Secret to `STRIPE_WEBHOOK_SECRET`.

2.  **Price IDs**:
    - Ensure the Price IDs in your environment variables match the products you've created in Stripe (Subscriptions, not one-time).

## 4. Resend Configuration

1.  **Domain Verification**:
    - Verify your domain in the Resend dashboard to use a custom `SUPPORT_FROM_EMAIL`.
    - Until verified, you may be restricted to sending to your own email address or using the default Resend testing domain.

## 5. Security Verification

- **Admin Protection**: Visit `/admin` while logged out. You should be redirected to `/login`.
- **Portal Ownership**: Log in as a client user and try to access `/portal/requests/[id]` for a request belonging to another client. You should see a 404 or "Not Found".
- **Internal Notes**: Verify that internal notes added by admins are NOT visible in the Client Portal.

## 7. Final Launch Checklist

### Pre-deploy
- [ ] Production database created (PostgreSQL).
- [ ] All environment variables from `.env.example` added to production (Vercel/Hosting).
- [ ] `APP_URL` and `NEXT_PUBLIC_APP_URL` set to the production domain.
- [ ] Stripe products and prices created in the appropriate mode (Test/Live).
- [ ] Resend sender domain verified in the Resend dashboard.
- [ ] `SUPPORT_FROM_EMAIL` matches the verified domain.
- [ ] `SUPPORT_NOTIFICATION_EMAIL` set to the intended admin recipient.

### Deploy
- [ ] Run `npx prisma migrate deploy` against the production database.
- [ ] Run `npm run prisma:seed` to create the initial admin user.
- [ ] Confirm the build completes successfully (ensure `DATABASE_URL` is available during build).
- [ ] Confirm the application boots and is accessible.

### Post-deploy Verification
- [ ] **Public Website**: Homepage, Services, Pricing, and About pages load correctly.
- [ ] **Request Intake**: Submit the "Request Help" form.
    - [ ] Verify client confirmation email is received.
    - [ ] Verify internal admin alert email is received.
- [ ] **Admin Access**: Visit `/admin`.
    - [ ] Verify redirect to `/login` for unauthenticated users.
    - [ ] Log in with admin credentials.
    - [ ] Verify the submitted request appears in the dashboard.
    - [ ] Update request status and verify "client-visible update" email (if selected).
    - [ ] Log time against the request and verify capacity tracking updates.
- [ ] **Client Portal**:
    - [ ] Verify redirect to `/login` for unauthenticated users.
    - [ ] Log in as a client user (created via seed or manual DB entry).
    - [ ] Verify only own requests are visible.
    - [ ] Submit a new portal request and verify admin alert.
    - [ ] Respond to a "Needs Info" request and verify admin visibility.
- [ ] **Stripe**:
    - [ ] Create a checkout session from a client detail page.
    - [ ] Complete a test payment (if in test mode).
    - [ ] Verify the webhook updates the client's subscription status in the database.

## 8. Security Verification
- [ ] Verify no internal notes or admin-only data are visible in the Client Portal.
- [ ] Verify that a client user cannot access another client's request by manually changing the URL ID.
- [ ] Verify that server actions for time logging and billing require the `ADMIN` role.
