# SyncBoard - Security and Protection Review

## Executive Summary
SyncBoard is a real-time collaborative whiteboard application built with React, Fabric.js, Yjs CRDTs, IndexedDB persistence, and `y-websocket` relaying over WebSockets. This protection review evaluates the architecture, identifies structural security limitations, assesses potential threat vectors, and outlines recommendations to prepare the codebase for secure production deployment.

---

## 1. System Architecture Overview

SyncBoard consists of two main subsystems:
1. **Frontend Client (`syncboard/client`)**:
   - Built with React, Vite, TypeScript, Lucide React icons, and Fabric.js canvas rendering engine.
   - Utilizes Yjs (`yjs`) for real-time conflict-free replicated data type (CRDT) document synchronization (`Y.Map` for elements, `Y.Text` for room names).
   - Manages presence and selection state via `y-websocket` awareness (`awareness.setLocalStateField`).
   - Implements local offline persistence using `y-indexeddb` (`IndexeddbPersistence`).
2. **Backend WebSocket Relay (`syncboard/server`)**:
   - A Node.js server wrapping `y-websocket/bin/utils` (`setupWSConnection`).
   - Operates as a stateless pub-sub relay broadcasting binary Yjs updates and awareness packets across connected clients.

---

## 2. Structural Security & Vulnerability Analysis

### 2.1 Unauthenticated & Authorization-Free WebSocket Relay
- **Issue**: The WebSocket relay server (`syncboard/server/index.js`) listens on port 1234 without requiring authentication tokens (e.g., JWTs, session cookies, or API keys) or authorization checks.
- **Risk**: Any arbitrary client can establish a WebSocket connection to `ws://localhost:1234` and subscribe to room updates (`syncboard-main` or any room name).
- **Impact**: Confidentiality breach (unauthorized users can inspect room canvas elements and presence metadata) and integrity breach (unauthorized users can broadcast updates).

### 2.2 Unvalidated CRDT Updates (Blind Relay Pattern)
- **Issue**: The server uses standard `y-websocket` utils which forward raw binary Yjs sync messages without inspecting or validating payload contents.
- **Risk**: Malicious actors can send synthetic or corrupted Yjs update messages directly over the WebSocket connection.
- **Impact**:
  - Memory exhaustion on connected clients by creating millions of elements or massive base64 strings.
  - UI/State corruption on connected clients.

### 2.3 Client-Side Payload Constraints & Resource Denial of Service (DoS)
- **Issue**:
  - In `Toolbar.tsx`, image file uploads are restricted to a 3MB limit (`MAX_FILE_SIZE = 3 * 1024 * 1024`) and image MIME types (`image/*`).
  - In `TopBar.tsx`, room names are restricted to 50 characters (`ROOM_NAME_MAX_LENGTH = 50`).
  - However, these limits are enforced strictly on the client side UI layer.
- **Risk**: A modified or malicious client bypasses the React UI components and transmits arbitrary base64 image strings (e.g. 100MB+) or oversized room names directly through the Yjs document map.
- **Impact**: Client browser tab freeze or crash (OOM), excessive local storage consumption in IndexedDB (`y-indexeddb`), and WebSocket bandwidth saturation.

### 2.4 Transport Security & Cross-Origin Rules
- **Issue**:
  - Default connection URL uses unencrypted `ws://` (`ws://localhost:1234`).
  - No origin verification (`Origin` header checks) or CORS policies implemented on the HTTP/WebSocket server.
- **Risk**:
  - Man-in-the-Middle (MitM) eavesdropping or tampering over unencrypted network traffic.
  - Cross-Site WebSocket Hijacking (CSWSH) if credentials or ambient auth were present.

### 2.5 Input Sanitization & XSS / Injection Vectors
- **Issue**: Text, sticky note content, status badges, and room names are rendered via Fabric.js canvas text controls (`fabric.IText`) and React DOM nodes.
- **Analysis**:
  - Fabric.js canvas text objects render text strictly as graphical paths/glyphs, neutralizing standard HTML DOM XSS attacks inside the canvas.
  - React components (`TopBar.tsx`, `CursorsLayer.tsx`, `Toolbar.tsx`) render user strings (display names, badge text, room names) using standard React JSX data bindings (e.g., `{user.name}`), which automatically escape HTML entities.
  - JSON Import feature (`handleImportJSON`) validates JSON array structure before pushing objects to `yElements`.
- **Residual Risk**: Base64 data URLs in image objects (`fabric.Image.fromURL`) could potentially be abused if invalid/corrupted protocols are passed (`javascript:` URLs in SVG elements if extended in future). Currently mitigated by null-checks in `CanvasApp.tsx`.

---

## 3. Threat Risk Matrix

| Threat Vector | Likelihood | Impact | Risk Level | Current Status / Mitigation |
|---|---|---|---|---|
| Unauthenticated WS Room Access | High | High | **CRITICAL** | Open relay, needs Auth middleware / Token validation |
| Client Resource Exhaustion (DoS) | Medium | High | **HIGH** | Client UI limits present (3MB img, 50-char room name), but missing server-side enforcement |
| Insecure Transport (`ws://`) | High | Medium | **HIGH** | Needs TLS (`wss://`) for production |
| Cross-Site WebSocket Hijacking | Medium | Medium | **MEDIUM** | Missing `Origin` header validation on WS server |
| DOM Cross-Site Scripting (XSS) | Low | Low | **LOW** | Mitigated by Fabric.js canvas text rendering & React JSX escaping |

---

## 4. Actionable Hardening Recommendations

### Short-Term Recommendations (Immediate Hardening)
1. **Server Origin & Connection Validation**:
   - Modify `syncboard/server/index.js` to inspect `req.headers.origin` and enforce an allowed origins list.
2. **Client Defensive Guards**:
   - Maintain null-safety checks in `fabric.Image.fromURL` callbacks (already implemented in `CanvasApp.tsx`).
   - Validate imported JSON files in `handleImportJSON` against strict schema boundaries before updating `yElements`.
3. **Environment Configuration**:
   - Support `WSS_URL` environment variables so clients connect over secure WebSockets (`wss://`) in non-development environments.

### Long-Term Architecture Recommendations (Production Readiness)
1. **Authentication & Room Tokens**:
   - Implement JWT/token-based handshake in `syncboard/server/index.js` (`wss.on('connection', (conn, req) => ...)`).
   - Require signed authorization tokens encoding user identity and permitted room ID.
2. **Server-Side CRDT Validation / Gatekeeping**:
   - Replace standard `y-websocket` utils with a custom Yjs server implementation (e.g., using `y-leveldb` or server-side `Y.Doc` instances).
   - Inspect Yjs update transactions server-side to enforce size limits on individual element entries (e.g. max 3MB per image entry, max 1000 total elements per room).
3. **Rate Limiting & Connection Throttling**:
   - Add connection rate limiting per IP address using `express-rate-limit` / `ws` middleware.
   - Cap frequency of awareness cursor updates to prevent connection flooding.
