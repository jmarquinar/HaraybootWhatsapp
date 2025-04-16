const { create } = require("venom-bot");
const express = require("express");
const qrcode = require("qrcode");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3033;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // ¡Nuevo! Servir archivos estáticos

const qrCodePath = path.join(__dirname, "public", "qrcode.png");

// Crear sesión de Venom
create({
  session: "whatsapp-session",
  catchQR: (base64Qr) => {
    console.log("📌 QR recibido, guardando imagen...");

    const publicDir = path.join(__dirname, "public");
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

    const qrCodeBuffer = Buffer.from(base64Qr.split(",")[1], "base64");
    fs.writeFileSync(qrCodePath, qrCodeBuffer);

    console.log(`✅ QR guardado en ${qrCodePath}`);
  },
  multidevice: true,
  headless: false,
  logQR: true,
  restartOnCrash: true,
  autoClose: 0,
  browserArgs: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-extensions",
    "--disable-dev-shm-usage",
    "--disable-globally-coordinated-bfcache",
  ],
})
  .then((client) => {
    console.log("✅ Cliente de WhatsApp conectado");
    start(client);
  })
  .catch((err) => console.error("❌ Error iniciando Venom-Bot:", err));

// Ruta para mostrar el QR
app.get("/", (req, res) => {
  res.send(`
    <h1>WhatsApp Bot - Escanea el QR</h1>
    <img src="/qrcode.png" alt="QR Code" style="width: 300px;">
  `);
});

// Servidor
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});

// ---- Funciones auxiliares ----

async function fetchData(url, options) {
  const fetch = (await import("node-fetch")).default;
  return fetch(url, options);
}

async function validarDNI(dni) {
  const token = "apis-token-13975.uv1PL0x5I0Un7IgdgbfikG7By7I9jcwT";
  const url = `https://api.apis.net.pe/v2/reniec/dni?numero=${dni}`;

  try {
    const res = await fetchData(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (data.numeroDocumento) {
      return {
        dni: data.numeroDocumento,
        nombre: `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno}`.trim(),
      };
    }

    return null;
  } catch (err) {
    console.error("❌ Error consultando RENIEC:", err.message);
    return null;
  }
}

// ---- Configuración de Asesores ----

const asesoresPorProyecto = {
  "1": [
    { nombre: "Ivonne Cipiran", numero: "51924502028" },
    { nombre: "Jaime Solano", numero: "51987796887" },
    { nombre: "Hector Huayhua", numero: "51924506025" }
  ],
  "2": [
    { nombre: "Adolfo Gutierrez", numero: "51905465349" },
    { nombre: "Juan Anticona", numero: "51905463756" }
  ]
};

let indiceAsesor = { "1": 0, "2": 0 };
let usuariosPendientes = {};

// ---- Lógica del Bot ----

function start(client) {
  client.onMessage(async (message) => {
    const chatId = message.from;
    const body = message.body.trim().toLowerCase();

    if (!usuariosPendientes[chatId]) {
      usuariosPendientes[chatId] = { esperandoDNI: true };
      await client.sendText(chatId,
        `¡Te damos la bienvenida a *Haray Inmobiliaria*! 🏡\n\nPara brindarte información sobre nuestros proyectos con *techo propio*, indícanos tu *DNI* para validar si calificas. 📲`
      );
      return;
    }

    const usuario = usuariosPendientes[chatId];

    // Esperando DNI
    if (usuario.esperandoDNI) {
      const dni = message.body;
      if (!/^\d{8}$/.test(dni)) {
        await client.sendText(chatId, "❌ DNI inválido. Asegúrate de que tenga *8 dígitos*.");
        return;
      }

      const datos = await validarDNI(dni);
      if (!datos) {
        await client.sendText(chatId, "❌ No se pudo validar el DNI. Intenta nuevamente.");
        return;
      }

      usuario.dni = dni;
      usuario.nombre = datos.nombre;
      usuario.esperandoDNI = false;
      usuario.seleccionProyecto = true;

      await client.sendText(chatId,
        `✅ Gracias *${datos.nombre}*.\n\nElige una opción seleccionando 1 o 2:\n\n1️⃣ Urb. Villaluz\n2️⃣ Las Casuarinas`
      );
      return;
    }

    // Selección de Proyecto
    if (usuario.seleccionProyecto) {
      if (["1", "2"].includes(body)) {
        const proyectos = {
          "1": {
            nombre: "Urb. Villaluz",
            mensaje: "🏡 *URB. VILLALUZ*\nCasa + Lote con techo propio.\n💰 ¡Los mejores precios de la zona!",
            ubicacion: "📍 *Dirección:* MZ. V LT. 1 - VALLE SOL 2 ETAPA",
            imagen: "urb-villaluz.jpg"
          },
          "2": {
            nombre: "Las Casuarinas",
            mensaje: "🏡 *LAS CASUARINAS*\nCasa + Lote con techo propio.\n💰 ¡Precios increíbles!",
            ubicacion: "📍 *Ubicación:* Al lado del *Centro Empresarial del Norte*",
            imagen: "las-casuarinas.jpg"
          }
        };

        const proyecto = proyectos[body];
        usuario.proyecto = proyecto.nombre;
        usuario.seleccionProyecto = false;

        await client.sendText(chatId, `✅ Has seleccionado *${proyecto.nombre}*`);
        await client.sendText(chatId, proyecto.mensaje);
        await client.sendText(chatId, proyecto.ubicacion);
        await client.sendImage(chatId, `./${proyecto.imagen}`, proyecto.nombre, `¡Descubre ${proyecto.nombre}!`);
        await client.sendText(chatId, "¿Deseas hablar con un asesor? Responde *Sí* o *No*.");
        return;
      } else {
        await client.sendText(chatId, "❌ Opción inválida. Escribe *1* o *2*.");
        return;
      }
    }

    // Asignación de Asesor
    if (["si", "sí", "sì"].includes(body)) {
      const proyectoKey = usuario.proyecto === "Urb. Villaluz" ? "1" : "2";
      const asesores = asesoresPorProyecto[proyectoKey];
      const asesor = asesores[indiceAsesor[proyectoKey]];

      indiceAsesor[proyectoKey] = (indiceAsesor[proyectoKey] + 1) % asesores.length;

      const numeroCliente = chatId.replace(/^51/, "").replace(/@c.us$/, "");
      const mensajeCliente = `¡Hola! Soy ${asesor.nombre}, asesor de Haray Inmobiliaria. 😊 Me comunico contigo para brindarte más información sobre el proyecto ${usuario.proyecto}.`;
      const enlaceWhatsApp = `https://wa.me/51${numeroCliente}?text=${encodeURIComponent(mensajeCliente)}`;
      const numeroAsesor = asesor.numero.replace(/^51/, "") + "@c.us";

      await client.sendText(numeroAsesor,
        `📢 *Nuevo cliente interesado*\n📞 *Número:* ${numeroCliente}\n🔗 *Chat:* ${enlaceWhatsApp}\n📌 *Proyecto:* ${usuario.proyecto}\n🪪 *DNI:* ${usuario.dni}\n\n📲 ¡Contáctalo pronto!`
      );

      await client.sendText(chatId, `✅ Te hemos asignado con *${asesor.nombre}*. Recibirás su mensaje pronto. 📲`);
      delete usuariosPendientes[chatId];
      return;
    }

    // Rechazo
    if (["no", "nah", "nop"].includes(body)) {
      await client.sendText(chatId, "😊 ¡Gracias por tu tiempo! Si necesitas más información, escríbenos cuando gustes. 🌟");
      delete usuariosPendientes[chatId];
      return;
    }
  });
}