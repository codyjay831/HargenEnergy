import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { PlanType } from "@/generated/prisma/client";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const PLAN_HOURS = {
  [PlanType.LIGHT]: 2,
  [PlanType.CORE]: 5,
  [PlanType.PRIORITY]: 10,
  [PlanType.CUSTOM]: 0,
};

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature") as string;

  if (!WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not set.");
    return new NextResponse("Webhook Configuration Error", { status: 500 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const subscriptionId = session.subscription as string;
        const clientId = session.metadata?.clientId;
        const planType = session.metadata?.planType as PlanType;

        if (clientId) {
          await prisma.client.update({
            where: { id: clientId },
            data: {
              stripeSubscriptionId: subscriptionId,
              subscriptionStatus: "active",
              planType: planType || PlanType.LIGHT,
              weeklyHours: planType ? PLAN_HOURS[planType] : 2,
            },
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription & { current_period_end: number };
        const clientId = subscription.metadata?.clientId;
        const planType = subscription.metadata?.planType as PlanType;

        if (clientId) {
          await prisma.client.update({
            where: { id: clientId },
            data: {
              stripeSubscriptionId: subscription.id,
              subscriptionStatus: subscription.status,
              subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
              planType: planType || undefined,
              weeklyHours: planType ? PLAN_HOURS[planType] : undefined,
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const clientId = subscription.metadata?.clientId;

        if (clientId) {
          await prisma.client.update({
            where: { id: clientId },
            data: {
              subscriptionStatus: "canceled",
              planType: PlanType.LIGHT, // Reset to light or keep as is?
              weeklyHours: 0,
            },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await prisma.client.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            subscriptionStatus: "past_due",
          },
        });
        break;
      }
    }

    return new NextResponse(null, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook handler failed: ${message}`);
    return new NextResponse(`Webhook Error: ${message}`, { status: 500 });
  }
}
