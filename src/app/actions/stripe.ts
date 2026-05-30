"use server";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import {
  BillingMode,
  EngagementType,
  PlanType,
  PricingMode,
  RequestPaymentStatus,
} from "@/generated/prisma/client";
import { requireClientUser, requireStaff } from "@/lib/auth-guards";
import { resolveClientRole } from "@/lib/permissions";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";

const CHECKOUT_PLAN_TYPES: readonly PlanType[] = [
  PlanType.LIGHT,
  PlanType.CORE,
  PlanType.PRIORITY,
];

function parseCheckoutPlanType(raw: string): PlanType {
  const match = CHECKOUT_PLAN_TYPES.find((p) => p === raw);
  if (!match) {
    throw new Error("Invalid plan type.");
  }
  return match;
}

const PRICE_IDS: Record<PlanType, string | null | undefined> = {
  [PlanType.LIGHT]: process.env.STRIPE_LIGHT_PRICE_ID,
  [PlanType.CORE]: process.env.STRIPE_CORE_PRICE_ID,
  [PlanType.PRIORITY]: process.env.STRIPE_PRIORITY_PRICE_ID,
  [PlanType.CUSTOM]: null,
};

function assertSupportBlockEngagement(engagementType: EngagementType): void {
  if (engagementType !== EngagementType.SUPPORT_BLOCK) {
    throw new Error(
      "Stripe checkout is only available for Support Block clients. Fixed-Fee accounts are billed per request.",
    );
  }
}

function resolveStripePrice(planType: PlanType): string {
  const priceId = PRICE_IDS[planType];
  if (!priceId) {
    throw new Error(`No Stripe Price ID configured for plan type: ${planType}`);
  }
  return priceId;
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

export async function createCheckoutSession(clientId: string, planTypeRaw: string) {
  await requireStaff("billing.manage");

  const planType = parseCheckoutPlanType(planTypeRaw);

  const stripe = getStripe();

  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    throw new Error("Client not found.");
  }

  assertSupportBlockEngagement(client.engagementType);
  const priceId = resolveStripePrice(planType);
  const { stripeCustomerId } = await ensureStripeCustomer(client);

  // 2. Create Checkout Session
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${APP_URL}/admin/clients/${client.id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/admin/clients/${client.id}?tab=billing`,
    metadata: {
      clientId: client.id,
      planType,
    },
    subscription_data: {
      metadata: {
        clientId: client.id,
        planType,
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

  if (client.planType === PlanType.CUSTOM) {
    throw new Error(
      "This account has a custom support plan. Contact Hargen to start billing.",
    );
  }

  const priceId = resolveStripePrice(client.planType);
  const { stripe, stripeCustomerId } = await ensureStripeCustomer(client);

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${APP_URL}/portal/account?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/portal/account?checkout=cancelled#support-setup`,
    metadata: {
      clientId: client.id,
      planType: client.planType,
    },
    subscription_data: {
      metadata: {
        clientId: client.id,
        planType: client.planType,
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
