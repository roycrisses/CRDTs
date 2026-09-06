# SyncBoard Security & Protection Review

## Executive Summary

SyncBoard is a real-time collaborative whiteboard application built with React, Fabric.js, Yjs (CRDT), and WebSockets. This protection review evaluates the security posture, data protection mechanisms, structural limitations, and potential vulnerability vectors across both the client application (`syncboard/client`) and the Node.js WebSocket relay server (`syncboard/server`).

While the application leverages Yjs for conflict-free replicated data types and Fabric.js for interactive canvas rendering, several critical structural security and protection gaps exist in transport security, connection authentication, rate limiting, and client-side payload validation.

---

## 1. Scope of Assessment

The review encompasses the following components:
- **WebSocket Relay Server**: `syncboard/server/index.js` (`y-websocket` utility integration, HTTP server setup).
- **Client Real-Time Sync**: `syncboard/client/src/CanvasApp.tsx` (Yjs document integration, Fabric.js canvas bindings, awareness, IndexedDB persistence).
- **Client UI Components**: `TopBar.tsx`, `Toolbar.tsx`, `PropertyMenu.tsx`, `CursorsLayer.tsx`, `ZoomControls.tsx`.
- **Data Persistence**: `y-indexeddb` client storage and `y-websocket` memory provider.

---

## 2. Vulnerability Analysis & Protection Assessment

### 2.1 WebSocket Server Architecture (`syncboard/server/index.js`)

#### 🔴 Finding 1: Unauthenticated WebSocket Relay Connections (High Severity)
- **Description**: The WebSocket server accepts incoming connections from any client without requiring authentication credentials, session tokens, or API keys.
- **Impact**: Any user or automated script can connect to `ws://localhost:1234` and subscribe to or modify data in any collaborative session (`syncboard-main`).
- **Risk Level**: **High**

#### 🔴 Finding 2: Missing Origin & Cross-Origin Validation (Medium-High Severity)
- **Description**: The server does not validate the `Origin` header during the HTTP upgrade request (`wss.on('connection')`).
- **Impact**: Malicious third-party websites can establish WebSocket connections on behalf of visiting users (Cross-Site WebSocket Hijacking / CSWSH) to exfiltrate or tamper with whiteboard data.
- **Risk Level**: **High**

#### 🟠 Finding 3: Lack of Connection & Message Rate Limiting (Medium Severity)
- **Description**: No rate-limiting mechanisms or message frame size limits are configured on `ws.Server` or `setupWSConnection`.
- **Impact**: A malicious actor can flood the relay server with binary Yjs sync messages or rapid connection requests, leading to CPU/memory exhaustion and Denial of Service (DoS).
- **Risk Level**: **Medium**

#### 🟠 Finding 4: Unvalidated CRDT Payload Relay (Medium Severity)
- **Description**: The relay server blindly broadcasts raw Yjs update payloads to all peers in a room without payload inspection or schema enforcement.
- **Impact**: Corrupted or malicious binary updates injected by a rogue client will be distributed to all connected clients, potentially causing client-side script crashes or memory bloat.
- **Risk Level**: **Medium**

#### 🟡 Finding 5: Room Lifecycle and Resource Management (Low-Medium Severity)
- **Description**: Room instances and document states held in server memory do not enforce maximum memory thresholds or explicit room expiration policies.
- **Impact**: Long-running server instances may accumulate orphaned document states in memory over time.
- **Risk Level**: **Low-Medium**

---

### 2.2 Client-Side Application & Data Protection (`syncboard/client`)

#### 🟠 Finding 6: Client-Side CRDT Object Bounds & Payload Safety (Medium Severity)
- **Description**: In `CanvasApp.tsx`, `upsertFabricObject` receives `ElementData` objects from the Yjs map and instantiates Fabric.js objects directly. While Fabric.js safe-guards against direct DOM XSS, extreme values (e.g., scale values of `Infinity`, oversized coordinates, or thousands of path coordinates) can freeze the main UI thread.
- **Impact**: Maliciously crafted element payloads can cause client-side browser hangs or canvas rendering exceptions.
- **Risk Level**: **Medium**

#### 🟠 Finding 7: Unencrypted Local Persistence (`y-indexeddb`) (Medium Severity)
- **Description**: Whiteboard data is stored locally in browser IndexedDB under database name `syncboard-v2` in plain unencrypted JSON/binary format.
- **Impact**: Any local script running on the same origin or local device user can inspect stored whiteboard contents.
- **Risk Level**: **Low-Medium**

#### 🟢 Finding 8: Cross-Site Scripting (XSS) Assessment (Low Risk / Well Protected)
- **Description**: User text content (IText elements, sticky note contents, room names) and user profile names are rendered via Fabric.js canvas text or React plain string bindings.
- **Impact**: Direct DOM injection (`<script>` tag injection) is mitigated because Fabric.js renders text onto HTML5 `<canvas>` elements rather than evaluating raw HTML.
- **Risk Level**: **Low (Mitigated by design)**

---

### 2.3 Network & Transport Protocol Security

#### 🔴 Finding 9: Unencrypted Transport Protocol (`ws://` default) (High Severity)
- **Description**: The default client configuration connects via unencrypted `ws://` transport (`ws://localhost:1234`).
- **Impact**: Data in transit (whiteboard shapes, text, cursor coordinates) can be intercepted or modified by network eavesdroppers in non-TLS environments.
- **Risk Level**: **High**

---

## 3. Risk Summary Matrix

| Vulnerability / Issue | Severity | Target Area | Recommended Action |
| :--- | :--- | :--- | :--- |
| Unauthenticated WebSocket Access | High | Server | Implement JWT or token-based WebSocket handshake authentication. |
| Missing Origin Checking | High | Server | Verify `Origin` headers against allowed domains in upgrade handler. |
| Unencrypted Transport Protocol | High | Client/Server | Upgrade transport protocol to `wss://` (TLS) in production. |
| Rate Limiting & DoS Protection | Medium | Server | Add `express-rate-limit` / connection throttling on WebSocket upgrade. |
| CRDT Payload & Bounds Guard | Medium | Client | Add sanitization and numerical bound checks in `upsertFabricObject`. |
| Unencrypted IndexedDB Storage | Medium | Client | Encrypt sensitive data prior to `y-indexeddb` storage if required. |
| Room Lifecycle Caps | Low | Server | Implement idle timeout and room memory caps in server utilities. |

---

## 4. Actionable Mitigation Roadmap

### Phase 1: Immediate Remediation (Server & Transport Security)
1. **Enforce Origin Verification**: Validate incoming `req.headers.origin` in `index.js` before calling `setupWSConnection`.
2. **Implement TLS Protocol**: Configure `wss://` with TLS certificates for production server deployments.
3. **Set Message & Connection Limits**: Configure `maxPayload` on `ws.Server` options (e.g., `maxPayload: 10 * 1024 * 1024` for 10MB max frame size).

### Phase 2: Client & Application Hardening
1. **Input Bounds Validation**: Add defensive bounds checks in `CanvasApp.tsx` when setting scale, position, and dimensions in `upsertFabricObject`.
2. **Sanitize String Lengths**: Enforce max character limits for room names, user profile names, and text elements to prevent excessive DOM/Canvas allocation.
3. **Session Authentication**: Pass user auth tokens as query parameters on WebSocket connection setup (`WebsocketProvider('wss://...', room, ydoc, { params: { auth: token } })`).

---

## 5. Audit Log & Review Information

- **Date of Review**: June 2026
- **Reviewer**: Jules Security Engineering Agent
- **Status**: Completed
- **Document Version**: 1.0.0
