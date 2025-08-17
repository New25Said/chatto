const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let chats = ["public"];
let users = {};

io.on("connection", socket => {
  console.log("🔌 Usuario conectado:", socket.id);

  socket.on("setNickname", nickname => {
    users[socket.id] = nickname;
    socket.join("public");
    socket.emit("chatList", chats);
    console.log("👤", nickname, "conectado");
  });

  socket.on("message", ({ chat, from, text }) => {
    io.to(chat).emit("message", { chat, from, text });
    console.log(`[${chat}] ${from}: ${text}`);
  });

  socket.on("createGroup", groupName => {
    if (!chats.includes(groupName)) {
      chats.push(groupName);
      io.emit("chatList", chats);
      console.log("📢 Nuevo grupo:", groupName);
    }
  });

  socket.on("joinChat", chat => {
    socket.join(chat);
  });

  socket.on("disconnect", () => {
    console.log("❌ Usuario desconectado:", users[socket.id]);
    delete users[socket.id];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("🚀 Servidor corriendo en http://localhost:" + PORT);
});
