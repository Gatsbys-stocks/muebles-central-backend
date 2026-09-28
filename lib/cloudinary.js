// Fotos de producto en Cloudinary: el disco de Render se borra en cada
// despliegue, así que una foto subida hoy desaparecería mañana.
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function isConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  );
}

// Sube un Buffer (de multer en memoria) y devuelve la URL segura.
// Se limita a 1600px de ancho para que las fotos del móvil no pesen de más.
function uploadImageBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "muebles-central-products",
        resource_type: "image",
        transformation: [{ width: 1600, crop: "limit", quality: "auto", fetch_format: "auto" }],
      },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.end(buffer);
  });
}

module.exports = { uploadImageBuffer, isConfigured };
