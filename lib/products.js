// Catálogo en data/products.json. Las rutas solo usan estas funciones, así
// que cambiar a una base de datos real solo toca este archivo.
const { nanoid } = require("nanoid");
const { readJson, writeJson } = require("./db");

const FILE = "products.json";

function readAll() {
  return readJson(FILE, []);
}

function writeAll(products) {
  writeJson(FILE, products);
}

function getProduct(id) {
  return readAll().find((p) => p.id === id) || null;
}

function toList(v) {
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

function toMoney(v) {
  if (v === undefined || v === null || v === "") return null;
  return Math.round(Number(v) * 100) / 100;
}

// Normaliza lo que llega del panel de admin para que el catálogo siempre
// tenga la misma forma.
function normalize(data, base = {}) {
  const p = { ...base };
  const str = (k) => { if (data[k] !== undefined) p[k] = String(data[k]).trim(); };
  ["name", "cat", "sub", "description", "dims", "tag"].forEach(str);
  if (data.price !== undefined) p.price = toMoney(data.price);
  if (data.oldPrice !== undefined) p.oldPrice = toMoney(data.oldPrice);
  if (data.assemblyPrice !== undefined) p.assemblyPrice = toMoney(data.assemblyPrice) || 0;
  if (data.colors !== undefined) p.colors = toList(data.colors);
  if (data.images !== undefined) p.images = toList(data.images);
  if (data.inStock !== undefined) p.inStock = Boolean(data.inStock);
  if (data.featured !== undefined) p.featured = Boolean(data.featured);
  if (data.assembly !== undefined) p.assembly = Boolean(data.assembly);
  return p;
}

function addProduct(data) {
  const products = readAll();
  const product = normalize(data, {
    id: "p-" + nanoid(8),
    name: "",
    cat: "",
    sub: "",
    description: "",
    dims: "",
    tag: "",
    price: 0,
    oldPrice: null,
    colors: [],
    images: [],
    assembly: false,
    assemblyPrice: 0,
    featured: false,
    inStock: true,
  });
  product.created_at = new Date().toISOString();
  products.unshift(product); // lo más nuevo, primero
  writeAll(products);
  return product;
}

function updateProduct(id, patch) {
  const products = readAll();
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  products[idx] = normalize(patch, products[idx]);
  writeAll(products);
  return products[idx];
}

function deleteProduct(id) {
  const products = readAll();
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  products.splice(idx, 1);
  writeAll(products);
  return true;
}

module.exports = { readAll, getProduct, addProduct, updateProduct, deleteProduct };
