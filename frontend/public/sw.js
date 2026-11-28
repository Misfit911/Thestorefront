self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "Studio", body: "", url: "/admin" };
  event.waitUntil(self.registration.showNotification(data.title || "Studio", { body: data.body || "", data }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin";
  event.waitUntil(clients.openWindow(url));
});
