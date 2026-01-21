import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { handleCheckoutSuccess, handleCheckoutFailure } from "@/lib/stripe/checkout";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // BS-502: Handle successful checkout
        await handleCheckoutSuccess(session.id);
        console.log("✅ Checkout completed:", session.id);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        // BS-502: Handle expired checkout
        await handleCheckoutFailure(session.id);
        console.log("❌ Checkout expired:", session.id);
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        // Handle successful payment
        console.log("Payment succeeded:", paymentIntent.id);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        // Handle failed payment
        // - Notify user
        // - Update order status
        console.log("Payment failed:", paymentIntent.id);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        // Handle subscription changes
        // - Update user plan in database
        // - Send appropriate emails
        console.log("Subscription event:", event.type, subscription.id);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        // Handle paid invoice
        console.log("Invoice paid:", invoice.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        // Handle failed invoice payment
        // - Notify user
        // - Potentially downgrade plan
        console.log("Invoice payment failed:", invoice.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
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
