const WebSocket = require('ws');
const http = require('http');
const { setupWSConnection } = require('y-websocket/bin/utils');

const PORT = process.env.PORT || 1234;
const MAX_PAYLOAD = 5 * 1024 * 1024; // 5MB payload limit
const RATE_LIMIT_WINDOW_MS = 1000;
const MAX_MESSAGES_PER_WINDOW = 100;

// HTTP Server with Security Headers
const server = http.createServer((request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Content-Security-Policy', "default-src 'none'");

  if (request.url === '/health' || request.url === '/') {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end('SyncBoard Yjs Relay Server - Healthy & Protected');
  } else {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not Found');
  }
});

// WebSocket Server with Payload Limits
const wss = new WebSocket.Server({
  server,
  maxPayload: MAX_PAYLOAD,
});

// Heartbeat & Ping-Pong Setup
function noop() {}

function heartbeat() {
  this.isAlive = true;
}

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.warn('⚠️ Terminating inactive/zombie WebSocket connection');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping(noop);
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// Client Connection Handling with Protection Guardrails
wss.on('connection', (conn, req) => {
  conn.isAlive = true;
  conn.on('pong', heartbeat);

  // Rate Limiting Metrics
  let messageCount = 0;
  let windowStart = Date.now();

  // Inspect incoming frames for rate limiting
  conn.on('message', () => {
    const now = Date.now();
    if (now - windowStart > RATE_LIMIT_WINDOW_MS) {
      windowStart = now;
      messageCount = 0;
    }

    messageCount++;
    if (messageCount > MAX_MESSAGES_PER_WINDOW) {
      console.warn(`⚠️ Rate limit exceeded for client from ${req.socket.remoteAddress}. Closing connection.`);
      conn.close(1008, 'Rate limit exceeded');
      return;
    }
  });

  // Setup Yjs WebSocket relay
  setupWSConnection(conn, req);
});

server.listen(PORT, () => {
  console.log(`📡 WebSocket server running at ws://localhost:${PORT} (Max Payload: 5MB, Rate Limiting: Active)`);
});
