"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { PlanType } from "@prisma/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";

const PRICE_IDS = {
  [PlanType.LIGHT]: process.env.STRIPE_LIGHT_PRICE_ID,
  [PlanType.CORE]: process.env.STRIPE_CORE_PRICE_ID,
  [PlanType.PRIORITY]: process.env.STRIPE_PRIORITY_PRICE_ID,
  [PlanType.CUSTOM]: null,
};

export async function createCheckoutSession(clientId: string, planType: PlanType) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized. Admin access required.");
  }

  const stripe = getStripe();

  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    throw new Error("Client not found.");
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
    cancel_url: `${APP_URL}/admin/clients/${client.id}`,
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
