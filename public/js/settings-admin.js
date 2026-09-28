const $ = (id) => document.getElementById(id);
let zones = [];

async function load() {
  rememberKey();
  try {
    await api("/api/orders"); // comprueba la contraseña
    const s = await api("/api/settings");
    fill(s);
    $("settingsForm").hidden = false;
    showMsg("");
  } catch (e) {
    showMsg(e.message, "error");
  }
}

function fill(s) {
  const shop = s.shop || {};
  const phones = shop.phones || [];
  $("sAddress").value = shop.address || "";
  $("sCity").value = shop.city || "";
  $("sPhone1").value = phones[0] || "";
  $("sPhone2").value = phones[1] || "";
  $("sWhatsapp").value = shop.whatsapp || "";
  $("sEmail").value = shop.email || "";
  $("sHours").value = shop.hours || "";
  $("sTiktok").value = shop.tiktok || "";
  $("sInstagram").value = shop.instagram || "";
  const d = s.delivery || {};
  $("sPickup").checked = d.pickupEnabled !== false;
  $("sCash").checked = d.cashOnDelivery !== false;
  $("sFree").value = d.freeShippingFrom || "";
  zones = (d.zones || []).map((z) => ({ ...z }));
  renderZones();
}

function rangesToText(ranges) {
  return (ranges || []).map((r) => (r[0] === r[1] ? r[0] : `${r[0]}-${r[1]}`)).join(", ");
}

function textToRanges(text) {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const [a, b] = part.split("-").map((x) => x.trim());
      return [a, b || a];
    });
}

function renderZones() {
  $("zones").innerHTML = zones
    .map(
      (z, i) => `
    <div class="zone">
      <label class="f"><span>Nombre</span><input data-z="${i}" data-k="label" value="${esc(z.label)}"></label>
      <label class="f"><span>Códigos postales</span><input data-z="${i}" data-k="ranges" value="${esc(rangesToText(z.ranges))}"></label>
      <label class="f"><span>Precio (€)</span><input data-z="${i}" data-k="price" type="number" min="0" step="1" value="${z.price}"></label>
      <button class="btn small danger" type="button" data-del="${i}">Quitar</button>
    </div>`
    )
    .join("");
}

$("zones").addEventListener("input", (e) => {
  const el = e.target.closest("[data-z]");
  if (!el) return;
  const z = zones[Number(el.dataset.z)];
  if (el.dataset.k === "ranges") z.ranges = textToRanges(el.value);
  else if (el.dataset.k === "price") z.price = Number(el.value) || 0;
  else z.label = el.value;
});

$("zones").addEventListener("click", (e) => {
  const b = e.target.closest("[data-del]");
  if (!b) return;
  zones.splice(Number(b.dataset.del), 1);
  renderZones();
});

$("addZone").addEventListener("click", () => {
  zones.push({ id: "z" + Date.now().toString(36), label: "Nueva zona", ranges: [], price: 0 });
  renderZones();
});

$("settingsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const bad = zones.find((z) => z.ranges.some((r) => !/^\d{5}$/.test(r[0]) || !/^\d{5}$/.test(r[1])));
  if (bad) return showMsg(`Revisa los códigos postales de "${bad.label}": deben tener 5 cifras.`, "error");

  $("saveBtn").disabled = true;
  try {
    await api("/api/settings", {
      method: "PUT",
      body: {
        shop: {
          address: $("sAddress").value,
          city: $("sCity").value,
          phones: [$("sPhone1").value, $("sPhone2").value],
          whatsapp: $("sWhatsapp").value.replace(/\D/g, ""),
          email: $("sEmail").value,
          hours: $("sHours").value,
          tiktok: $("sTiktok").value,
          instagram: $("sInstagram").value,
        },
        delivery: {
          pickupEnabled: $("sPickup").checked,
          cashOnDelivery: $("sCash").checked,
          freeShippingFrom: $("sFree").value || null,
          zones,
        },
      },
    });
    showMsg("Ajustes guardados. La web ya muestra los cambios.", "ok");
  } catch (err) {
    showMsg(err.message, "error");
  } finally {
    $("saveBtn").disabled = false;
  }
});

$("loginForm").addEventListener("submit", (e) => { e.preventDefault(); load(); });
if (restoreKey()) load();
