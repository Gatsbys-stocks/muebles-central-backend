// Categorías de la tienda. El frontend y el panel de admin las piden a
// GET /api/products/categories, así que solo se definen aquí.
const CATEGORIES = [
  { id: "sofas", label: "Sofás", subs: ["Sofás", "Sofás cama", "Chaise longue", "Rinconeras"] },
  { id: "dormitorio", label: "Dormitorio", subs: ["Camas", "Colchones", "Cómodas / Cajoneras", "Tocadores", "Mesitas de noche"] },
  { id: "comedor", label: "Comedor", subs: ["Mesas", "Sillas", "Muebles de comedor"] },
  { id: "salon", label: "Salón", subs: ["Muebles de TV", "Mesas de centro", "Estanterías"] },
  { id: "almacenaje", label: "Armarios y almacenaje", subs: ["Armarios", "Zapateros", "Maletas"] },
  { id: "deco", label: "Espejos y decoración", subs: ["Espejos", "Decoración"] },
  { id: "electro", label: "Electrodomésticos", subs: ["Neveras", "Lavadoras", "Cocinas", "Hornos", "Placas vitrocerámica", "Microondas", "Batidoras"] },
];

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

module.exports = { CATEGORIES, CATEGORY_IDS };
