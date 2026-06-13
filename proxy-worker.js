// 小说坊 CORS 代理 — Cloudflare Worker
// 部署：到 dash.cloudflare.com → Workers → 创建 → 粘贴此文件 → 部署
// 免费额度：10万次/天，足够个人使用
//
// 部署后你会得到一个 URL，形如：
//   https://novel-proxy.你的用户名.workers.dev
// 填入小说坊设置中的「代理地址」即可

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get('url');

    // 健康检查
    if (!target) {
      return new Response('小说坊 CORS 代理运行中。用法: ?url=目标URL', { status: 200 });
    }

    // 安全限制：只允许 http/https
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
