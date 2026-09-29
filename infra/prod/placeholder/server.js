// Minimal HTTP server so the Lambda Web Adapter has something to proxy
// before the API's first deploy.
require('node:http')
  .createServer((req, res) => {
    const ok = req.url === '/api/health/live';
    res.writeHead(ok ? 200 : 503, { 'content-type': 'application/json' });
    res.end(JSON.stringify(ok ? { status: 'ok' } : { message: 'API not deployed yet' }));
  })
  .listen(Number(process.env.PORT || 8080));
