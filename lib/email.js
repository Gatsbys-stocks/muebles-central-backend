const nodemailer = require("nodemailer");

const SHOP = "Muebles Central";
const eur = (n) => `${Number(n).toFixed(2)} €`;

function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function itemLines(order) {
  return order.items
    .map((it) => {
      const extra = [it.color, it.assembly ? `montaje +${eur(it.assembly_subtotal)}` : ""].filter(Boolean).join(", ");
      return `- ${it.name}${extra ? ` (${extra})` : ""} x${it.qty} = ${eur(it.subtotal)}`;
    })
    .join("\n");
}

function deliveryText(order) {
  if (order.shipping.method === "recogida") return "Recogida en tienda (C/ del Carme 106, Barcelona)";
  const a = order.address;
  return `${a.street}${a.floor ? ", " + a.floor : ""}\n${a.zip} ${a.city}`;
}

const paymentText = (order) => (order.payment_method === "tarjeta" ? "Tarjeta (Stripe)" : "En la entrega / en tienda");

async function notifyShopOfNewOrder(order) {
  const transport = getTransport();
  if (!transport || !process.env.NOTIFY_EMAIL) {
    console.log("[email] SMTP sin configurar: no se avisa a la tienda del pedido", order.id);
    return;
  }
  await transport.sendMail({
    from: process.env.SMTP_USER,
    to: process.env.NOTIFY_EMAIL,
    subject: `Nuevo pedido ${order.id} — ${order.customer.name}`,
    text: `Nuevo pedido en la web.

Pedido: ${order.id}
Cliente: ${order.customer.name}
Teléfono: ${order.customer.phone}
Email: ${order.customer.email || "-"}

Entrega:
${deliveryText(order)}

Productos:
${itemLines(order)}

Productos: ${eur(order.items_total)}
Montaje: ${eur(order.assembly_total)}
${order.shipping.label}: ${eur(order.shipping.amount)}
TOTAL: ${eur(order.total)}
Pago: ${paymentText(order)}

Notas del cliente: ${order.notes || "-"}
`,
  });
}

async function confirmToCustomer(order) {
  const transport = getTransport();
  if (!transport || !order.customer.email) return;
  await transport.sendMail({
    from: process.env.SMTP_USER,
    to: order.customer.email,
    subject: `Hemos recibido tu pedido ${order.id} — ${SHOP}`,
    text: `Hola ${order.customer.name},

Hemos recibido tu pedido ${order.id}. Te llamaremos para acordar el día de entrega.

${itemLines(order)}

Total: ${eur(order.total)} (${paymentText(order)})

Gracias por confiar en nosotros,
${SHOP} — C/ del Carme 106, Barcelona
`,
  });
}

async function paymentConfirmedEmail(order) {
  const transport = getTransport();
  if (!transport) return;
  const total = order.payment ? order.payment.amount_total : order.total;

  if (process.env.NOTIFY_EMAIL) {
    await transport.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.NOTIFY_EMAIL,
      subject: `Pago recibido — pedido ${order.id}`,
      text: `El pedido ${order.id} de ${order.customer.name} está pagado (${eur(total)}). Llama al cliente (${order.customer.phone}) para acordar la entrega.`,
    });
  }
  if (order.customer.email) {
    await transport.sendMail({
      from: process.env.SMTP_USER,
      to: order.customer.email,
      subject: `Pago recibido — pedido ${order.id} — ${SHOP}`,
      text: `Hola ${order.customer.name},

Hemos recibido tu pago de ${eur(total)} para el pedido ${order.id}. Te llamaremos para acordar el día de entrega.

${SHOP}
`,
    });
  }
}

module.exports = { notifyShopOfNewOrder, confirmToCustomer, paymentConfirmedEmail };
