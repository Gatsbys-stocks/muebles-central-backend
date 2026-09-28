// Pedidos en data/orders.json (el más nuevo primero).
const { readJson, writeJson } = require("./db");

const FILE = "orders.json";

function readAll() {
  return readJson(FILE, []);
}

function addOrder(order) {
  const orders = readAll();
  orders.unshift(order);
  writeJson(FILE, orders);
  return order;
}

function getOrder(id) {
  return readAll().find((o) => o.id === id) || null;
}

function updateOrder(id, patch) {
  const orders = readAll();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  orders[idx] = { ...orders[idx], ...patch, updated_at: new Date().toISOString() };
  writeJson(FILE, orders);
  return orders[idx];
}

module.exports = { readAll, addOrder, getOrder, updateOrder };
