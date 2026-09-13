# SyncBoard Protection & Security Review

## Executive Summary
This document provides a comprehensive security and protection review of **SyncBoard**, a real-time collaborative whiteboard application built with React, Fabric.js, Yjs, and WebSockets (`y-websocket`).

The review evaluates system architecture, client and server security postures, vulnerability risks, existing defensive safeguards, and actionable recommendations to harden the application for production deployment.

---

## Architecture & Data Flow Overview

```
 [ React Client (Fabric.js + Yjs Doc) ]
                   │
         WebSocket (y-websocket)
                   │
                   ▼
     [ Node.js Relay Server (ws) ]
                   │
     (Broadcasts CRDT updates & awareness)
```

1. **Client Layer**: Manages interactive state via Fabric.js canvas and local Yjs CRDT documents (`yElements`, `yRoomName`, Awareness).
2. **Transport Layer**: Real-time bidirectional communication powered by `y-websocket` over WebSockets (default port `1234`).
3. **Storage Layer**: Client-side local persistence using `y-indexeddb` (`syncboard-v3`). Server currently acts as an in-memory relay without persistent database storage.

---

## Protection & Security Risk Matrix

| Category | Risk Level | Threat Scenario | Mitigation / Protection Status |
| :--- | :---: | :--- | :--- |
| **Authentication & Access** | **High** | Unauthenticated users can join any room and manipulate canvas objects. | **Gap**: No token/session authentication implemented on WebSocket server. |
| **Data Integrity & Validation** | **Medium** | Malicious users could send malformed CRDT data or oversized payloads to corrupt client state. | **Partial**: Client-side image upload cap (3MB), room name length cap (50 chars), and Fabric `fromURL` null-safety checks exist. Server lacks server-side schema validation. |
| **Denial of Service (DoS)** | **Medium** | An attacker could flood the WebSocket server with binary updates or open thousands of WS connections. | **Gap**: No rate limiting, message payload size limits, or connection throttling on the Node server. |
| **XSS / Client Injection** | **Low** | Malicious text content in sticky notes or text objects injected into DOM. | **Protected**: Text rendering is handled via canvas context calls (`fabric.IText`) and React DOM escaping, preventing standard HTML script injection. |
| **Resource Exhaustion** | **Low** | Large Base64 image payload flooding canvas memory. | **Protected**: Max file size enforcement (`3MB`), image MIME type validation, base64 payload containment. |

---

## Detailed Security Analysis

### 1. Server Security (`syncboard/server/index.js`)
* **Current Implementation**:
  ```javascript
  const wss = new WebSocket.Server({ server });
  wss.on('connection', (conn, req) => {
    setupWSConnection(conn, req);
  });
  ```
* **Findings**:
  * **No Authentication**: The WebSocket endpoint accepts any incoming connection without validating tokens, API keys, or cookies.
  * **No Rate Limiting / Connection Throttling**: Lacks connection per IP limits, making the relay server vulnerable to connection flooding.
  * **No Server-side Payload Limit**: `ws` instance relies on default limits; huge CRDT messages could cause server buffer memory spikes.

### 2. Client Security & Data Protection (`syncboard/client/src/`)
* **Input Validation & Payload Controls**:
  * **Image Uploads (`Toolbar.tsx`)**: Validates MIME type (`image/*`) and strictly enforces `MAX_FILE_SIZE = 3 * 1024 * 1024` (3MB).
  * **Room Name (`TopBar.tsx`)**: Enforces `ROOM_NAME_MAX_LENGTH = 50` on input fields and trims whitespace on blur/submit.
  * **Canvas Image Parsing (`CanvasApp.tsx`)**: Null-safety check inside `fabric.Image.fromURL` callback prevents application crash on corrupted Base64 strings.
* **XSS & Code Injection**:
  * Fabric.js renders elements using 2D canvas context (`fillText` API), which naturally escapes HTML/JavaScript strings. React DOM components escape dynamic string renders.

### 3. State Persistence & Privacy
* **Client-side Persistence (`IndexeddbPersistence`)**:
  * Canvas state is cached locally in IndexedDB under `syncboard-v3`. Clearing browser cache or initiating explicit clear board action purges local state.
* **Data Transmission**:
  * WebSockets currently operate over unencrypted `ws://`. Production environments must enforce TLS (`wss://`).

---

## Existing Protection Safeguards Summary
1. **Base64 & Image Null Checks**: Robust checks preventing canvas crashes on invalid image URLs or missing image instances.
2. **Client-side Input Constraints**: Maximum file size limit (3MB) and room name string boundary limits (50 characters).
3. **Decoupled Yjs & React State Architecture**: Prevents cascading render loops and unhandled memory leaks via cleanup of observers and awareness event handlers.
4. **Strict Mode & HMR Resilience**: Explicit nullification of `fabricRef.current = null` on unmount to eliminate `clearRect` runtime errors.

---

## Actionable Recommendations for Hardening

### Priority 1: High (Server & Access Control)
1. **Implement WebSocket Authentication**:
   * Add JWT or cookie-based session verification inside the `connection` event of `syncboard/server/index.js`.
2. **Enforce TLS Encryption (`wss://`)**:
   * Terminate SSL/TLS at a reverse proxy (e.g., Nginx, Caddy, Cloudflare) or directly in Node HTTP/HTTPS server.

### Priority 2: Medium (DoS & Rate Limiting)
1. **Server Rate Limiting & Message Size Cap**:
   * Configure `maxPayload` on `ws.Server` options (e.g., 5MB limit).
   * Implement IP-based connection limits using `express-rate-limit` or custom WS connection tracking.
2. **CRDT Schema Validation**:
   * Validate key structure and object properties in Yjs element maps to prevent rogue client state corruption.

### Priority 3: Low (Operational & Monitoring)
1. **Add CORS & Origin Header Checking**:
   * Verify the `Origin` header during WebSocket handshake to prevent unauthorized cross-origin connections.
2. **Logging & Health Monitoring**:
   * Add structured logging for connection events, room creation, and error rates.
