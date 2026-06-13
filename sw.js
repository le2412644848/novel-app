const CACHE = 'novel-v5';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  // 内置 CORS 代理：拦截 /proxy?url= 请求，由 SW 跨域抓取再返回（绕过浏览器 CORS）
  const url = new URL(e.request.url);
  if (url.pathname.endsWith('/proxy') || url.pathname.endsWith('/proxy/')) {
    const target = url.searchParams.get('url');
    if (!target || (!target.startsWith('http://') && !target.startsWith('https://'))) {
      e.respondWith(new Response('Bad request', { status: 400 }));
      return;
    }
    if (e.request.method === 'GET') {
      e.respondWith(
        fetch(target, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9',
          }
        }).then(res => {
          return new Response(res.body, {
            status: 200,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'no-cache',
            }
          });
        }).catch(err => {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 502,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        })
      );
      return;
    }
    // POST 代理
    if (e.request.method === 'POST') {
      e.respondWith(
        e.request.json().then(data => {
          return fetch(data.url, {
            method: 'POST',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'zh-CN,zh;q=0.9',
              'Content-Type': data.contentType || 'application/x-www-form-urlencoded',
            },
            body: data.body
          }).then(res => {
            return new Response(res.body, {
              status: 200,
              headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache',
              }
            });
          });
        }).catch(err => {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 502,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        })
      );
      return;
    }
  }

  // 默认缓存策略
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) {
        const r = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, r));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
