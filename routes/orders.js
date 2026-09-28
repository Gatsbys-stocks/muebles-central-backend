const express = require("express");
const router = express.Router();
const { nanoid } = require("nanoid");
const { addOrder, readAll, getOrder, updateOrder } = require("../lib/store");
const { priceCart, PricingError } = require("../lib/pricing");
const { getSettings } = require("../lib/settings");
const { notifyShopOfNewOrder, confirmToCustomer } = require("../lib/email");
const { createCheckoutSession } = require("../lib/stripe");
const { requireAdmin } = require("../lib/auth");

const STATUSES = ["nuevo", "confirmado", "pagado", "en_reparto", "entregado", "cancelado"];
const clean = (v, max = 200) => String(v || "").trim().slice(0, max);

// POST /api/orders
// body: {
//   customer: { name, phone, email },
//   delivery: { method: "envio"|"recogida", street, floor, zip, city },
//   items: [{ id, qty, color, assembly }],
//   payment_method: "tarjeta" | "entrega",
//   notes
// }
router.post("/", (req, res) => {
  try {
    const { customer = {}, delivery = {}, items, payment_method, notes } = req.body || {};

    if (!clean(customer.name) || !clean(customer.phone)) {
      return res.status(400).json({ error: "Escribe tu nombre y un teléfono de contacto." });
    }
    if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      return res.status(400).json({ error: "El email no parece correcto." });
    }
    const method = delivery.method === "recogida" ? "recogida" : "envio";
    if (method === "envio" && (!clean(delivery.street) || !clean(delivery.zip) || !clean(delivery.city))) {
      return res.status(400).json({ error: "Falta la dirección de entrega (calle, código postal y ciudad)." });
    }

    const settings = getSettings();
    const pay = payment_method === "tarjeta" ? "tarjeta" : "entrega";
    if (pay === "tarjeta" && !process.env.STRIPE_SECRET_KEY) {
      return res.status(400).json({ error: "El pago con tarjeta aún no está activo. Elige pagar en la entrega." });
    }
    if (pay === "entrega" && settings.delivery.cashOnDelivery === false) {
      return res.status(400).json({ error: "El pago en la entrega no está disponible." });
    }

    const priced = priceCart(items, { method, zip: delivery.zip });

    const order = {
      id: "MC-" + nanoid(6).toUpperCase().replace(/[-_]/g, "X"),
      created_at: new Date().toISOString(),
      status: "nuevo",
      payment_method: pay,
      payment_status: "pendiente",
      payment: null,
      customer: { name: clean(customer.name, 80), phone: clean(customer.phone, 30), email: clean(customer.email, 120) },
      address:
        method === "envio"
          ? { street: clean(delivery.street), floor: clean(delivery.floor, 60), zip: clean(delivery.zip, 10), city: clean(delivery.city, 80) }
          : null,
      items: priced.lines,
      items_total: priced.items_total,
      assembly_total: priced.assembly_total,
      shipping: priced.shipping,
      total: priced.total,
      notes: clean(notes, 1000),
    };

    addOrder(order);
    notifyShopOfNewOrder(order).catch((e) => console.error("email a la tienda falló", e));
    confirmToCustomer(order).catch((e) => console.error("email al cliente falló", e));

    res.status(201).json({ order_id: order.id, total: order.total, payment_method: order.payment_method });
  } catch (err) {
    if (err instanceof PricingError) return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "No se pudo crear el pedido." });
  }
});

// POST /api/orders/:id/checkout — crea la sesión de Stripe y devuelve la URL de pago.
router.post("/:id/checkout", async (req, res) => {
  try {
    const order = getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "Pedido no encontrado." });
    if (order.payment_status === "pagado") return res.status(400).json({ error: "Este pedido ya está pagado." });
    if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: "El pago con tarjeta no está configurado todavía." });

    const base = process.env.STORE_URL || "https://example.com";
    const session = await createCheckoutSession(order, {
      successUrl: `${base}?payment=success&order=${order.id}`,
      cancelUrl: `${base}?payment=cancelled&order=${order.id}`,
    });
    updateOrder(order.id, { stripe_session_id: session.id });
    res.json({ checkout_url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudo iniciar el pago.", detail: String(err.message || err) });
  }
});

// GET /api/orders (admin)
router.get("/", requireAdmin, (req, res) => res.json(readAll()));

// PATCH /api/orders/:id (admin) — cambia el estado o apunta el día de entrega.
// body: { status?, delivery_date?, admin_notes?, payment_status? }
router.patch("/:id", requireAdmin, (req, res) => {
  const { status, delivery_date, admin_notes, payment_status } = req.body || {};
  const patch = {};
  if (status !== undefined) {
    if (!STATUSES.includes(status)) return res.status(400).json({ error: "Estado no válido." });
    patch.status = status;
  }
  if (delivery_date !== undefined) patch.delivery_date = clean(delivery_date, 40);
  if (admin_notes !== undefined) patch.admin_notes = clean(admin_notes, 1000);
  if (payment_status !== undefined) {
    if (!["pendiente", "pagado"].includes(payment_status)) return res.status(400).json({ error: "Estado de pago no válido." });
    patch.payment_status = payment_status;
  }
  const updated = updateOrder(req.params.id, patch);
  if (!updated) return res.status(404).json({ error: "Pedido no encontrado." });
  res.json(updated);
});

module.exports = router;
