// 小说坊 CORS 代理 — Cloudflare Worker v2
// 部署：Cloudflare Workers → 创建 → 粘贴 → 部署
export default {
  async fetch(request) {
    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };

    const url = new URL(request.url);
    const target = url.searchParams.get('url');

    // POST 代理
    if (request.method === 'POST') {
      try {
        const data = await request.json();
        const targetUrl = data.url;
        if (!targetUrl) return json({ error: '缺少 url' }, 400);

        const resp = await fetch(targetUrl, {
          method: data.method || 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,*/*',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Content-Type': data.contentType || 'application/x-www-form-urlencoded',
          },
          body: data.body,
        });
        return new Response(await resp.text(), { headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' } });
      } catch (e) {
        return json({ error: e.message }, 502);
      }
    }

    // GET 代理
    if (!target) {
      return new Response('小说坊 CORS 代理运行中。用法: ?url=目标URL', { status: 200, headers: corsHeaders });
    }

    try {
      const resp = await fetch(target, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Referer': target,
        }
      });

      const body = await resp.text();
      return new Response(body, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      });
    } catch (e) {
      return json({ error: e.message }, 502);
    }
  }
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}
