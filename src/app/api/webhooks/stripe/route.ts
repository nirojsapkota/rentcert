import { handleStripeWebhook } from "@/server/billing/webhook";

// Stripe webhook. The raw body is needed for signature verification.
export async function POST(request: Request) {
  const result = await handleStripeWebhook(await request.text(), request.headers.get("stripe-signature"));
  return new Response(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
}
