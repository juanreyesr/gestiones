/* Service worker del Aula virtual: solo muestra los avisos push del curso
   (mensajes del docente, semanas y tareas nuevas, calificaciones y fechas de
   vencimiento) y abre el Aula al tocarlos. No guarda nada en cache. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    datos = { cuerpo: event.data ? event.data.text() : "" };
  }
  const titulo = datos.titulo || "Aula virtual";
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: datos.cuerpo || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/favicon-32.png",
      data: { url: datos.url || "/estudiante" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/estudiante";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const ventana of ventanas) {
        if (ventana.url.includes("/estudiante") && "focus" in ventana) return ventana.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
