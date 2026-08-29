/* 救急観察支援メモ — オフライン用 Service Worker
   救急メモ本体だけをオフライン提供する。
   ※ scope が /myapps/ 全体に及ぶため、救急メモ以外のページ
     (bodymake / lifelog / event / index) には介入せず、常に最新を出す。 */
const CACHE = "kyukyu-v3";
const ASSETS = [
  "kyukyu.html",
  "manifest.webmanifest",
  "apple-touch-icon.png"
];

// インストール時に救急メモ一式をキャッシュ
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// 古いキャッシュ(v1/v2の誤キャッシュ含む)を掃除
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// このSWが担当するのは救急メモの資産だけ
function isKyukyuAsset(request) {
  const path = new URL(request.url).pathname.split("/").pop();
  return ASSETS.includes(path);
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // 救急メモ以外(bodymake等)はSWが介入しない=ブラウザが毎回最新を取得
  if (!isKyukyuAsset(e.request)) return;

  // 救急メモ資産: キャッシュ優先(圏外でも起動)。無ければネット→取得できたら更新
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
