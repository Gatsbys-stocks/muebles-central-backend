require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const productsRoute = require("./routes/products");
const ordersRoute = require("./routes/orders");
const shippingRoute = require("./routes/shipping");
const settingsRoute = require("./routes/settings");
const webhookRoute = require("./routes/webhook");

const app = express();

// Stripe firma el cuerpo SIN procesar: el webhook va con express.raw() y
// ANTES del express.json() global, o la verificación de firma falla.
app.use("/api/webhook/stripe", express.raw({ type: "application/json" }), webhookRoute);

app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin:
      !process.env.ALLOWED_ORIGIN || process.env.ALLOWED_ORIGIN === "*"
        ? true
        : process.env.ALLOWED_ORIGIN.split(",").map((s) => s.trim()),
  })
);

app.use("/api/products", productsRoute);
app.use("/api/orders", ordersRoute);
app.use("/api/shipping", shippingRoute);
app.use("/api/settings", settingsRoute);

// Paneles de administración: /admin.html (pedidos) y /products-admin.html (catálogo).
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Muebles Central backend escuchando en el puerto ${PORT}`));
