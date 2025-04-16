# 🤖 Venom-Bot WhatsApp VPS Starter

Este proyecto es una base para crear y desplegar tu bot de WhatsApp usando [Venom-Bot](https://github.com/orkestral/venom), Node.js y un VPS gratuito (como Railway o Render) conectado a GitHub.

---

## 🚀 ¿Qué hace este bot?

- Se conecta a tu cuenta de WhatsApp.
- Responde automáticamente con "Hola 👋" cuando recibe un mensaje.
- Tiene un endpoint básico en `/` y otro para ver el código QR en `/qr`.

---

## 🧰 Requisitos

- Cuenta en GitHub
- Cuenta en un VPS gratuito (Railway, Render, etc.)
- Node.js >= 18.x
- WhatsApp en tu teléfono

---

## 📦 Estructura del proyecto
📁 venom-bot-vps/ ├── .gitignore ├── package.json ├── venom-bot2.js

---

## 📁 Archivos importantes

### `package.json`
Contiene las dependencias y el script de inicio:

```json
{
  "name": "venom-bot-vps",
  "version": "1.0.0",
  "description": "Bot de WhatsApp con Venom-Bot para VPS gratis",
  "main": "venom-bot2.js",
  "scripts": {
    "start": "node venom-bot2.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "venom-bot": "^5.0.0"
  }
}

