# Product / System / UX Roadmap

## 1. Current App Posture
- **Core infrastructure is mostly live-ready**: Authentication, database migrations, tenant isolation, and production email (Resend) are fully configured and verified.
- **Stripe setup is deferred**: Billing and subscription sync are tracked separately in `DEPLOYMENT.md` and are the final blockers for a full commercial launch.
- **Roadmap Focus**: This document tracks product quality, system feature gaps, UX polish, and future improvements. Items here are **not** launch blockers unless explicitly marked.
- **Audit Status**: This roadmap is based on an initial system audit. Further refinement is needed as real user feedback is gathered.

---

## 2. System Feature Gaps
Track incomplete or planned system capabilities.

| Item | Status | Current Behavior | Desired Behavior | Priority | Launch Blocker | Notes |
|:---|:---:|:---|:---|:---:|:---:|:---|
| **File Uploads / Attachments** | Complete | Portal uploads via Vercel Blob; blob URLs stored in Postgres; reads via `/api/files/read`. | Users can upload plan sets, utility bills, and photos to requests. | High | No | Requires `BLOB_READ_WRITE_TOKEN` + linked Blob store on Vercel. |
| **Logo Upload** | Complete | Admin can upload logo to Vercel Blob or paste URL / pull from website. | Direct file upload for client branding in admin and portal. | Medium | No | Public blob URL in portal sidebar and emails. |
| **Support Request Attachments** | Complete | Portal request form includes file upload. | Drag-and-drop or file picker for adding context to requests. | High | No | Admin request forms still text-only. |
| **Receipt/Document Support** | Not started | Disbursement requests are text-only. | Admins can upload receipts to disbursements for client review. | Medium | No | Needed for financial transparency. |
| **Admin System Access Vault** | Partial | Manual entry of vault links and secure notes. | Encrypted storage or deep integration with external vault providers. | Medium | No | Current vault link method is a functional workaround. |

---

## 3. UX Improvements
Audit of current UI/UX issues and polish opportunities.

| Area/Page/Component | Current Issue | Recommended Improvement | Priority | Affects Launch Confidence |
|:---|:---|:---|:---:|:---:|
| **Portal Dashboard** | No visibility into "Needs Info" or "Missing Access". | Add an "Action Needed" alert section at the top of the dashboard. | High | Yes |
| **Admin Dashboard** | Stats are clickable but no explicit "Quick Actions". | Add a "Quick Actions" panel (Invite Client, New Disbursement, Log Time). | Medium | No |
| **Forms (General)** | Basic alert banners for success/error. | Implement a consistent Toast notification system (e.g., `sonner`). | Medium | No |
| **Empty States** | Simple text-only placeholders (e.g., "No requests yet"). | Add illustrated empty states with clear calls to action. | Low | No |
| **Loading States** | Basic skeleton loaders exist but feel generic. | Refine skeleton patterns to match specific card layouts better. | Low | No |
| **Mobile Navigation** | Sidebar-to-topbar transition is functional but tight. | Verify touch targets and mobile menu ergonomics. | Medium | No |

---

## 4. Admin Workflow Improvements
- **Bulk Actions**: Add ability to bulk-update request statuses or bulk-archive completed requests.
- **Client Invite Flow**: Allow sending portal invites to "LEAD" status clients to gather system access data before activation.
- **Internal Alerts**: Refine internal email alerts to include more actionable links directly to the admin detail page.
- **Request Prioritization**: Add a drag-and-drop or numerical "Priority Rank" view for active work requests.

---

## 5. Customer Portal Improvements
- **Status Clarity**: Enhance status badges with tooltips explaining what "Needs Info" or "Waiting on Third Party" specifically means.
- **Invite Acceptance**: Ensure the password setup flow after clicking an invite link is seamless and high-trust.
- **Onboarding Progress**: Show a "Setup Checklist" (Billing, System Access, First Request) for new clients.
- **Expired Invites**: Implement a user-friendly "Request New Link" page if an invite token expires.

---

## 6. Public Intake / Marketing Flow Improvements
- **Success Feedback**: The "Request Help" success screen is a simple card; add a "What happens next" timeline.
- **Form Validation**: Add real-time validation for email/phone formats to prevent submission errors.
- **Spam Protection**: Honeypot is implemented; monitor for need of Turnstile or similar if bot traffic increases.
- **Copy Clarity**: Audit marketing copy to ensure "Walkthrough" and "Solar Ops Desk" terminology is consistent.

---

## 7. Deferred Integrations
- **Stripe Billing**: Automated subscription management, seat-based pricing, and invoice generation.
- **File Storage**: Vercel Blob with NextAuth-gated uploads (implemented). Optional future: lifecycle cleanup for `pending/` attachment paths.
- **Analytics**: Basic dashboard analytics for admin (e.g., "Average time to complete request").
- **CRM Sync**: Push public intake leads to external CRMs like HubSpot or Apollo.

---

## 8. Suggested Next Implementation Order

1. **Highest-Value UX Fixes**:
    - Add "Action Needed" alerts to the Customer Portal dashboard.
    - Implement Toast notifications for form submissions.
2. **System Features (Soon)**:
    - Basic File Upload logic for Support Request attachments.
    - Direct Logo Upload for client branding.
3. **Customer Trust & Polish**:
    - Illustrated empty states.
    - Refined "What to expect" success screen for the public form.
4. **Larger Deferred Features**:
    - Full Stripe subscription automation.
    - Advanced Admin "Priority Rank" management.
