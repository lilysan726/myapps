/* 救急観察支援メモ — オフライン用 Service Worker
   アプリ本体をキャッシュし、圏外でも起動できるようにする。 */
const CACHE = "kyukyu-v2";
const ASSETS = [
  "kyukyu.html",
  "manifest.webmanifest",
  "apple-touch-icon.png"
];

// インストール時にアプリ一式をキャッシュ
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// 古いキャッシュを掃除
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 取得：キャッシュ優先（圏外でも動く）。無ければネット→取れたらキャッシュ更新
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match("kyukyu.html"));
    })
  );
});
