export type OutreachTemplateCategory =
  | "INITIAL_EMAIL"
  | "WEBSITE_FORM"
  | "LINKEDIN_CONNECTION"
  | "LINKEDIN_FOLLOW_UP"
  | "FOLLOW_UP_3_DAY"
  | "FOLLOW_UP_7_DAY"
  | "PAIN_PERMITS"
  | "PAIN_UTILITY_PTO"
  | "PAIN_CRM_CLEANUP"
  | "PAIN_CUSTOMER_COMMUNICATION";

export interface OutreachMessageTemplate {
  id: string;
  category: OutreachTemplateCategory;
  categoryLabel: string;
  versionLabel: string;
  channel: "EMAIL" | "WEBSITE_FORM" | "LINKEDIN";
  subject?: string;
  body: string;
}

export const OUTREACH_TEMPLATE_CATEGORIES: Array<{
  category: OutreachTemplateCategory;
  label: string;
}> = [
  { category: "INITIAL_EMAIL", label: "Initial Outreach Email" },
  { category: "WEBSITE_FORM", label: "Website Contact Form" },
  { category: "LINKEDIN_CONNECTION", label: "LinkedIn Connection" },
  { category: "LINKEDIN_FOLLOW_UP", label: "LinkedIn Follow-Up After Connection" },
  { category: "FOLLOW_UP_3_DAY", label: "Follow-Up Email — 3 Days" },
  { category: "FOLLOW_UP_7_DAY", label: "Follow-Up Email — 7 to 10 Days / Breakup" },
  { category: "PAIN_PERMITS", label: "Pain-Specific — Permits / Corrections" },
  { category: "PAIN_UTILITY_PTO", label: "Pain-Specific — Utility / PTO" },
  { category: "PAIN_CRM_CLEANUP", label: "Pain-Specific — CRM Cleanup / Admin Overload" },
  { category: "PAIN_CUSTOMER_COMMUNICATION", label: "Pain-Specific — Customer Communication" },
];

export const OUTREACH_MESSAGE_TEMPLATES: OutreachMessageTemplate[] = [
  // ─── INITIAL OUTREACH EMAIL ────────────────────────────────────────────────

  {
    id: "initial-email-a",
    category: "INITIAL_EMAIL",
    categoryLabel: "Initial Outreach Email",
    versionLabel: "General Solar Ops",
    channel: "EMAIL",
    subject: "Solar ops support for {companyName}",
    body: `{greeting}

I'm Cody Barbour with Hargen Energy. I help residential solar contractors keep the back-office side of projects moving when the internal team is busy selling, installing, and managing customers.

The areas I usually help with are the work items that slow jobs down between milestones: permit follow-up and corrections, utility/interconnection/PTO follow-through, customer updates, CRM cleanup, document organization, and quote/proposal support.

My background is residential solar operations, so you do not need to teach me solar from scratch. The main thing I would need to learn is how your company prefers jobs handled, what tools you use, and where your team could use extra support.

Would you be open to a quick call next week to see if there is anything worth taking off your plate?

{signature}`,
  },

  {
    id: "initial-email-b",
    category: "INITIAL_EMAIL",
    categoryLabel: "Initial Outreach Email",
    versionLabel: "Fast Install / Low Backlog Safe",
    channel: "EMAIL",
    subject: "Keeping solar jobs moving after the sale",
    body: `{greeting}

I'm Cody Barbour with Hargen Energy. I help residential solar contractors keep the office side of projects moving so sales, installs, and customer communication do not get slowed down by follow-up work.

Even when installs are moving quickly, the hidden workload is usually in the middle and back end of the job: permit corrections, utility/interconnection follow-up, PTO items, customer updates, CRM cleanup, missing documents, and closeout tracking.

My background is residential solar operations, so I do not need solar explained from scratch. I would mainly need to learn your company process, tools, and approval boundaries.

Would you be open to a quick call next week to see if Hargen could help with overflow or open-item follow-through?

{signature}`,
  },

  {
    id: "initial-email-c",
    category: "INITIAL_EMAIL",
    categoryLabel: "Initial Outreach Email",
    versionLabel: "Small Team / Owner Support",
    channel: "EMAIL",
    subject: "Extra solar ops help without hiring full-time",
    body: `{greeting}

I'm Cody Barbour with Hargen Energy. I help residential solar contractors cover back-office project work when the company needs extra support but does not need another full-time hire.

That usually means help with permit follow-up, utility/interconnection items, customer updates, CRM cleanup, missing documents, inspection scheduling, and keeping open jobs moving between milestones.

I've worked in residential solar operations, so this is not generic admin support. I understand the difference between a clean job, a messy job, a permit correction, a utility delay, and a customer who just needs a clear update.

Would it be worth a short call next week to see where your team could use occasional support?

{signature}`,
  },

  // ─── WEBSITE CONTACT FORM ──────────────────────────────────────────────────

  {
    id: "website-form-a",
    category: "WEBSITE_FORM",
    categoryLabel: "Website Contact Form",
    versionLabel: "Short Professional",
    channel: "WEBSITE_FORM",
    subject: "Solar operations support",
    body: `Hi team,

I'm Cody Barbour with Hargen Energy. I help residential solar contractors with back-office project follow-through: permits, corrections, utility/interconnection/PTO items, customer updates, CRM cleanup, document organization, and closeout tracking.

My background is residential solar operations, so the goal is not to add another person your team has to train from scratch. The goal is to learn your company process and help cover the repetitive follow-up work that slows jobs down between milestones.

I'd be interested in a quick conversation to see if Hargen could help with overflow support or open-item cleanup.

Best,
Cody Barbour
Hargen Energy`,
  },

  {
    id: "website-form-b",
    category: "WEBSITE_FORM",
    categoryLabel: "Website Contact Form",
    versionLabel: "Cleaner and Direct",
    channel: "WEBSITE_FORM",
    subject: "Back-office solar support",
    body: `Hi team,

My name is Cody Barbour, and I run Hargen Energy. We provide solar operations support for residential contractors that need help with the back-office work around active jobs.

Common areas we help with include permit follow-up, utility/PTO follow-through, customer updates, CRM cleanup, missing document requests, quote/proposal support, and inspection or closeout tracking.

This is meant to fit into your existing process, not force your team into new software or a new workflow.

Would someone on your team be open to a quick call?

Best,
Cody Barbour
Hargen Energy`,
  },

  {
    id: "website-form-c",
    category: "WEBSITE_FORM",
    categoryLabel: "Website Contact Form",
    versionLabel: "Limited Character Space",
    channel: "WEBSITE_FORM",
    subject: "Solar ops support",
    body: `Hi team,

I'm Cody Barbour with Hargen Energy. I help residential solar contractors with project follow-through: permits, utility/PTO items, customer updates, CRM cleanup, missing documents, and closeout tracking.

My background is residential solar operations, so I can learn your process and help cover the repetitive follow-up work without your team having to train someone from scratch.

Would you be open to a quick call?

Best,
Cody Barbour
Hargen Energy`,
  },

  // ─── LINKEDIN CONNECTION ───────────────────────────────────────────────────

  {
    id: "linkedin-connection-a",
    category: "LINKEDIN_CONNECTION",
    categoryLabel: "LinkedIn Connection",
    versionLabel: "Short Connection",
    channel: "LINKEDIN",
    body: `{greeting}

I'm Cody Barbour with Hargen Energy. I help residential solar contractors with permit follow-up, utility/PTO items, customer updates, CRM cleanup, and project follow-through. Thought it would be good to connect.`,
  },

  {
    id: "linkedin-connection-b",
    category: "LINKEDIN_CONNECTION",
    categoryLabel: "LinkedIn Connection",
    versionLabel: "No First Name Fallback",
    channel: "LINKEDIN",
    body: `Hi team,

I'm Cody Barbour with Hargen Energy. I help residential solar contractors with permit follow-up, utility/PTO items, customer updates, CRM cleanup, and project follow-through. Thought it would be good to connect.`,
  },

  {
    id: "linkedin-connection-c",
    category: "LINKEDIN_CONNECTION",
    categoryLabel: "LinkedIn Connection",
    versionLabel: "Experienced Tone",
    channel: "LINKEDIN",
    body: `{greeting}

I work with residential solar contractors on the operations side: permits, utility/PTO follow-up, CRM cleanup, customer updates, and open-item tracking. I'm Cody Barbour with Hargen Energy. Would be good to connect.`,
  },

  // ─── LINKEDIN FOLLOW-UP ───────────────────────────────────────────────────

  {
    id: "linkedin-followup-a",
    category: "LINKEDIN_FOLLOW_UP",
    categoryLabel: "LinkedIn Follow-Up After Connection",
    versionLabel: "Soft Follow-up",
    channel: "LINKEDIN",
    body: `{greeting}

Thanks for connecting. I run Hargen Energy, where I help residential solar contractors with the back-office work that sits between sales, install, inspection, and PTO.

Most of the support is around permit follow-up, utility/interconnection items, customer updates, CRM cleanup, missing documents, and open-item tracking.

If your team ever needs overflow solar ops support without hiring another full-time person, I'd be happy to talk.

Best,
Cody Barbour
Hargen Energy`,
  },

  {
    id: "linkedin-followup-b",
    category: "LINKEDIN_FOLLOW_UP",
    categoryLabel: "LinkedIn Follow-Up After Connection",
    versionLabel: "Direct but Not Pushy",
    channel: "LINKEDIN",
    body: `{greeting}

Appreciate the connection. Quick context: Hargen Energy helps residential solar contractors keep jobs moving between milestones — permits, utility/PTO follow-up, corrections, customer updates, CRM cleanup, and closeout tracking.

It is meant to support your existing process, not replace your systems or add more software.

If that is ever useful for your team, I'd be open to a quick conversation.

Best,
Cody Barbour
Hargen Energy`,
  },

  // ─── FOLLOW-UP EMAIL — 3 DAYS ─────────────────────────────────────────────

  {
    id: "followup-3day-a",
    category: "FOLLOW_UP_3_DAY",
    categoryLabel: "Follow-Up Email — 3 Days",
    versionLabel: "Simple Follow-up",
    channel: "EMAIL",
    subject: "Quick follow-up / {companyName}",
    body: `{greeting}

Just following up on my note about Hargen Energy.

I help residential solar contractors with the back-office project work that often piles up around active jobs: permit follow-up, utility/interconnection/PTO items, customer updates, CRM cleanup, missing documents, and closeout tracking.

If there is nothing you need help with right now, no problem. But if your team has open items that keep getting pushed behind sales, installs, or customer calls, I'd be happy to see if Hargen could help.

{signature}`,
  },

  {
    id: "followup-3day-b",
    category: "FOLLOW_UP_3_DAY",
    categoryLabel: "Follow-Up Email — 3 Days",
    versionLabel: "Lower-Pressure",
    channel: "EMAIL",
    subject: "Re: Solar ops support for {companyName}",
    body: `{greeting}

I wanted to follow up once in case this is relevant.

Hargen Energy is built for solar contractors that need practical operations support without hiring another full-time person. The work can be simple but important: following up on permits, checking utility/PTO status, cleaning up CRM records, requesting missing documents, keeping customers updated, and tracking closeout items.

If this is not a priority right now, I understand. If it is something your team could use occasionally, I'd be open to a short call.

{signature}`,
  },

  {
    id: "followup-3day-c",
    category: "FOLLOW_UP_3_DAY",
    categoryLabel: "Follow-Up Email — 3 Days",
    versionLabel: "Pain-Point-Specific",
    channel: "EMAIL",
    subject: "Permit, utility, and open-item follow-up",
    body: `{greeting}

Quick follow-up here.

The main reason I reached out is that solar jobs often do not get delayed by the install itself. They get slowed down by everything around it: permit corrections, utility follow-up, missing documents, customer updates, CRM cleanup, inspection scheduling, and PTO closeout.

That is the type of work Hargen Energy helps cover for residential solar contractors.

Would it make sense to talk for 10–15 minutes next week?

{signature}`,
  },

  // ─── FOLLOW-UP EMAIL — 7 TO 10 DAYS / BREAKUP ────────────────────────────

  {
    id: "followup-7day-a",
    category: "FOLLOW_UP_7_DAY",
    categoryLabel: "Follow-Up Email — 7 to 10 Days / Breakup",
    versionLabel: "Professional Close-out",
    channel: "EMAIL",
    subject: "Should I close this out?",
    body: `{greeting}

I do not want to keep following up if this is not relevant.

Hargen Energy helps residential solar contractors with overflow operations work: permit follow-up, utility/interconnection/PTO items, customer updates, CRM cleanup, document organization, and open-item tracking.

If your team has this covered, no problem. If you ever need extra solar ops support without hiring full-time, feel free to reach out.

{signature}`,
  },

  {
    id: "followup-7day-b",
    category: "FOLLOW_UP_7_DAY",
    categoryLabel: "Follow-Up Email — 7 to 10 Days / Breakup",
    versionLabel: "Softer Close-out",
    channel: "EMAIL",
    subject: "Last note from me",
    body: `{greeting}

Last note from me for now.

I reached out because Hargen Energy helps residential solar contractors with the follow-through work that can pile up between contract, install, inspection, utility approval, and PTO.

If your team ever needs help with permits, utility items, customer updates, CRM cleanup, missing documents, or closeout tracking, I'd be happy to talk.

Either way, wishing your team a strong year.

{signature}`,
  },

  // ─── PAIN-SPECIFIC: PERMITS / CORRECTIONS ────────────────────────────────

  {
    id: "pain-permits-a",
    category: "PAIN_PERMITS",
    categoryLabel: "Pain-Specific — Permits / Corrections",
    versionLabel: "Permit Corrections",
    channel: "EMAIL",
    subject: "Permit follow-up and correction support",
    body: `{greeting}

I'm Cody Barbour with Hargen Energy. I help residential solar contractors with the back-office work around active projects, especially permit follow-up, corrections, missing documents, and resubmittal tracking.

Permit work can look simple from the outside, but the real issue is usually follow-through: checking status, catching correction notes, getting the right documents together, keeping the customer updated, and making sure the job does not sit longer than it needs to.

My background is residential solar operations, so I understand the difference between a clean submittal, a correction cycle, and an AHJ that needs careful follow-up.

Would it be worth a quick call to see if your team could use support in this area?

{signature}`,
  },

  // ─── PAIN-SPECIFIC: UTILITY / PTO ────────────────────────────────────────

  {
    id: "pain-utility-pto-a",
    category: "PAIN_UTILITY_PTO",
    categoryLabel: "Pain-Specific — Utility / PTO",
    versionLabel: "Utility / PTO",
    channel: "EMAIL",
    subject: "Utility and PTO follow-through support",
    body: `{greeting}

I'm Cody Barbour with Hargen Energy. I help residential solar contractors with the follow-through work around utility applications, interconnection status, PTO items, customer updates, and closeout tracking.

Utility work can be frustrating because the job may be installed, but the customer is still waiting on the final steps. That is where consistent follow-up, clean documentation, and clear communication matter.

Hargen can help cover that work inside your existing process so your internal team is not constantly chasing open utility items while also handling sales, installs, and customers.

Would you be open to a short call next week?

{signature}`,
  },

  // ─── PAIN-SPECIFIC: CRM CLEANUP / ADMIN OVERLOAD ─────────────────────────

  {
    id: "pain-crm-cleanup-a",
    category: "PAIN_CRM_CLEANUP",
    categoryLabel: "Pain-Specific — CRM Cleanup / Admin Overload",
    versionLabel: "CRM Cleanup",
    channel: "EMAIL",
    subject: "Solar CRM cleanup and open-item support",
    body: `{greeting}

I'm Cody Barbour with Hargen Energy. I help residential solar contractors clean up and manage the back-office project details that are easy to fall behind on when the team is busy.

That can include CRM cleanup, missing documents, customer update notes, permit status, utility/PTO tracking, inspection follow-up, and open-item lists across active jobs.

The goal is not to replace your process. It is to help your team keep the job information clean enough that nothing important gets missed.

Would it be worth a quick conversation to see if this would help your team?

{signature}`,
  },

  // ─── PAIN-SPECIFIC: CUSTOMER COMMUNICATION ───────────────────────────────

  {
    id: "pain-customer-communication-a",
    category: "PAIN_CUSTOMER_COMMUNICATION",
    categoryLabel: "Pain-Specific — Customer Communication",
    versionLabel: "Customer Communication",
    channel: "EMAIL",
    subject: "Customer update support for solar projects",
    body: `{greeting}

I'm Cody Barbour with Hargen Energy. I help residential solar contractors with project follow-through and customer communication around active jobs.

A lot of customer frustration comes from not knowing what is happening between milestones: permit review, corrections, inspection scheduling, utility approval, PTO, or missing documents. Hargen can help keep those updates organized and moving so your team is not constantly pulled away from sales and installs.

My background is residential solar operations, so I understand the job flow and the importance of giving customers clear updates without overpromising.

Would you be open to a quick call next week?

{signature}`,
  },
];
