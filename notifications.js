// notifications.js

// Crear objeto Audio
const notificationSound = new Audio("https://ia801505.us.archive.org/10/items/hangouts_sfx/hangouts_message.mp3");

// Función para mostrar notificación
function notifyUser(title, body) {
  // Verificar si el documento está oculto
  if (document.hidden) {
    // Pedir permiso si no lo hay
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
    if (Notification.permission === "granted") {
      new Notification(title, { body });
      notificationSound.play().catch(() => {});
    }
  }
}

// Escuchar nuevos mensajes del socket
if (typeof socket !== "undefined") {
  socket.on("chat message", msg => {
    // No notificar si el mensaje es tuyo
    if (msg.name !== nickname) {
      let chatType = msg.type === "public" ? "General" :
                     msg.type === "private" ? `Privado: ${msg.name}` :
                     msg.type === "group" ? `Grupo: ${msg.target}` : "";
      notifyUser("Nuevo mensaje", `${chatType}: ${msg.text}`);
    }
  });
}
