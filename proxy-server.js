import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

const PORT = 3001;

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Only handle /proxy endpoint
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  if (reqUrl.pathname !== '/proxy') {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  const targetUrlStr = reqUrl.searchParams.get('url');
  if (!targetUrlStr) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Missing "url" query parameter');
    return;
  }

  try {
    const targetUrl = new URL(targetUrlStr);
    const protocol = targetUrl.protocol === 'https:' ? https : http;

    const options = {
      method: req.method,
      headers: { ...req.headers, host: targetUrl.host }, // Forward headers, update Host
      rejectUnauthorized: false, // Ignore SSL certificate errors (self-signed, internal CA)
    };

    // Remove headers that might cause issues
    delete options.headers['host'];
    delete options.headers['origin'];
    delete options.headers['referer'];

    const proxyReq = protocol.request(targetUrl, options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Proxy Error: ${err.message}`);
    });

    req.pipe(proxyReq, { end: true });

  } catch (err) {
    console.error('Invalid URL:', err);
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end(`Invalid URL: ${err.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
