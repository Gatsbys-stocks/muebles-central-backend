# Muebles Central Backend

API en Node.js/Express para la tienda online de **Muebles Central**, una tienda de muebles y electrodomésticos del Raval de Barcelona (C/ del Carme 106). Da servicio al frontend estático [muebles-central](https://github.com/Gatsbys-stocks/muebles-central): catálogo gestionable por la propia tienda, pedidos, envío y montaje por zonas, pago con tarjeta o en la entrega, y paneles de administración.

## El problema que resolví

La tienda vendía por TikTok y WhatsApp y necesitaba una web donde el cliente pudiera ver el catálogo y hacer el pedido, y donde el dueño pudiera subir sus propios muebles con fotos desde el móvil. Un mueble no se envía como un paquete: se reparte con furgoneta y muchas veces se monta en casa. Por eso, en vez de tarifas de mensajería, el envío se calcula por **zonas de código postal** que la tienda configura, y el **montaje** es una opción por producto con su propio precio.

## Qué hice

- **Catálogo gestionable sin tocar código**: CRUD de productos (`/api/products`) con varias fotos, colores/opciones, medidas, precio rebajado, etiqueta (Nuevo, Oferta, A medida), destacado en portada y stock.
- **Precios calculados en el servidor**: el navegador solo manda ids, cantidades y opciones. Productos, montaje, envío y total salen del catálogo del servidor (`lib/pricing.js`), así que nadie puede cambiar un precio desde la consola.
- **Envío por zonas y montaje**: rangos de códigos postales con precio (Barcelona ciudad, provincia, resto de Cataluña), recogida en tienda gratis, envío gratis a partir de un importe y montaje opcional por producto.
- **Dos formas de pago**: tarjeta con Stripe Checkout (confirmada por **webhook con firma verificada**) o pago en la entrega.
- **Ajustes editables**: horario, teléfonos, WhatsApp, usuario de TikTok e Instagram, zonas y precios de envío. La web los lee de `/api/settings`, así que cuando la tienda abra su Instagram solo tiene que escribir el usuario en el panel.
- **Tres paneles de administración** pensados para móvil: pedidos (estado, día de entrega, marcar como cobrado, WhatsApp directo al cliente), productos (fotos a Cloudinary) y ajustes.
- **Emails automáticos** a la tienda y al cliente con Nodemailer.

## Decisiones técnicas

- **Webhook de Stripe antes de `express.json()`**: la ruta `/api/webhook/stripe` recibe el *raw body*, porque Stripe firma el cuerpo sin procesar. Además es idempotente: si Stripe reenvía el evento, el pedido no se marca ni se avisa dos veces.
- **Separación por módulos**: cada integración vive en `lib/` (Stripe, Cloudinary, email, precios, ajustes, persistencia) y las rutas solo orquestan.
- **Persistencia JSON con escritura atómica** (`lib/db.js`): se escribe en un temporal y se renombra, así un corte a mitad de escritura no deja el archivo roto. Con `DATA_DIR` los datos van a un Persistent Disk de Render y sobreviven a los despliegues.
- **Fotos fuera del disco del servidor**: `multer` en memoria → Cloudinary, con redimensionado a 1600 px para que las fotos del móvil no pesen de más.
- **Contraseña de admin comparada en tiempo constante** (`crypto.timingSafeEqual`).
- **Categorías en un único sitio** (`lib/categories.js`), servidas por la API al frontend y al panel.

## Stack

Node.js · Express · Stripe (Checkout + Webhooks) · Cloudinary · Multer · Nodemailer · CORS

## Arquitectura

```
Tienda (frontend estático, GitHub Pages)
        │
        ▼
   Muebles Central Backend (Express, Render)
    ├── /api/products            → catálogo (lectura pública, edición admin) → Cloudinary (fotos)
    ├── /api/settings            → horario, redes, zonas de envío
    ├── /api/shipping/quote      → desglose: productos + montaje + envío
    ├── /api/orders              → guarda pedido + emails
    ├── /api/orders/:id/checkout → Stripe (sesión de pago)
    └── /api/webhook/stripe      → confirma el pago (firma verificada)
```

## Estructura del proyecto

```
server.js              # arranca Express, middlewares, rutas y estáticos
routes/
  products.js          # GET/POST/PUT/DELETE /api/products, categorías, subida de fotos
  orders.js            # crear pedido, checkout, listado y cambio de estado (admin)
  shipping.js          # POST /api/shipping/quote
  settings.js          # GET/PUT /api/settings
  webhook.js           # POST /api/webhook/stripe
lib/
  pricing.js           # cálculo del carrito, zonas y montaje
  products.js          # persistencia del catálogo
  store.js             # persistencia de pedidos
  settings.js          # datos de la tienda y reglas de entrega
  categories.js        # categorías y tipos de mueble
  db.js                # lectura/escritura JSON atómica, DATA_DIR
  stripe.js            # sesión de pago
  cloudinary.js        # subida de fotos
  email.js             # notificaciones
  auth.js              # middleware x-admin-key
public/
  admin.html           # pedidos
  products-admin.html  # catálogo
  settings-admin.html  # ajustes de la tienda
  css/admin.css
  js/common.js · admin.js · products-admin.js · settings-admin.js
data/
  products.json        # catálogo inicial
  orders.json          # pedidos
  settings.json        # datos de la tienda y zonas
```

## Endpoints

| Método | Ruta | Función | Acceso |
|---|---|---|---|
| `GET` | `/api/products` | Catálogo | Público |
| `GET` | `/api/products/categories` | Categorías y tipos | Público |
| `GET` | `/api/products/:id` | Un producto | Público |
| `POST` | `/api/products` | Crear producto | Admin |
| `PUT` | `/api/products/:id` | Editar producto | Admin |
| `DELETE` | `/api/products/:id` | Borrar producto | Admin |
| `POST` | `/api/products/upload-image` | Subir foto (Cloudinary) | Admin |
| `GET` | `/api/settings` | Datos de la tienda, zonas y pagos activos | Público |
| `PUT` | `/api/settings` | Editar ajustes | Admin |
| `POST` | `/api/shipping/quote` | Desglose del carrito con envío y montaje | Público |
| `POST` | `/api/orders` | Crear pedido | Público |
| `POST` | `/api/orders/:id/checkout` | Sesión de pago con Stripe | Público |
| `GET` | `/api/orders` | Listar pedidos | Admin |
| `PATCH` | `/api/orders/:id` | Estado, día de entrega, cobrado | Admin |
| `POST` | `/api/webhook/stripe` | Confirmación de pago | Stripe |
| `GET` | `/health` | Estado del servicio | Público |

## Puesta en marcha

```bash
npm install
cp .env.example .env   # rellena al menos ADMIN_KEY
npm start              # http://localhost:3000
```

Sin `STRIPE_SECRET_KEY` la tienda solo ofrece "pagar en la entrega"; sin SMTP los pedidos se guardan igual pero no se envían emails; sin Cloudinary se puede usar todo menos la subida de fotos.

### Despliegue en Render

1. New → Web Service desde este repo. Build `npm install`, start `npm start`.
2. Variables de entorno de `.env.example`. `ALLOWED_ORIGIN` = dominio del frontend; `STORE_URL` = URL de la tienda.
3. Recomendado: un **Persistent Disk** montado en `/var/data` y `DATA_DIR=/var/data`. Sin él, los productos que añada la tienda y los pedidos se pierden en cada redespliegue.
4. Stripe → Webhooks → endpoint `https://<tu-servicio>.onrender.com/api/webhook/stripe`, evento `checkout.session.completed`, y copia el secreto en `STRIPE_WEBHOOK_SECRET`.

## Paneles de administración

- `/admin.html` — pedidos: resumen del mes, filtros, datos del cliente con enlace a WhatsApp, cambio de estado y día de entrega.
- `/products-admin.html` — catálogo: alta, edición y borrado con varias fotos, colores, montaje y stock.
- `/settings-admin.html` — horario, teléfonos, TikTok, Instagram, zonas y precios de envío.

Los tres usan la misma `ADMIN_KEY`.
