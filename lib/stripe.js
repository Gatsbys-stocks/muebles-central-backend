const Stripe = require("stripe");

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Una línea por producto, más montaje y envío si los hay. El cliente paga
// en la página de Stripe: los datos de la tarjeta no pasan por el servidor.
async function createCheckoutSession(order, { successUrl, cancelUrl }) {
  if (!stripe) throw new Error("STRIPE_SECRET_KEY no configurada");

  const line_items = order.items.map((it) => ({
    price_data: {
      currency: "eur",
      product_data: { name: it.color ? `${it.name} · ${it.color}` : it.name },
      unit_amount: Math.round(it.price * 100),
    },
    quantity: it.qty,
  }));

  if (order.assembly_total > 0) {
    line_items.push({
      price_data: { currency: "eur", product_data: { name: "Montaje en casa" }, unit_amount: Math.round(order.assembly_total * 100) },
      quantity: 1,
    });
  }

  if (order.shipping.amount > 0) {
    line_items.push({
      price_data: { currency: "eur", product_data: { name: order.shipping.label }, unit_amount: Math.round(order.shipping.amount * 100) },
      quantity: 1,
    });
  }

  return stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: order.customer.email || undefined,
    line_items,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { order_id: order.id },
  });
}

module.exports = { stripe, createCheckoutSession };
