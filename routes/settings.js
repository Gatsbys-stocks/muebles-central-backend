const express = require("express");
const router = express.Router();
const { getSettings, updateSettings } = require("../lib/settings");
const { requireAdmin } = require("../lib/auth");

// GET /api/settings — público: la tienda muestra horario, teléfonos, redes y zonas de envío.
router.get("/", (req, res) => {
  const s = getSettings();
  res.json({ ...s, payments: { card: Boolean(process.env.STRIPE_SECRET_KEY), cashOnDelivery: s.delivery.cashOnDelivery !== false } });
});

// PUT /api/settings (admin) — el dueño cambia horario, Instagram, precios de envío...
router.put("/", requireAdmin, (req, res) => {
  try {
    res.json(updateSettings(req.body || {}));
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "No se pudieron guardar los ajustes." });
  }
});

module.exports = router;
