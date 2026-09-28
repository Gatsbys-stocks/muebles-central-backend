// Datos de la tienda (horario, redes, teléfonos) y reglas de entrega, en
// data/settings.json. El dueño los cambia desde el panel de admin.
const { readJson, writeJson } = require("./db");

const FILE = "settings.json";

function getSettings() {
  return readJson(FILE, { shop: {}, delivery: { zones: [] } });
}

// Solo se aceptan las claves conocidas, para que el panel no pueda meter
// basura en el archivo.
function updateSettings(patch) {
  const current = getSettings();
  const next = { shop: { ...current.shop }, delivery: { ...current.delivery } };

  if (patch.shop) {
    for (const k of ["name", "tagline", "address", "city", "whatsapp", "email", "hours", "tiktok", "instagram"]) {
      if (patch.shop[k] !== undefined) next.shop[k] = String(patch.shop[k]).trim().replace(/^@/, "");
    }
    if (Array.isArray(patch.shop.phones)) {
      next.shop.phones = patch.shop.phones.map((p) => String(p).replace(/\s+/g, "")).filter(Boolean);
    }
  }

  if (patch.delivery) {
    const d = patch.delivery;
    if (d.pickupEnabled !== undefined) next.delivery.pickupEnabled = Boolean(d.pickupEnabled);
    if (d.cashOnDelivery !== undefined) next.delivery.cashOnDelivery = Boolean(d.cashOnDelivery);
    if (d.freeShippingFrom !== undefined) {
      next.delivery.freeShippingFrom = d.freeShippingFrom === null || d.freeShippingFrom === "" ? null : Number(d.freeShippingFrom);
    }
    if (Array.isArray(d.zones)) {
      next.delivery.zones = d.zones.map((z) => ({
        id: String(z.id),
        label: String(z.label),
        ranges: (z.ranges || []).map((r) => [String(r[0]), String(r[1])]),
        price: Number(z.price) || 0,
      }));
    }
  }

  writeJson(FILE, next);
  return next;
}

module.exports = { getSettings, updateSettings };
