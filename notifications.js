// notifications.js

// URL del sonido de notificación
const notificationSound = new Audio("https://ia801505.us.archive.org/10/items/hangouts_sfx/hangouts_message.mp3");

// Función para mostrar notificación
function notifyUser(title, body) {
  if (document.hidden) { // Solo si la pestaña no está activa
    // Solicitar permiso si no lo tenemos
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
    if (Notification.permission === "granted") {
      new Notification(title, { body });
      notificationSound.play().catch(() => {}); // Reproducir sonido
    }
  }
}

// Escuchar nuevos mensajes del socket
if (typeof socket !== "undefined") {
  socket.on("chat message", msg => {
    if (msg.name !== nickname) { // No notificar tus propios mensajes
      let chatType = msg.type === "public" ? "General" :
                     msg.type === "private" ? `Privado: ${msg.name}` :
                     msg.type === "group" ? `Grupo: ${msg.target}` : "";
      notifyUser("Nuevo mensaje", `${chatType}: ${msg.text}`);
    }
  });
}
