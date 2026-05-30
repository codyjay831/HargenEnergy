"use server";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { EngagementType, PlanType } from "@/generated/prisma/client";
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

  if (client.engagementType !== EngagementType.SUPPORT_BLOCK) {
    throw new Error(
      "Stripe checkout is only available for Support Block clients. Request-Based Work clients are priced per request after review.",
    );
  }

  const priceId = PRICE_IDS[planType];

  if (!priceId) {
    throw new Error(`No Stripe Price ID configured for plan type: ${planType}`);
  }

  // 1. Create or retrieve Stripe customer
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
    
    await prisma.client.update({
      where: { id: client.id },
      data: { stripeCustomerId },
    });
  }

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

  if (client.engagementType !== EngagementType.SUPPORT_BLOCK) {
    throw new Error(
      "Subscription billing is not used for Request-Based Work accounts. Pricing is confirmed per request.",
    );
  }

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
