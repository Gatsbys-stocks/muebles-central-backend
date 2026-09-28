// Calcula el total de un carrito a partir del catálogo del servidor.
// El navegador solo manda ids, cantidades y opciones; los precios salen
// siempre de aquí, así nadie puede cambiar un precio desde la consola.
const { getProduct } = require("./products");
const { getSettings } = require("./settings");

class PricingError extends Error {}

const round = (n) => Math.round(n * 100) / 100;

function findZone(zip, zones) {
  const z = String(zip || "").trim();
  if (!/^\d{5}$/.test(z)) return null;
  return zones.find((zone) => zone.ranges.some(([from, to]) => z >= from && z <= to)) || null;
}

// items: [{ id, qty, color, assembly }]
// delivery: { method: "envio" | "recogida", zip }
function priceCart(items, delivery = {}) {
  if (!Array.isArray(items) || items.length === 0) throw new PricingError("El carrito está vacío.");
  const settings = getSettings();

  const lines = items.map((it) => {
    const p = getProduct(it.id);
    if (!p) throw new PricingError("Un producto del carrito ya no está en el catálogo. Vuelve a cargar la página.");
    if (p.inStock === false) throw new PricingError(`"${p.name}" está agotado ahora mismo.`);
    const qty = Math.max(1, Math.min(20, parseInt(it.qty, 10) || 1));
    const color = p.colors && p.colors.length ? (p.colors.includes(it.color) ? it.color : p.colors[0]) : "";
    const withAssembly = Boolean(it.assembly) && Boolean(p.assembly);
    const assemblyUnit = withAssembly ? p.assemblyPrice || 0 : 0;
    return {
      id: p.id,
      name: p.name,
      color,
      qty,
      price: p.price,
      assembly: withAssembly,
      assembly_price: assemblyUnit,
      subtotal: round(p.price * qty),
      assembly_subtotal: round(assemblyUnit * qty),
      image: (p.images && p.images[0]) || null,
    };
  });

  const items_total = round(lines.reduce((s, l) => s + l.subtotal, 0));
  const assembly_total = round(lines.reduce((s, l) => s + l.assembly_subtotal, 0));

  let shipping;
  if (delivery.method === "recogida") {
    if (settings.delivery.pickupEnabled === false) throw new PricingError("La recogida en tienda no está disponible.");
    shipping = { method: "recogida", zone: null, label: "Recogida en tienda", amount: 0 };
  } else {
    const zone = findZone(delivery.zip, settings.delivery.zones || []);
    if (!zone) {
      throw new PricingError(
        "De momento no enviamos a ese código postal por la web. Escríbenos por WhatsApp y te damos precio."
      );
    }
    const free = settings.delivery.freeShippingFrom && items_total >= settings.delivery.freeShippingFrom;
    shipping = { method: "envio", zone: zone.id, label: `Envío · ${zone.label}`, amount: free ? 0 : zone.price };
  }

  // Si el cliente pide montaje y no hay envío, el montaje no aplica.
  if (shipping.method === "recogida") {
    lines.forEach((l) => { l.assembly = false; l.assembly_price = 0; l.assembly_subtotal = 0; });
  }
  const assembly = shipping.method === "recogida" ? 0 : assembly_total;

  return {
    lines,
    items_total,
    assembly_total: assembly,
    shipping,
    total: round(items_total + assembly + shipping.amount),
  };
}

module.exports = { priceCart, findZone, PricingError };
