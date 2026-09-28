const crypto = require("crypto");

// Rutas de administrador: cabecera x-admin-key igual a ADMIN_KEY.
// Se compara en tiempo constante para no filtrar la clave por tiempos.
function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_KEY || "";
  const given = req.header("x-admin-key") || "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (!expected || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Contraseña incorrecta." });
  }
  next();
}

module.exports = { requireAdmin };
