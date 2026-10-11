/*
 * 서비스 워커: 오프라인에서도 앱이 열리게 파일을 저장해 둔다.
 *  - 화면(index.html): 네트워크 우선, 안 되면 저장본 (새 버전이 나오면 바로 반영)
 *  - 음성(mp3): 저장본 우선 (파일 이름이 바뀌지 않으므로 한 번 받으면 재사용)
 *  - 그 밖의 같은 사이트 파일: 저장본을 먼저 주고 뒤에서 새로 받아 둔다
 * CACHE 이름을 바꾸면 옛 저장본이 지워진다.
 */
const CACHE = 'jlpt-app-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req))
  } else if (url.pathname.includes('/audio/')) {
    event.respondWith(cacheFirst(req))
  } else {
    event.respondWith(staleWhileRevalidate(req))
  }
})

async function networkFirst(req) {
  const cache = await caches.open(CACHE)
  try {
    const res = await fetch(req)
    if (res.ok) cache.put(req, res.clone())
    return res
  } catch {
    const cached = await cache.match(req)
    return cached || cache.match('./') || Response.error()
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(req)
  if (cached) return cached
  const res = await fetch(req)
  if (res.ok || res.status === 206) cache.put(req, res.clone())
  return res
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(req)
  const network = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone())
      return res
    })
    .catch(() => undefined)
  return cached || (await network) || Response.error()
}
