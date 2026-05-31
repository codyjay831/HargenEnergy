"use server";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import {
  BillingMode,
  EngagementType,
  PricingMode,
  OverageInvoiceStatus,
  RequestPaymentStatus,
} from "@/generated/prisma/client";
import { requireClientUser, requireStaff } from "@/lib/auth-guards";
import { resolveClientRole } from "@/lib/permissions";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
const STRIPE_SUPPORT_PRODUCT_ID = process.env.STRIPE_SUPPORT_PRODUCT_ID?.trim();
const WEEKS_PER_MONTH = 52 / 12;

function assertSupportBlockEngagement(engagementType: EngagementType): void {
  if (engagementType !== EngagementType.SUPPORT_BLOCK) {
    throw new Error(
      "Stripe checkout is only available for Support Block clients. Fixed-Fee accounts are billed per request.",
    );
  }
}

function assertPrepaidInputs(client: {
  weeklyHours: number;
  hourlyRateCents: number | null;
}) {
  if (!Number.isFinite(client.weeklyHours) || client.weeklyHours <= 0) {
    throw new Error("Set weekly hours before creating prepaid billing.");
  }
  if (!client.hourlyRateCents || client.hourlyRateCents <= 0) {
    throw new Error("Set an hourly rate before creating prepaid billing.");
  }
}

function calculateMonthlyPrepaidAmountCents(weeklyHours: number, hourlyRateCents: number): number {
  return Math.round(weeklyHours * hourlyRateCents * WEEKS_PER_MONTH);
}

function buildSupportBlockLineItem(client: {
  weeklyHours: number;
  hourlyRateCents: number;
  companyName: string;
}) {
  const amount = calculateMonthlyPrepaidAmountCents(client.weeklyHours, client.hourlyRateCents);
  if (amount <= 0) {
    throw new Error("Calculated prepaid amount is invalid.");
  }

  const recurring = { interval: "month" as const };
  if (STRIPE_SUPPORT_PRODUCT_ID) {
    return {
      price_data: {
        currency: "usd",
        unit_amount: amount,
        recurring,
        product: STRIPE_SUPPORT_PRODUCT_ID,
      },
      quantity: 1,
    };
  }

  return {
    price_data: {
      currency: "usd",
      unit_amount: amount,
      recurring,
      product_data: {
        name: `${client.companyName} - Prepaid Support Block`,
        description: `${client.weeklyHours} reserved hours per week`,
      },
    },
    quantity: 1,
  };
}

async function ensureStripeCustomer(client: {
  id: string;
  email: string;
  contactName: string;
  companyName: string;
  stripeCustomerId: string | null;
  billingMode: BillingMode;
}) {
  const stripe = getStripe();
  let stripeCustomerId = client.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: client.email,
      name: client.contactName,
      metadata: {
        clientId: client.id,
        companyName: client.companyName,
      },
    });
    stripeCustomerId = customer.id;
  }

  await prisma.client.update({
    where: { id: client.id },
    data: {
      stripeCustomerId,
      billingMode: BillingMode.STRIPE,
      billingOverrideReason: null,
      billingOverrideExpiresAt: null,
      billingOverrideCreatedAt: null,
      billingOverrideCreatedById: null,
    },
  });

  return { stripe, stripeCustomerId };
}

export async function createCheckoutSession(clientId: string) {
  await requireStaff("billing.manage");

  const stripe = getStripe();

  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    throw new Error("Client not found.");
  }

  assertSupportBlockEngagement(client.engagementType);
  assertPrepaidInputs(client);
  const { stripeCustomerId } = await ensureStripeCustomer(client);

  // 2. Create Checkout Session
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    line_items: [
      buildSupportBlockLineItem({
        weeklyHours: client.weeklyHours,
        hourlyRateCents: client.hourlyRateCents as number,
        companyName: client.companyName,
      }),
    ],
    mode: "subscription",
    success_url: `${APP_URL}/admin/clients/${client.id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/admin/clients/${client.id}?tab=billing`,
    metadata: {
      clientId: client.id,
      weeklyHours: String(client.weeklyHours),
      hourlyRateCents: String(client.hourlyRateCents),
    },
    subscription_data: {
      metadata: {
        clientId: client.id,
        weeklyHours: String(client.weeklyHours),
        hourlyRateCents: String(client.hourlyRateCents),
      },
    },
  });

  if (!checkoutSession.url) {
    throw new Error("Failed to create checkout session URL.");
  }

  return { url: checkoutSession.url };
}

export async function createClientBillingPortalSession() {
  const session = await requireClientUser("billing.view");
  if (resolveClientRole(session.user.clientRole ?? null) !== "OWNER") {
    throw new Error("Forbidden. Owner access required.");
  }
  const clientId = session.user.clientId;
  if (!clientId) {
    throw new Error("Unauthorized. Client access required.");
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    throw new Error("Client not found.");
  }

  assertSupportBlockEngagement(client.engagementType);

  if (!client.stripeCustomerId) {
    throw new Error("Billing is not configured for this account yet.");
  }

  const stripe = getStripe();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: client.stripeCustomerId,
    return_url: `${APP_URL}/portal/account`,
  });

  if (!portalSession.url) {
    throw new Error("Failed to create billing portal session.");
  }

  return { url: portalSession.url };
}

export async function createClientCheckoutSession() {
  const session = await requireClientUser("billing.view");
  if (resolveClientRole(session.user.clientRole ?? null) !== "OWNER") {
    throw new Error("Forbidden. Owner access required.");
  }

  const clientId = session.user.clientId;
  if (!clientId) {
    throw new Error("Unauthorized. Client access required.");
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    throw new Error("Client not found.");
  }

  assertSupportBlockEngagement(client.engagementType);
  assertPrepaidInputs(client);
  const { stripe, stripeCustomerId } = await ensureStripeCustomer(client);

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    line_items: [
      buildSupportBlockLineItem({
        weeklyHours: client.weeklyHours,
        hourlyRateCents: client.hourlyRateCents as number,
        companyName: client.companyName,
      }),
    ],
    mode: "subscription",
    success_url: `${APP_URL}/portal/account?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/portal/account?checkout=cancelled#support-setup`,
    metadata: {
      clientId: client.id,
      weeklyHours: String(client.weeklyHours),
      hourlyRateCents: String(client.hourlyRateCents),
    },
    subscription_data: {
      metadata: {
        clientId: client.id,
        weeklyHours: String(client.weeklyHours),
        hourlyRateCents: String(client.hourlyRateCents),
      },
    },
  });

  if (!checkoutSession.url) {
    throw new Error("Failed to create checkout session URL.");
  }

  return { url: checkoutSession.url };
}

export async function createRequestPaymentCheckoutSession(requestId: string) {
  await requireStaff("billing.manage");

  const request = await prisma.supportRequest.findUnique({
    where: { id: requestId },
    include: {
      client: true,
    },
  });

  if (!request) {
    throw new Error("Request not found.");
  }

  if (request.client.engagementType !== EngagementType.REQUEST_BASED) {
    throw new Error("Fixed-Fee checkout is only available for Fixed-Fee requests.");
  }

  if (request.pricingMode !== PricingMode.FLAT || !request.flatPriceCents) {
    throw new Error("Set a valid fixed fee before creating a payment link.");
  }

  const { stripe, stripeCustomerId } = await ensureStripeCustomer(request.client);

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: request.flatPriceCents,
          product_data: {
            name: `${request.client.companyName} - ${request.title}`,
            description: "Fixed-Fee service payment",
          },
        },
      },
    ],
    success_url: `${APP_URL}/admin/requests/${request.id}?payment=success`,
    cancel_url: `${APP_URL}/admin/requests/${request.id}?payment=cancelled`,
    metadata: {
      clientId: request.clientId,
      requestId: request.id,
      paymentType: "fixed_fee",
    },
  });

  if (!checkoutSession.url) {
    throw new Error("Failed to create checkout session URL.");
  }

  await prisma.supportRequest.update({
    where: { id: request.id },
    data: {
      paymentStatus: RequestPaymentStatus.PENDING,
      stripeCheckoutSessionId: checkoutSession.id,
    },
  });

  return { url: checkoutSession.url };
}

export async function createOverageInvoiceDraft(input: {
  requestId: string;
  minutes: number;
  note?: string;
}) {
  await requireStaff("billing.manage");

  if (!Number.isFinite(input.minutes) || input.minutes <= 0) {
    throw new Error("Overflow minutes must be greater than zero.");
  }

  const request = await prisma.supportRequest.findUnique({
    where: { id: input.requestId },
    include: {
      client: true,
      timeEntries: {
        select: {
          minutes: true,
          billableType: true,
        },
      },
    },
  });
  if (!request) throw new Error("Request not found.");
  if (request.client.engagementType !== EngagementType.SUPPORT_BLOCK) {
    throw new Error("Overflow invoices are only valid for support block clients.");
  }
  if (request.overflowStatus !== "APPROVED") {
    throw new Error("Overflow must be approved before creating an overage invoice.");
  }
  if (!request.client.hourlyRateCents || request.client.hourlyRateCents <= 0) {
    throw new Error("Client hourly rate is required before creating an overage invoice.");
  }
  if (!request.client.stripeCustomerId) {
    throw new Error("Stripe customer is not configured for this client.");
  }

  const pendingMinutes = Math.max(
    0,
    request.timeEntries
      .filter((entry) => entry.billableType === "OVERFLOW")
      .reduce((total, entry) => total + entry.minutes, 0) - request.overageMinutesInvoiced,
  );
  if (input.minutes > pendingMinutes) {
    throw new Error("Requested overflow invoice minutes exceed uninvoiced overflow time.");
  }

  const amount = Math.round((input.minutes / 60) * request.client.hourlyRateCents);
  if (amount <= 0) {
    throw new Error("Calculated overage amount is invalid.");
  }

  const stripe = getStripe();
  await stripe.invoiceItems.create({
    customer: request.client.stripeCustomerId,
    currency: "usd",
    amount,
    description:
      input.note?.trim() ||
      `${input.minutes} overflow minutes for request "${request.title}"`,
    metadata: {
      billingType: "overflow",
      requestId: request.id,
      clientId: request.clientId,
      overflowMinutes: String(input.minutes),
      hourlyRateCents: String(request.client.hourlyRateCents),
    },
  });

  const invoice = await stripe.invoices.create({
    customer: request.client.stripeCustomerId,
    auto_advance: false,
    collection_method: "send_invoice",
    days_until_due: 7,
    metadata: {
      billingType: "overflow",
      requestId: request.id,
      clientId: request.clientId,
      overflowMinutes: String(input.minutes),
    },
  });

  await prisma.supportRequest.update({
    where: { id: request.id },
    data: {
      overageMinutesInvoiced: request.overageMinutesInvoiced + input.minutes,
      overageRateCentsSnapshot: request.client.hourlyRateCents,
      overageInvoiceStatus: OverageInvoiceStatus.DRAFT,
      stripeOverageInvoiceId: invoice.id,
      overageInvoicedAt: new Date(),
    },
  });

  return { invoiceId: invoice.id };
}

export async function sendOverageInvoice(invoiceId: string) {
  await requireStaff("billing.manage");
  if (!invoiceId?.trim()) {
    throw new Error("Invoice is required.");
  }

  const stripe = getStripe();
  const finalized = await stripe.invoices.finalizeInvoice(invoiceId);
  await stripe.invoices.sendInvoice(invoiceId);

  const requestId = finalized.metadata?.requestId;
  if (requestId) {
    await prisma.supportRequest.updateMany({
      where: { id: requestId, stripeOverageInvoiceId: invoiceId },
      data: {
        overageInvoiceStatus: OverageInvoiceStatus.OPEN,
      },
    });
  }

  return { success: true };
}
