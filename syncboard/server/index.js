const WebSocket = require('ws');
const http = require('http');
const { setupWSConnection } = require('y-websocket/bin/utils');

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('SyncBoard Yjs Relay Server');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req);
});

const PORT = 1234;
server.listen(PORT, () => {
  console.log(`📡 WebSocket server running at ws://localhost:${PORT}`);
});
