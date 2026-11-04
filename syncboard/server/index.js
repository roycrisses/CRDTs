const WebSocket = require('ws');
const http = require('http');
const { setupWSConnection } = require('y-websocket/bin/utils');

// HTTP server with security headers
const server = http.createServer((request, response) => {
  response.writeHead(200, {
    'Content-Type': 'text/plain',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'",
  });
  response.end('SyncBoard Yjs Relay Server');
});

// Configure WebSocket Server with 5MB maxPayload protection
const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const wss = new WebSocket.Server({
  server,
  maxPayload: MAX_PAYLOAD_BYTES,
});

// Sliding-window message rate limiter per socket
const RATE_LIMIT_WINDOW_MS = 1000;
const MAX_MESSAGES_PER_WINDOW = 200;

wss.on('connection', (conn, req) => {
  conn.isAlive = true;
  conn.on('pong', () => {
    conn.isAlive = true;
  });

  // Rate limiting message tracking
  let messageCount = 0;
  let windowStart = Date.now();

  // Intercept incoming messages to apply rate limiting guardrails
  conn.on('message', (message) => {
    const now = Date.now();
    if (now - windowStart > RATE_LIMIT_WINDOW_MS) {
      windowStart = now;
      messageCount = 0;
    }

    messageCount += 1;
    if (messageCount > MAX_MESSAGES_PER_WINDOW) {
      console.warn(`[Protection] Connection exceeded message rate limit (${messageCount} msgs/sec). Terminating socket.`);
      conn.close(1008, 'Message rate limit exceeded');
    }
  });

  setupWSConnection(conn, req);
});

// Heartbeat ping interval to clean up stale zombie connections
const HEARTBEAT_INTERVAL_MS = 30000;
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL_MS);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

const PORT = 1234;
server.listen(PORT, () => {
  console.log(`📡 Protected WebSocket server running at ws://localhost:${PORT}`);
});
