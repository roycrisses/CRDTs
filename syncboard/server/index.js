const WebSocket = require('ws');
const http = require('http');
const { setupWSConnection } = require('y-websocket/bin/utils');

const server = http.createServer((request, response) => {
  response.writeHead(200, {
    'Content-Type': 'text/plain',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  });
  response.end('SyncBoard Yjs Relay Server');
});

const wss = new WebSocket.Server({
  server,
  maxPayload: 5 * 1024 * 1024, // 5MB max payload frame limit
});

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req);
});

const PORT = 1234;
server.listen(PORT, () => {
  console.log(`📡 WebSocket server running at ws://localhost:${PORT}`);
});
