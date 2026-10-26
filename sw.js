const SHELL = "shell-ade97cd3d1", DATA = "data-v1";
const FILES = ["./", "index.html", "manifest.webmanifest", "logos.json", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("shell-") && k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/rest/v1/")) {
    e.respondWith(fetch(req).then((r) => {
      if (r.ok) { const copy = r.clone(); caches.open(DATA).then(async (c) => {
        const h = new Headers(copy.headers); h.set("x-sw-cache", String(Date.now()));
        c.put(req.url, new Response(await copy.blob(), { status: 200, headers: h }));
      }); }
      return r;
    }).catch(() => caches.open(DATA).then((c) => c.match(req.url)).then((m) => m || Response.error())));
    return;
  }
  if (url.origin === location.origin) {
    if (req.mode === "navigate") { // fresh page when online, cached when offline
      e.respondWith(fetch(req.url, { cache: "no-cache", credentials: "same-origin" }).then((r) => { if (!r.ok) throw r; const cp = r.clone(); caches.open(SHELL).then((c) => c.put("index.html", cp)); return r; })
        .catch((x) => caches.match("index.html").then((m) => m || (x instanceof Response ? x : Response.error()))));
      return;
    }
    e.respondWith(caches.match(req).then((m) => m || fetch(req)));
    return;
  }
  if (url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    e.respondWith(caches.open("fonts").then((c) => c.match(req).then((m) => m || fetch(req).then((r) => { c.put(req, r.clone()); return r; }))));
  }
});
