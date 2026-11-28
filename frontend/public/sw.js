self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "Studio", body: "", url: "/admin" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    data = { title: "Studio", body: "", url: "/admin" };
  }
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || "Studio", { body: data.body || "", data }),
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
        for (const windowClient of windows) {
          windowClient.postMessage({ type: "studio-order", title: data.title, storeId: data.storeId || "" });
        }
      }),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin";
  event.waitUntil(self.clients.openWindow(url));
});
