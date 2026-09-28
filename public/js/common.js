// Código compartido por los tres paneles de administración.
// Los paneles los sirve el propio backend, así que la API está en el mismo dominio.
const API_BASE_URL = "";

// URL pública de la tienda: sirve para mostrar en el panel las fotos de
// ejemplo que viven en el frontend (rutas tipo "img/tienda-2.jpg").
const STORE_URL = "https://gatsbys-stocks.github.io/muebles-central/";

function adminKey() {
  return document.getElementById("adminKey").value.trim();
}

function rememberKey() {
  try { localStorage.setItem("mcAdminKey", adminKey()); } catch (e) {}
}

function restoreKey() {
  try {
    const k = localStorage.getItem("mcAdminKey");
    if (k) document.getElementById("adminKey").value = k;
    return Boolean(k);
  } catch (e) { return false; }
}

function showMsg(text, type) {
  const el = document.getElementById("msg");
  el.textContent = text || "";
  el.className = type || "";
}

function money(n) {
  return Number(n || 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function imgUrl(src) {
  if (!src) return "";
  return /^https?:\/\//.test(src) ? src : STORE_URL + src.replace(/^\//, "");
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// fetch con la contraseña y mensajes de error legibles.
async function api(path, { method = "GET", body, form } = {}) {
  const headers = { "x-admin-key": adminKey() };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  let res;
  try {
    res = await fetch(API_BASE_URL + path, { method, headers, body: form || (body !== undefined ? JSON.stringify(body) : undefined) });
  } catch (e) {
    throw new Error("No se pudo conectar con el servidor. Si acaba de arrancar, espera unos segundos y vuelve a probar.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}
