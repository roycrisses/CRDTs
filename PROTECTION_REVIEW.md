# SyncBoard Security & Protection Review

This document provides a comprehensive security and protection review of the SyncBoard codebase, detailing structural limitations, security vulnerabilities, potential risks, and recommended mitigation strategies.

---

## 1. Executive Summary
SyncBoard is a real-time collaborative whiteboard built using React, Fabric.js, and Yjs (with `y-websocket` and `y-indexeddb`). While highly performant and responsive, the current architecture delegates major responsibilities to the client with minimal server-side oversight. This creates several structural limitations and security risks:
- **Unauthenticated WebSocket Relay**: The server blindly broadcasts any room and state update to all connected clients.
- **Unvalidated CRDT Updates**: The server does not validate the integrity, schema, or content of Yjs binary state updates.
- **Client-Side Payload Constraints**: File and image uploads are only limited on the frontend, exposing the websocket server and other clients to massive payloads and denial-of-service (DoS) vectors.
- **Execution & Storage Security**: The system has no mechanisms to prevent cross-site scripting (XSS), abusive board clearing, or unauthorized room manipulation.

---

## 2. Structural Limitations & Vulnerabilities

### 2.1 Unauthenticated WebSocket Relay
The WebSocket server (`syncboard/server/index.js`) is an open relay using a standard `y-websocket` handler without verification:
```javascript
const wss = new WebSocket.Server({ server });
wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req);
});
```
- **Risk**: Anyone can connect to the WebSocket server at `ws://localhost:1234` and subscribe to or create any room name (e.g., `syncboard-main`).
- **Impact**: Severe lack of confidentiality. Unauthorized users can eavesdrop on private whiteboards, tamper with existing drawing elements, or flood the room with garbage data.

### 2.2 Unvalidated CRDT / Yjs Updates
Yjs works by synchronizing document updates as binary state difference payloads. The backend node server serves as a stateless router that broadcasts these chunks to other clients.
- **Risk**: Because the server does not decode, validate, or parse these binary packets, a malicious client can inject arbitrary properties, invalid types, or extremely large payloads.
- **Impact**:
  - **Client-Side Crashes**: Forcing invalid element structures (e.g., non-numeric coordinates, broken paths, or undefined types) can crash rendering logic on other clients under StrictMode or regular runtimes.
  - **Memory/Resource Exhaustion**: Flooding the Y.Map with millions of mock elements can saturate CPU usage and trigger out-of-memory crashes on all connected browsers.

### 2.3 Client-Side Payload Constraints
The application supports file/image uploads, and restricts upload size to `3MB` strictly within the client-side UI (`Toolbar.tsx` or similar file-picker handler).
- **Risk**: Client-side enforcement can be easily bypassed by intercepting or writing custom WebSocket packets.
- **Impact**: Attackers can broadcast multi-gigabyte files or high-resolution image strings as base64 in the element's `content` payload. This results in:
  - Excessive bandwidth consumption on the relay server.
  - Performance degradation or socket disconnection for clients on slower networks.
  - Browser crashes when Fabric.js attempts to process or decode huge corrupted base64 payloads.

### 2.4 Lack of Authorization and Rate Limiting
- **No Room Access Control**: There is no distinction between room owners, editors, and read-only viewers. Anyone can invoke `clearBoard()` which resets the synchronized `yElements` map for everyone.
- **No Rate Limiting**: The WebSocket server accepts a virtually unlimited number of connections and message frames. A single script can generate thousands of canvas elements per second, making the service completely unusable.

---

## 3. Threat Vector Analysis & Exploitation Scenarios

| Threat Vector | Description | Vulnerability Exploited | Severity |
| :--- | :--- | :--- | :--- |
| **Data Exfiltration** | An attacker joins random rooms (by guessing names or brute-forcing) and harvests whiteboard content. | Unauthenticated WebSocket connection | High |
| **Board Hijacking / Vandalism** | An unauthorized client deletes all active whiteboard shapes or writes offensive content. | Lack of room authorization; unrestricted write access | High |
| **Denial of Service (DoS)** | A script floods WebSocket channels with massive random canvas updates, exhausting network bandwidth and client memory. | Missing server-side rate limits and payload size validation | High |
| **Cross-Site Scripting (XSS)** | Injecting malicious JavaScript inside text or sticky note elements (`content`) that executes when other clients edit or render them. | Unsanitized rendering of collaborative text fields | Medium |

---

## 4. Recommended Mitigation Strategies

To transform SyncBoard into a robust, production-ready system, we recommend implementing the following security measures:

### 4.1 Implement JWT Authentication & Room Authorization
- **Token-Based Handshake**: Before upgrading the HTTP request to a WebSocket connection, require a JSON Web Token (JWT) in the query parameters or authorization headers.
- **Access Control Matrix**: Validate that the authenticated user has explicit permission (Read, Write, Owner) to access the requested room (e.g., `syncboard-main`).

### 4.2 Server-Side Payload Validation & Size Limiting
- **Limit Message Frame Sizes**: Configure the `ws` server with `maxPayload` limiters (e.g., 5MB) to reject oversized frames immediately at the TCP/Websocket level.
- **CRDT Message Inspection**: Implement server-side document decoding (using Yjs in Node.js) to inspect incoming updates, verify schema compliance, and enforce file size caps on synchronized map elements.

### 4.3 Rate Limiting & Connection Throttling
- **IP-Based Throttling**: Apply rate limiters (such as `express-rate-limit` or custom Redis-based buckets) on connection handshakes.
- **Message Rate Clamping**: Throttle the number of websocket updates allowed per client per second (e.g., maximum 60 updates/sec for smooth drawing, dropping excessive frames).

### 4.4 Defensive Coding & Input Sanitization
- **XSS Prevention**: Sanitize all text contents (using libraries like `DOMPurify` or `isomorphic-dompurify`) before inserting or editing them in IText or HTML overlays.
- **Robust Null-Safety & Fallbacks**: In `CanvasApp.tsx`, preserve strict try-catch handlers when parsing elements, loading remote images via `fabric.Image.fromURL`, or manipulating viewport coordinates to prevent cascading frontend crashes.

---

## 5. Conclusion
While SyncBoard's use of Yjs delivers exceptional real-time reactivity, the reliance on client-side safety measures leaves the server and other participants vulnerable to exploitation. Adopting token-based authentication, implementing server-side WebSocket payload limitations, and enforcing strict input validation will successfully secure the environment for high-availability enterprise use.
