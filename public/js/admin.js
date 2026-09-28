let orders = [];

const $ = (id) => document.getElementById(id);

const STATUS = {
  nuevo: { label: "Nuevo", cls: "warn" },
  confirmado: { label: "Confirmado", cls: "" },
  pagado: { label: "Pagado", cls: "warn" },
  en_reparto: { label: "En reparto", cls: "" },
  entregado: { label: "Entregado", cls: "ok" },
  cancelado: { label: "Cancelado", cls: "bad" },
};
const OPEN = ["nuevo", "confirmado", "pagado", "en_reparto"];

async function load() {
  rememberKey();
  try {
    orders = await api("/api/orders");
    showMsg("");
    render();
  } catch (e) {
    showMsg(e.message, "error");
  }
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function renderStats() {
  const open = orders.filter((o) => OPEN.includes(o.status));
  const month = new Date().toISOString().slice(0, 7);
  const monthOrders = orders.filter((o) => o.created_at.startsWith(month) && o.status !== "cancelado");
  const monthTotal = monthOrders.reduce((s, o) => s + o.total, 0);
  $("stats").innerHTML = `
    <div class="stat"><b>${orders.filter((o) => o.status === "nuevo").length}</b><span>Nuevos por confirmar</span></div>
    <div class="stat"><b>${open.length}</b><span>Pendientes de entregar</span></div>
    <div class="stat"><b>${monthOrders.length}</b><span>Pedidos este mes</span></div>
    <div class="stat"><b>${money(monthTotal)}</b><span>Vendido este mes</span></div>`;
}

function render() {
  renderStats();
  const q = $("search").value.trim().toLowerCase();
  const f = $("filterStatus").value;
  const list = orders.filter((o) => {
    if (f === "abiertos" && !OPEN.includes(o.status)) return false;
    if (f && f !== "abiertos" && o.status !== f) return false;
    if (!q) return true;
    return [o.id, o.customer.name, o.customer.phone, o.customer.email].join(" ").toLowerCase().includes(q);
  });

  if (!list.length) {
    $("orders").innerHTML = `<div class="empty-msg">${orders.length ? "No hay pedidos con ese filtro." : "Todavía no hay pedidos."}</div>`;
    return;
  }

  $("orders").innerHTML = list.map(orderCard).join("");
}

function orderCard(o) {
  const st = STATUS[o.status] || { label: o.status, cls: "" };
  const paid = o.payment_status === "pagado";
  const delivery =
    o.shipping.method === "recogida"
      ? "Recoge en tienda"
      : `${esc(o.address.street)}${o.address.floor ? ", " + esc(o.address.floor) : ""}<br>${esc(o.address.zip)} ${esc(o.address.city)}`;
  const phone = o.customer.phone.replace(/\s+/g, "");
  const wa = phone.replace(/^\+/, "").replace(/^(?!34)(\d{9})$/, "34$1");

  return `
  <article class="order s-${o.status}">
    <div class="order-head">
      <div><b>${esc(o.id)}</b> <span class="pill ${st.cls}">${st.label}</span>
        <span class="pill ${paid ? "ok" : ""}">${paid ? "Pagado" : o.payment_method === "tarjeta" ? "Tarjeta · sin pagar" : "Paga en la entrega"}</span></div>
      <div class="meta">${fmtDate(o.created_at)}</div>
    </div>
    <div class="order-body">
      <div>
        <h4>Cliente</h4>
        <div>${esc(o.customer.name)}</div>
        <div><a href="tel:${esc(phone)}">${esc(o.customer.phone)}</a> · <a href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a></div>
        ${o.customer.email ? `<div>${esc(o.customer.email)}</div>` : ""}
        <h4 style="margin-top:12px">Entrega</h4>
        <div>${delivery}</div>
        ${o.delivery_date ? `<div><b>Día acordado:</b> ${esc(o.delivery_date)}</div>` : ""}
      </div>
      <div>
        <h4>Productos</h4>
        <ul>${o.items
          .map((it) => `<li>${esc(it.name)}${it.color ? ` · ${esc(it.color)}` : ""} ×${it.qty}${it.assembly ? " · <b>con montaje</b>" : ""}</li>`)
          .join("")}</ul>
        ${o.notes ? `<h4 style="margin-top:12px">Notas del cliente</h4><div>${esc(o.notes)}</div>` : ""}
      </div>
      <div class="totals">
        <h4>Importe</h4>
        <div><span>Productos</span><span>${money(o.items_total)}</span></div>
        ${o.assembly_total ? `<div><span>Montaje</span><span>${money(o.assembly_total)}</span></div>` : ""}
        <div><span>${esc(o.shipping.label)}</span><span>${money(o.shipping.amount)}</span></div>
        <div class="t"><span>Total</span><span>${money(o.total)}</span></div>
      </div>
    </div>
    <div class="order-foot">
      <select data-status="${o.id}" aria-label="Estado del pedido">
        ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === o.status ? "selected" : ""}>${v.label}</option>`).join("")}
      </select>
      <input data-date="${o.id}" placeholder="Día de entrega (ej: martes 14, por la tarde)" value="${esc(o.delivery_date || "")}">
      ${paid ? "" : `<button class="btn small secondary" data-paid="${o.id}">Marcar como cobrado</button>`}
      <button class="btn small" data-save="${o.id}">Guardar</button>
    </div>
  </article>`;
}

async function patchOrder(id, body) {
  try {
    const updated = await api("/api/orders/" + id, { method: "PATCH", body });
    orders = orders.map((o) => (o.id === id ? updated : o));
    render();
    showMsg(`Pedido ${id} actualizado.`, "ok");
  } catch (e) {
    showMsg(e.message, "error");
  }
}

$("orders").addEventListener("click", (e) => {
  const save = e.target.closest("[data-save]");
  const paid = e.target.closest("[data-paid]");
  if (save) {
    const id = save.dataset.save;
    patchOrder(id, {
      status: document.querySelector(`[data-status="${id}"]`).value,
      delivery_date: document.querySelector(`[data-date="${id}"]`).value,
    });
  }
  if (paid) patchOrder(paid.dataset.paid, { payment_status: "pagado" });
});

$("loginForm").addEventListener("submit", (e) => { e.preventDefault(); load(); });
$("search").addEventListener("input", render);
$("filterStatus").addEventListener("change", render);

if (restoreKey()) load();
