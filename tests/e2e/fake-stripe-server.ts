import { createServer, type Server } from "node:http";

// A minimal stand-in for the Stripe API, used only by end-to-end tests.
// The app talks to it through STRIPE_API_HOST/PORT/PROTOCOL; tests control it via /__ routes.
export const FAKE_STRIPE_PORT = 12111;

type Session = { id: string; customer: string; client_reference_id: string; price: string };

export function startFakeStripe(appUrl: string): Promise<Server> {
  const sessions: Session[] = [];
  const subscriptions = new Map<string, { customer: string; status: string; price: string }>();
  let counter = 0;

  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    const form = new URLSearchParams(body);
    const url = new URL(request.url ?? "/", "http://localhost");
    const json = (status: number, value: unknown) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(value));
    };

    if (request.method === "POST" && url.pathname === "/v1/customers") return json(200, { id: `cus_e2e_${++counter}`, object: "customer" });
    if (request.method === "POST" && url.pathname === "/v1/checkout/sessions") {
      const session = {
        id: `cs_e2e_${++counter}`,
        customer: form.get("customer") ?? "",
        client_reference_id: form.get("client_reference_id") ?? "",
        price: form.get("line_items[0][price]") ?? "",
      };
      sessions.push(session);
      // A real Checkout page would take payment here; the fake sends the browser straight back.
      return json(200, { ...session, object: "checkout.session", url: `${appUrl}/billing?checkout=success` });
    }
    if (request.method === "POST" && url.pathname === "/v1/billing_portal/sessions") return json(200, { url: `${appUrl}/billing` });
    const subscription = url.pathname.match(/^\/v1\/subscriptions\/([\w-]+)$/);
    if (request.method === "GET" && subscription) {
      const state = subscriptions.get(subscription[1]);
      if (!state) return json(404, { error: { message: "No such subscription" } });
      return json(200, {
        id: subscription[1],
        object: "subscription",
        customer: state.customer,
        status: state.status,
        cancel_at_period_end: false,
        trial_end: null,
        items: { object: "list", data: [{ price: { id: state.price }, current_period_start: 1_790_000_000, current_period_end: 1_792_592_000 }] },
      });
    }
    if (request.method === "GET" && url.pathname === "/__sessions") {
      return json(200, sessions.filter((session) => session.client_reference_id === url.searchParams.get("user")));
    }
    if (request.method === "POST" && url.pathname === "/__subscriptions") {
      const input = JSON.parse(body);
      subscriptions.set(input.id, { customer: input.customer, status: input.status, price: input.price });
      return json(200, { ok: true });
    }
    json(404, { error: { message: `Fake Stripe has no route for ${request.method} ${url.pathname}` } });
  });
  return new Promise((resolve) => server.listen(FAKE_STRIPE_PORT, () => resolve(server)));
}
