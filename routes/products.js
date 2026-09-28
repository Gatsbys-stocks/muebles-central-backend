const express = require("express");
const multer = require("multer");
const router = express.Router();
const { readAll, getProduct, addProduct, updateProduct, deleteProduct } = require("../lib/products");
const { CATEGORIES, CATEGORY_IDS } = require("../lib/categories");
const { uploadImageBuffer, isConfigured } = require("../lib/cloudinary");
const { requireAdmin } = require("../lib/auth");

// Fotos en memoria (nunca tocan el disco) y de ahí a Cloudinary.
// 8 MB: las fotos de muebles hechas con el móvil pesan más que las de producto pequeño.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

function validate(body, { partial } = {}) {
  if (!partial) {
    if (!body.name || !String(body.name).trim()) return "Falta el nombre del producto.";
    if (body.price === undefined || body.price === "") return "Falta el precio.";
    if (!body.cat) return "Elige una categoría.";
  }
  if (body.cat !== undefined && !CATEGORY_IDS.includes(body.cat)) return "Categoría no válida.";
  for (const k of ["price", "oldPrice", "assemblyPrice"]) {
    const v = body[k];
    if (v !== undefined && v !== null && v !== "" && (isNaN(Number(v)) || Number(v) < 0)) {
      return `El campo "${k}" debe ser un número positivo.`;
    }
  }
  return null;
}

// GET /api/products — público: la tienda carga todo el catálogo al abrir.
router.get("/", (req, res) => res.json(readAll()));

// GET /api/products/categories — público.
router.get("/categories", (req, res) => res.json(CATEGORIES));

// GET /api/products/:id — público (enlace directo a una ficha).
router.get("/:id", (req, res) => {
  const p = getProduct(req.params.id);
  if (!p) return res.status(404).json({ error: "Producto no encontrado." });
  res.json(p);
});

// POST /api/products/upload-image (admin) — multipart con campo "image". Devuelve { url }.
router.post("/upload-image", requireAdmin, upload.single("image"), async (req, res) => {
  try {
    if (!isConfigured()) return res.status(500).json({ error: "Cloudinary no está configurado en el servidor." });
    if (!req.file) return res.status(400).json({ error: "No se ha recibido ninguna imagen." });
    res.json({ url: await uploadImageBuffer(req.file.buffer) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudo subir la imagen.", detail: String(err.message || err) });
  }
});

// POST /api/products (admin)
router.post("/", requireAdmin, (req, res) => {
  const error = validate(req.body);
  if (error) return res.status(400).json({ error });
  res.status(201).json(addProduct(req.body));
});

// PUT /api/products/:id (admin) — cualquier subconjunto de campos.
router.put("/:id", requireAdmin, (req, res) => {
  const error = validate(req.body, { partial: true });
  if (error) return res.status(400).json({ error });
  const updated = updateProduct(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Producto no encontrado." });
  res.json(updated);
});

// DELETE /api/products/:id (admin)
router.delete("/:id", requireAdmin, (req, res) => {
  if (!deleteProduct(req.params.id)) return res.status(404).json({ error: "Producto no encontrado." });
  res.json({ ok: true });
});

module.exports = router;
