const express = require("express");
const router = express.Router();
const { stripe } = require("../lib/stripe");
const { getOrder, updateOrder } = require("../lib/store");
const { paymentConfirmedEmail } = require("../lib/email");

// Montado con express.raw() en server.js, antes del express.json() global.
// No añadir express.json() aquí o la firma de Stripe no cuadra.
router.post("/", (req, res) => {
  if (!stripe) return res.status(500).send("Stripe no configurado");
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Firma del webhook de Stripe no válida:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata && session.metadata.order_id;
    const order = orderId && getOrder(orderId);
    // Stripe puede reenviar el mismo evento: solo se marca y se avisa una vez.
    if (order && order.payment_status !== "pagado") {
      const updated = updateOrder(orderId, {
        payment_status: "pagado",
        status: "pagado",
        payment: {
          stripe_session_id: session.id,
          amount_total: session.amount_total / 100,
          currency: session.currency,
          paid_at: new Date().toISOString(),
        },
      });
      paymentConfirmedEmail(updated).catch((e) => console.error("email de pago falló", e));
    }
  }

  res.json({ received: true });
});

module.exports = router;
