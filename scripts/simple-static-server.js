const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.argv[2] ? parseInt(process.argv[2], 10) : 53822;
const root = path.resolve(__dirname, '..', 'frontend');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  try {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' ) reqPath = '/index.html';
    const file = path.join(root, decodeURIComponent(reqPath));
    if (!file.startsWith(root)) {
      res.writeHead(403, {'Content-Type':'text/plain'});
      res.end('Forbidden');
      return;
    }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) {
        res.writeHead(404, {'Content-Type':'text/plain'});
        res.end('Not Found');
        return;
      }
      const ext = path.extname(file).toLowerCase();
      const ct = mime[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': ct,
        'Content-Length': st.size,
        'Cache-Control': 'max-age=0'
      });
      const stream = fs.createReadStream(file);
      stream.pipe(res);
      stream.on('error', () => { res.destroy(); });
    });
  } catch (e) {
    res.writeHead(500, {'Content-Type':'text/plain'});
    res.end('Server error');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Simple static server serving ${root} at http://127.0.0.1:${port}`);
});

process.on('SIGINT', () => process.exit());
