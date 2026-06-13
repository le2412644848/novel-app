#!/usr/bin/env python3
"""小说坊 HTTPS 服务器 — PWA 需要 HTTPS 才能全屏安装，内置代理绕过 CORS"""
import http.server
import ssl
import socket
import os
import urllib.request
import urllib.error
import json
from urllib.parse import urlparse, parse_qs

PORT = 8443
DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(DIR)

# 自动生成自签名证书
if not os.path.exists("cert.pem") or not os.path.exists("key.pem"):
    import subprocess
    subprocess.run([
        "openssl", "req", "-x509", "-newkey", "rsa:2048",
        "-keyout", "key.pem", "-out", "cert.pem",
        "-days", "365", "-nodes",
        "-subj", "/CN=localhost"
    ], check=True)
    print("✅ 证书已生成")


class NovelServer(http.server.SimpleHTTPRequestHandler):
    """自定义服务器：静态文件 + /proxy 端点"""

    def do_GET(self):
        parsed = urlparse(self.path)

        # /proxy?url=... 代理端点，绕过 CORS
        if parsed.path == '/proxy':
            qs = parse_qs(parsed.query)
            target_url = qs.get('url', [None])[0]
            if not target_url:
                self._send_json(400, {'error': '缺少 url 参数'})
                return
            self._proxy_fetch(target_url)
            return

        # 默认：静态文件服务
        super().do_GET()

    def _proxy_fetch(self, target_url):
        """服务端抓取目标 URL，返回原始内容"""
        try:
            req = urllib.request.Request(
                target_url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'zh-CN,zh;q=0.9',
                }
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                body = resp.read()
                content_type = resp.headers.get('Content-Type', 'text/html')
                # 尝试用正确编码解码
                charset = 'utf-8'
                if 'charset=' in content_type.lower():
                    charset = content_type.lower().split('charset=')[-1].split(';')[0].strip()
                try:
                    text = body.decode(charset)
                except (UnicodeDecodeError, LookupError):
                    text = body.decode('gbk', errors='replace')

                self.send_response(200)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                self.wfile.write(text.encode('utf-8'))
        except urllib.error.HTTPError as e:
            self._send_json(e.code, {'error': f'HTTP {e.code}'})
        except Exception as e:
            self._send_json(502, {'error': str(e)})

    def do_OPTIONS(self):
        """CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def _send_json(self, status, data):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def log_message(self, format, *args):
        # 美化日志
        if '/proxy' in str(args[0]):
            print(f"  🔗 {args[0]}")
        else:
            super().log_message(format, *args)


# 启动
httpd = http.server.HTTPServer(("0.0.0.0", PORT), NovelServer)

ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain("cert.pem", "key.pem")
httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)

hostname = socket.gethostname()
local_ip = socket.gethostbyname(hostname)

print("=" * 55)
print("  小说坊 HTTPS 服务器已启动")
print("=" * 55)
print(f"  电脑访问: https://localhost:{PORT}")
print(f"  手机访问: https://{local_ip}:{PORT}")
print()
print("  🔗 内置代理: /proxy?url=...  (绕过CORS)")
print("  ⚠️  手机首次打开会提示「不安全」")
print("     点「高级」→「继续前往」即可")
print()
print("  按 Ctrl+C 停止服务器")
print("=" * 55)

try:
    httpd.serve_forever()
except KeyboardInterrupt:
    print("\n服务器已停止")
