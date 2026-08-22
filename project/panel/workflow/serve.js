/* ==========================================================================
   AidaPulse 工作流看板 - 本地静态服务
   用法：node serve.js [端口]     （默认端口 8000）
   说明：服务目录 = 本文件所在目录，用于替代未安装的 python -m http.server
   ========================================================================== */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = parseInt(process.argv[2], 10) || 8000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);

  // 防目录穿越
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + urlPath);
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
    });
    res.end(data);
  });
})
  .on('error', function (err) {
    if (err.code === 'EADDRINUSE') {
      console.error('端口 ' + PORT + ' 已被占用，可能服务已在运行。');
      console.error('提示：改用其他端口，如  node serve.js 8080');
    } else {
      console.error('服务启动失败：', err.message);
    }
    process.exit(1);
  })
  .listen(PORT, () => {
    console.log('AidaPulse 工作流看板已启动：http://localhost:' + PORT + '/');
    console.log('按 Ctrl+C 停止服务。');
  });
