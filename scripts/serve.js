/**
 * scripts/serve.js
 * High-performance local development server.
 * Enables running `npm start` with zero Ruby/Jekyll installation dependencies.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { renderPage } = require('./render.js');

const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function getMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function serveStaticFile(filePath, res) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    const indexChild = path.join(filePath, 'index.html');
    if (fs.existsSync(indexChild)) {
      serveStaticFile(indexChild, res);
      return;
    }
  }

  const mime = getMime(filePath);
  res.writeHead(200, {
    'Content-Type': mime,
    'Content-Length': stat.size,
    'Cache-Control': 'no-cache'
  });

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
}

function createServer() {
  return http.createServer(async (req, res) => {
    let reqUrl = req.url || '/';
    if (reqUrl.includes('?')) reqUrl = reqUrl.split('?')[0];

    // 1. Root and index page
    if (reqUrl === '/' || reqUrl === '/index.html') {
      try {
        const html = await renderPage('index.html');
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache'
        });
        res.end(html);
        return;
      } catch (err) {
        console.error(`[serve] Render error: ${err.message}`);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`500 Internal Server Error: ${err.message}`);
        return;
      }
    }

    // 2. Direct section routes (e.g. /teaching, /bio, /publications, /blog)
    const cleanRoute = reqUrl.replace(/^\/+|\/+$/g, '');
    if (cleanRoute === 'blog') {
      res.writeHead(302, { 'Location': '/posts/introducing-mrijs/' });
      res.end();
      return;
    }
    const knownSections = ['home', 'bio', 'publications', 'teaching', 'contact'];
    if (knownSections.includes(cleanRoute)) {
      // Redirect to hash anchor or serve main page
      res.writeHead(302, { 'Location': `/#${cleanRoute}` });
      res.end();
      return;
    }

    // 3. IMAGINE subfolder workshop site
    if (reqUrl === '/IMAGINE' || reqUrl === '/IMAGINE/') {
      const imagineIndex = path.join(ROOT_DIR, 'IMAGINE', 'index.html');
      serveStaticFile(imagineIndex, res);
      return;
    }

    // 3b. Blog Post Routes (e.g. /posts/introducing-mrijs/ or /posts/introducing-mrijs)
    if (reqUrl.startsWith('/posts/')) {
      const postSlug = reqUrl.replace(/^\/posts\//, '').replace(/\/$/, '').replace(/\.html$/, '');
      const postsDir = path.join(ROOT_DIR, '_posts');
      if (fs.existsSync(postsDir)) {
        const postFiles = fs.readdirSync(postsDir);
        const matched = postFiles.find(f => {
          const baseSlug = f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.(md|html)$/, '');
          return baseSlug === postSlug || f.includes(postSlug);
        });

        if (matched) {
          try {
            const html = await renderPage(path.join('_posts', matched));
            res.writeHead(200, {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-cache'
            });
            res.end(html);
            return;
          } catch (err) {
            console.error(`[serve] Post render error: ${err.message}`);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`500 Error: ${err.message}`);
            return;
          }
        }
      }
    }

    // 4. Static files (assets, IMAGINE assets, PDFs, etc.)
    const safePath = path.normalize(decodeURIComponent(reqUrl)).replace(/^(\.\.[\/\\])+/, '');
    const candidateFile = path.join(ROOT_DIR, safePath);

    if (fs.existsSync(candidateFile) && fs.statSync(candidateFile).isFile()) {
      serveStaticFile(candidateFile, res);
      return;
    }

    // 5. 404 fallback
    const custom404 = path.join(ROOT_DIR, '404.html');
    if (fs.existsSync(custom404)) {
      serveStaticFile(custom404, res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  });
}

function startServer(port = DEFAULT_PORT) {
  const server = createServer();

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error(`Server error: ${err.message}`);
    }
  });

  server.listen(port, () => {
    console.log('\n┌────────────────────────────────────────────────────────┐');
    console.log('│                                                        │');
    console.log('│   Guillermo Sahonero - Local Development Server        │');
    console.log('│                                                        │');
    console.log(`│   ➜ Local:    http://localhost:${port}/                 │`);
    console.log(`│   ➜ Network:  http://127.0.0.1:${port}/                 │`);
    console.log('│                                                        │');
    console.log('│   Press Ctrl+C to stop the server                      │');
    console.log('└────────────────────────────────────────────────────────┘\n');
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { createServer, startServer };
