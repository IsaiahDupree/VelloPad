import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { handleCheckoutSuccess, handleCheckoutFailure } from "@/lib/stripe/checkout";
import { logWebhookEvent } from "@/lib/audit";
import {
  syncSubscription,
  handleSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
} from "@/lib/stripe/subscription-sync";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature")!;
  const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || undefined;
  const userAgent = headersList.get("user-agent") || undefined;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);

    // Log failed webhook verification
    await logWebhookEvent({
      provider: 'stripe',
      eventType: 'signature_verification_failed',
      payload: { error: err instanceof Error ? err.message : 'Unknown error' },
      status: 'failure',
      errorMessage: err instanceof Error ? err.message : 'Signature verification failed',
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    let orderId: string | undefined;
    let processingError: Error | undefined;

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        try {
          // BS-502: Handle successful checkout
          await handleCheckoutSuccess(session.id);
          console.log("✅ Checkout completed:", session.id);
          orderId = session.metadata?.orderId;
        } catch (err) {
          processingError = err instanceof Error ? err : new Error('Unknown error');
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        try {
          // BS-502: Handle expired checkout
          await handleCheckoutFailure(session.id);
          console.log("❌ Checkout expired:", session.id);
          orderId = session.metadata?.orderId;
        } catch (err) {
          processingError = err instanceof Error ? err : new Error('Unknown error');
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        // Handle successful payment
        console.log("Payment succeeded:", paymentIntent.id);
        orderId = paymentIntent.metadata?.orderId;
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        // Handle failed payment
        // - Notify user
        // - Update order status
        console.log("Payment failed:", paymentIntent.id);
        orderId = paymentIntent.metadata?.orderId;
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        try {
          // GDP-007, GDP-008: Sync subscription to Growth Data Plane
          await syncSubscription(subscription);
          console.log("✅ Subscription synced:", event.type, subscription.id);
        } catch (err) {
          processingError = err instanceof Error ? err : new Error('Unknown error');
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        try {
          // GDP-007, GDP-008: Handle subscription cancellation
          await handleSubscriptionDeleted(subscription);
          console.log("✅ Subscription deleted:", subscription.id);
        } catch (err) {
          processingError = err instanceof Error ? err : new Error('Unknown error');
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        try {
          // GDP-007, GDP-008: Track revenue and update person features
          await handleInvoicePaid(invoice);
          console.log("✅ Invoice paid:", invoice.id);
        } catch (err) {
          processingError = err instanceof Error ? err : new Error('Unknown error');
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        try {
          // GDP-007: Log payment failure event
          await handleInvoicePaymentFailed(invoice);
          console.log("⚠️ Invoice payment failed:", invoice.id);
        } catch (err) {
          processingError = err instanceof Error ? err : new Error('Unknown error');
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // BS-902: Log webhook event with PII redaction
    await logWebhookEvent({
      provider: 'stripe',
      eventType: event.type,
      orderId,
      payload: event as unknown as Record<string, any>,
      status: processingError ? 'failure' : 'success',
      errorMessage: processingError?.message,
      ipAddress,
      userAgent,
    });

    if (processingError) {
      throw processingError;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Error processing webhook:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
