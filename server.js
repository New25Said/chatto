const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));
app.use(express.json()); // Para parsear JSON en POST

const HISTORY_FILE = path.join(__dirname, "chatHistory.json");

// Cargar historial
let chatHistory = [];
if (fs.existsSync(HISTORY_FILE)) {
  try {
    chatHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
  } catch (err) {
    console.error("Error al leer historial:", err);
  }
}

// Usuarios y grupos
let users = {}; // socket.id -> nickname
let groups = {}; // groupName -> [nicknames]

function saveHistory() {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(chatHistory, null, 2));
}

// Ruta para resetear todo el historial y grupos
app.post("/reset", (req, res) => {
  // Vaciar historial
  chatHistory = [];
  saveHistory();

  // Vaciar grupos
  groups = {};

  // Actualizar listas de usuarios y grupos a los clientes
  io.emit("user list", Object.values(users));
  io.emit("group list", Object.keys(groups));

  console.log("⚠️ Chat reseteado manualmente");
  res.sendStatus(200);
});

io.on("connection", (socket) => {
  console.log("✔ Usuario conectado:", socket.id);

  // Establecer nickname
  socket.on("set nickname", (nickname) => {
    users[socket.id] = nickname;
    io.emit("user list", Object.values(users));
    socket.emit("chat history", chatHistory); // enviar historial
    socket.emit("group list", Object.keys(groups));
  });

  // Mensajes públicos
  socket.on("chat public", (text) => {
    const msg = {
      id: socket.id,
      name: users[socket.id],
      text,
      time: Date.now(),
      type: "public",
      target: null,
    };
    chatHistory.push(msg);
    saveHistory();
    io.emit("chat message", msg);
  });

  // Mensajes privados
  socket.on("chat private", ({ target, text }) => {
    const targetId = Object.keys(users).find((id) => users[id] === target);
    if (targetId) {
      const msg = {
        id: socket.id,
        name: users[socket.id],
        text,
        time: Date.now(),
        type: "private",
        target,
      };
      chatHistory.push(msg);
      saveHistory();
      socket.emit("chat message", msg); // tú ves tu mensaje
      io.to(targetId).emit("chat message", msg); // destinatario
    }
  });

  // Mensajes de grupo
  socket.on("chat group", ({ groupName, text }) => {
    if (groups[groupName] && groups[groupName].includes(users[socket.id])) {
      const msg = {
        id: socket.id,
        name: users[socket.id],
        text,
        time: Date.now(),
        type: "group",
        target: groupName,
      };
      chatHistory.push(msg);
      saveHistory();

      // enviar solo a miembros
      Object.entries(users).forEach(([sid, nick]) => {
        if (groups[groupName].includes(nick)) {
          io.to(sid).emit("chat message", msg);
        }
      });
    }
  });

  // Crear grupo
  socket.on("create group", ({ groupName, members }) => {
    if (!groups[groupName]) {
      groups[groupName] = members;
      io.emit("group list", Object.keys(groups));
    }
  });

  // Indicador escribiendo
  socket.on("typing", ({ type, target }) => {
    if (type === "public") {
      socket.broadcast.emit("typing", { name: users[socket.id], type, target: null });
    } else if (type === "private" && target) {
      const targetId = Object.keys(users).find((id) => users[id] === target);
      if (targetId) io.to(targetId).emit("typing", { name: users[socket.id], type, target });
    } else if (type === "group" && target) {
      groups[target].forEach((nick) => {
        const sid = Object.keys(users).find((id) => users[id] === nick);
        if (sid && sid !== socket.id) io.to(sid).emit("typing", { name: users[socket.id], type, target });
      });
    }
  });

  // Desconexión
  socket.on("disconnect", () => {
    console.log("✖ Usuario desconectado:", socket.id);
    delete users[socket.id];
    io.emit("user list", Object.values(users));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✔ Servidor chat listo en puerto ${PORT}`));
