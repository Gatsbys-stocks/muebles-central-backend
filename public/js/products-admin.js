let categories = [];
let products = [];
let photos = []; // URLs de las fotos del producto que se está editando

const $ = (id) => document.getElementById(id);

async function init() {
  try {
    categories = await api("/api/products/categories");
  } catch (e) {
    showMsg(e.message, "error");
    return;
  }
  $("fCat").innerHTML = categories.map((c) => `<option value="${c.id}">${esc(c.label)}</option>`).join("");
  $("filterCat").innerHTML += categories.map((c) => `<option value="${c.id}">${esc(c.label)}</option>`).join("");
  fillSubs();
  renderPhotos();
  if (restoreKey()) load();
}

function fillSubs(selected) {
  const cat = categories.find((c) => c.id === $("fCat").value);
  const subs = cat ? cat.subs : [];
  $("fSub").innerHTML = subs.map((s) => `<option ${s === selected ? "selected" : ""}>${esc(s)}</option>`).join("");
}

async function load() {
  rememberKey();
  try {
    // Se comprueba la contraseña con una ruta de admin antes de mostrar nada.
    await api("/api/orders");
    products = await api("/api/products");
    showMsg("");
    renderList();
  } catch (e) {
    showMsg(e.message, "error");
  }
}

function catLabel(id) {
  return (categories.find((c) => c.id === id) || {}).label || id;
}

function renderList() {
  const q = $("search").value.trim().toLowerCase();
  const cat = $("filterCat").value;
  const list = products.filter((p) => (!cat || p.cat === cat) && (!q || p.name.toLowerCase().includes(q)));
  $("count").textContent = products.length;

  if (!list.length) {
    $("productList").innerHTML = `<div class="empty-msg">No hay productos que coincidan.</div>`;
    return;
  }

  $("productList").innerHTML = list
    .map((p) => {
      const inStock = p.inStock !== false;
      const img = p.images && p.images[0];
      return `
      <div class="pitem ${inStock ? "" : "off"}">
        ${img ? `<img class="thumb" src="${esc(imgUrl(img))}" alt="">` : `<div class="thumb">Sin foto</div>`}
        <div>
          <h3>${esc(p.name)}${p.tag ? `<span class="pill">${esc(p.tag)}</span>` : ""}${p.featured ? `<span class="pill ok">Portada</span>` : ""}${inStock ? "" : `<span class="pill bad">Agotado</span>`}</h3>
          <div class="meta">${esc(catLabel(p.cat))}${p.sub ? " · " + esc(p.sub) : ""}${p.dims ? " · " + esc(p.dims) : ""}</div>
          <div><span class="price">${money(p.price)}</span>${p.oldPrice ? `<span class="old">${money(p.oldPrice)}</span>` : ""}${p.assembly ? ` <span class="meta">· montaje ${money(p.assemblyPrice)}</span>` : ""}</div>
        </div>
        <div class="btns">
          <button class="btn small secondary" data-act="stock" data-id="${p.id}">${inStock ? "Marcar agotado" : "Volver a stock"}</button>
          <button class="btn small secondary" data-act="edit" data-id="${p.id}">Editar</button>
          <button class="btn small danger" data-act="del" data-id="${p.id}">Borrar</button>
        </div>
      </div>`;
    })
    .join("");
}

function renderPhotos() {
  $("photos").innerHTML =
    photos
      .map(
        (url, i) => `
      <div class="photo ${i === 0 ? "main" : ""}">
        <img src="${esc(imgUrl(url))}" alt="">
        <button type="button" class="x" data-i="${i}" aria-label="Quitar foto">×</button>
        ${i === 0 ? "" : `<button type="button" class="first" data-i="${i}">Principal</button>`}
      </div>`
      )
      .join("") + `<label class="upload-drop" for="fImageFile">+ Añadir<br>fotos</label>`;
}

$("photos").addEventListener("click", (e) => {
  const x = e.target.closest(".x");
  const first = e.target.closest(".first");
  if (x) photos.splice(Number(x.dataset.i), 1);
  if (first) photos.unshift(photos.splice(Number(first.dataset.i), 1)[0]);
  if (x || first) renderPhotos();
});

$("fImageFile").addEventListener("change", async (e) => {
  const files = [...e.target.files];
  e.target.value = "";
  for (let i = 0; i < files.length; i++) {
    $("uploadStatus").textContent = `Subiendo foto ${i + 1} de ${files.length}…`;
    const form = new FormData();
    form.append("image", files[i]);
    try {
      const { url } = await api("/api/products/upload-image", { method: "POST", form });
      photos.push(url);
      renderPhotos();
    } catch (err) {
      $("uploadStatus").textContent = err.message;
      return;
    }
  }
  $("uploadStatus").textContent = files.length ? "Fotos subidas. Recuerda pulsar Guardar producto." : "";
});

function resetForm() {
  $("productForm").reset();
  $("editId").value = "";
  $("formTitle").textContent = "Añadir producto";
  $("saveBtn").textContent = "Guardar producto";
  $("cancelBtn").hidden = true;
  $("uploadStatus").textContent = "";
  photos = [];
  fillSubs();
  renderPhotos();
}

function startEdit(p) {
  $("editId").value = p.id;
  $("fName").value = p.name;
  $("fCat").value = p.cat;
  fillSubs(p.sub);
  $("fDims").value = p.dims || "";
  $("fPrice").value = p.price;
  $("fOldPrice").value = p.oldPrice || "";
  $("fColors").value = (p.colors || []).join(", ");
  $("fTag").value = p.tag || "";
  $("fDesc").value = p.description || "";
  $("fAssembly").checked = Boolean(p.assembly);
  $("fAssemblyPrice").value = p.assemblyPrice || 0;
  $("fFeatured").checked = Boolean(p.featured);
  $("fStock").checked = p.inStock !== false;
  photos = [...(p.images || [])];
  renderPhotos();
  $("formTitle").textContent = "Editar: " + p.name;
  $("saveBtn").textContent = "Guardar cambios";
  $("cancelBtn").hidden = false;
  $("formPanel").scrollIntoView({ behavior: "smooth" });
}

$("fCat").addEventListener("change", () => fillSubs());
$("cancelBtn").addEventListener("click", resetForm);
$("loginForm").addEventListener("submit", (e) => { e.preventDefault(); load(); });
$("search").addEventListener("input", renderList);
$("filterCat").addEventListener("change", renderList);

$("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("editId").value;
  const body = {
    name: $("fName").value,
    cat: $("fCat").value,
    sub: $("fSub").value,
    dims: $("fDims").value,
    price: $("fPrice").value,
    oldPrice: $("fOldPrice").value || null,
    colors: $("fColors").value,
    tag: $("fTag").value,
    description: $("fDesc").value,
    assembly: $("fAssembly").checked,
    assemblyPrice: $("fAssemblyPrice").value || 0,
    featured: $("fFeatured").checked,
    inStock: $("fStock").checked,
    images: photos,
  };
  $("saveBtn").disabled = true;
  try {
    if (id) {
      const updated = await api("/api/products/" + id, { method: "PUT", body });
      products = products.map((p) => (p.id === id ? updated : p));
      showMsg("Cambios guardados. Ya se ven en la web.", "ok");
    } else {
      const created = await api("/api/products", { method: "POST", body });
      products.unshift(created);
      showMsg("Producto añadido. Ya se ve en la web.", "ok");
    }
    resetForm();
    renderList();
  } catch (err) {
    showMsg(err.message, "error");
  } finally {
    $("saveBtn").disabled = false;
  }
});

$("productList").addEventListener("click", async (e) => {
  const b = e.target.closest("button[data-act]");
  if (!b) return;
  const p = products.find((x) => x.id === b.dataset.id);
  if (!p) return;

  if (b.dataset.act === "edit") return startEdit(p);

  if (b.dataset.act === "stock") {
    try {
      const updated = await api("/api/products/" + p.id, { method: "PUT", body: { inStock: p.inStock === false } });
      products = products.map((x) => (x.id === p.id ? updated : x));
      renderList();
    } catch (err) { showMsg(err.message, "error"); }
  }

  if (b.dataset.act === "del") {
    // Doble toque para borrar: evita borrados por error desde el móvil.
    if (!b.dataset.sure) {
      b.dataset.sure = "1";
      b.textContent = "¿Seguro? Toca otra vez";
      setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = "Borrar"; } }, 4000);
      return;
    }
    try {
      await api("/api/products/" + p.id, { method: "DELETE" });
      products = products.filter((x) => x.id !== p.id);
      renderList();
      showMsg(`"${p.name}" borrado.`, "ok");
    } catch (err) { showMsg(err.message, "error"); }
  }
});

init();
