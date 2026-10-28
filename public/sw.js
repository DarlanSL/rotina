// Service worker mínimo: exibe avisos do sistema e trata o clique neles.
// (No Android, `new Notification()` não funciona fora de um service worker.)

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const client = windows.find((c) => new URL(c.url).origin === self.location.origin);
      if (client) {
        await client.focus();
        client.postMessage({ type: "rotina:navigate", url });
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
