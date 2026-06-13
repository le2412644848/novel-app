// 小说坊 CORS 代理 — Cloudflare Worker
// 部署：到 dash.cloudflare.com → Workers → 创建 → 粘贴此文件 → 部署
// 免费额度：10万次/天，足够个人使用
//
// 部署后你会得到一个 URL，形如：
//   https://novel-proxy.你的用户名.workers.dev
// 填入小说坊设置中的「代理地址」即可
//
// 支持 GET 代理（?url=目标URL）和 POST 代理（JSON body）

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get('url');

    // POST 代理：前端发送 JSON { url, method, body, contentType }
    if (request.method === 'POST') {
      try {
        const data = await request.json();
        const targetUrl = data.url;
        if (!targetUrl) {
          return new Response(JSON.stringify({ error: '缺少 url 参数' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
          return new Response(JSON.stringify({ error: '不允许的协议' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const fetchOptions = {
          method: data.method || 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9',
          }
        };
        if (data.body) {
          fetchOptions.body = data.body;
          if (data.contentType) {
            fetchOptions.headers['Content-Type'] = data.contentType;
          } else {
            fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
          }
        }

        const resp = await fetch(targetUrl, fetchOptions);
        const body = await resp.text();

        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
          }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        });
      }
    }

    // GET 代理（原有行为）
    if (!target) {
      return new Response('小说坊 CORS 代理运行中。用法: ?url=目标URL 或 POST JSON {url,method,body}', { status: 200 });
    }

    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      return new Response('不允许的协议', { status: 400 });
    }

    try {
      const resp = await fetch(target, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9',
        }
      });

      const body = await resp.text();

      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
  }
};
