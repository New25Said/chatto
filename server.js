const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

const HISTORY_FILE = path.join(__dirname, "chatHistory.json");

// Cargar historial
let chatHistory = [];
if (fs.existsSync(HISTORY_FILE)) {
  try {
    chatHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
  } catch (err) {
    console.error("Error al leer historial:", err);
    chatHistory = [];
  }
}

// Conexión
io.on("connection", (socket) => {
  console.log("Nuevo usuario conectado");

  // Enviar historial
  socket.emit("chat history", chatHistory);

  // Recibir mensajes
  socket.on("chat message", (msg) => {
    const newMessage = {
      text: msg.text,
      image: msg.image,
      sticker: msg.sticker,
      time: new Date().toISOString()
    };

    chatHistory.push(newMessage);

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(chatHistory, null, 2));

    io.emit("chat message", newMessage);
  });

  // Desconexión
  socket.on("disconnect", () => {
    console.log("Usuario desconectado");
  });
});

// Puerto
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
