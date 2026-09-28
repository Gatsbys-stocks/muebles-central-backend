// Persistencia en archivos JSON, igual que en la tienda Nepali. Suficiente
// para el catálogo y los pedidos de una tienda de barrio.
//
// DATA_DIR (opcional): carpeta donde guardar los datos. En Render el disco
// normal se borra en cada despliegue; si añades un "Persistent Disk" montado
// en, por ejemplo, /var/data, pon DATA_DIR=/var/data y los productos y
// pedidos sobreviven a los despliegues. La primera vez se copian los datos
// iniciales de ./data.
const fs = require("fs");
const path = require("path");

const SEED_DIR = path.join(__dirname, "..", "data");
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : SEED_DIR;

function filePath(name) {
  const target = path.join(DATA_DIR, name);
  if (DATA_DIR !== SEED_DIR && !fs.existsSync(target)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const seed = path.join(SEED_DIR, name);
    fs.writeFileSync(target, fs.existsSync(seed) ? fs.readFileSync(seed) : "");
  }
  return target;
}

function readJson(name, fallback) {
  const p = filePath(name);
  if (!fs.existsSync(p)) return fallback;
  const raw = fs.readFileSync(p, "utf-8").trim();
  if (!raw) return fallback;
  return JSON.parse(raw);
}

// Escribe en un archivo temporal y lo renombra: si el proceso se corta a
// mitad de escritura, el JSON anterior queda intacto.
function writeJson(name, data) {
  const p = filePath(name);
  const tmp = p + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, p);
}

module.exports = { readJson, writeJson };
