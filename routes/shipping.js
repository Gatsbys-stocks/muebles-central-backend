const express = require("express");
const router = express.Router();
const { priceCart, PricingError } = require("../lib/pricing");

// POST /api/shipping/quote
// body: { items: [{id, qty, color, assembly}], delivery: { method: "envio"|"recogida", zip } }
// Devuelve el desglose completo (productos, montaje, envío, total) calculado en el servidor.
router.post("/quote", (req, res) => {
  try {
    const { items, delivery } = req.body || {};
    res.json(priceCart(items, delivery));
  } catch (err) {
    if (err instanceof PricingError) return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "No se pudo calcular el envío." });
  }
});

module.exports = router;
