# SyncBoard Security & Protection Review

## Executive Summary
SyncBoard is a real-time collaborative whiteboard application built with React, Fabric.js, Yjs CRDTs, and a Node.js WebSocket relay server (`y-websocket`). This document presents a comprehensive review of the current security mechanisms, safeguards, architectural limitations, potential attack vectors, and recommendations for production hardening.

---

## 1. Implemented Safeguards & Security Controls

### 1.1 Client-Side Input & Payload Constraints
- **File Upload Limits:** In `syncboard/client/src/components/Toolbar.tsx`, image file uploads are strictly validated:
  - File size cap enforced via `MAX_FILE_SIZE = 3MB` (`3 * 1024 * 1024` bytes) in `constants.ts`.
  - Content type validation (`file.type.startsWith('image/')`) prevents non-image file uploads.
- **String Length Limits:**
  - Room name input is clamped to `ROOM_NAME_MAX_LENGTH = 50` characters in `TopBar.tsx`.
  - User display names are capped at 24 characters (`maxLength={24}`) in the profile menu in `TopBar.tsx`.
- **JSON Board Backup Import Validation:**
  - `handleImportJSON` in `CanvasApp.tsx` parses JSON files wrapped in `try/catch` blocks and verifies array structure (`Array.isArray(elements)`) and essential element properties (`el.id && el.type && el.position`) before syncing to the CRDT map.

### 1.2 Rendering Safety & Stability Mechanisms
- **Null-Safety in Async Image Loading:** `fabric.Image.fromURL` in `CanvasApp.tsx` includes explicit checks (`if (!img) return;`) preventing browser crashes or canvas context errors if base64 data or URLs fail to load.
- **Strict Mode & Component Cleanup Protection:**
  - To prevent memory leaks, duplicate WebSocket connections, or Fabric `clearRect` null errors under React 19 StrictMode / Hot Module Replacement (HMR):
    - Observers on `yRoomName` and `yElements` are cleaned up (`unobserve`).
    - Awareness listeners are detached (`awareness.off`).
    - Fabric canvas instance is safely disposed (`fabricCanvas.dispose()`) and `fabricRef.current` reset to `null`.
- **DOM Reconciliation Collision Prevention:** `<canvas ref={canvasRef} />` is wrapped inside a dedicated container `div` (`containerRef`) preventing React 19 DOM insertion/reconciliation conflicts when Fabric.js manipulates `.canvas-container` wrappers.
- **Decoupled State Management:** Floating UI overlays (`PropertyMenu`, `remoteSelections`, user profile changes) are updated via decoupled event listeners or dedicated `useEffect` hooks, respecting React's rule against accessing refs during rendering.

---

## 2. Structural Limitations & Vulnerabilities

### 2.1 Unauthenticated WebSocket Relay Server
- **Issue:** The relay server in `syncboard/server/index.js` uses standard `y-websocket/bin/utils` without an authentication handshake.
- **Risk:** Any client capable of reaching `ws://<host>:1234` can connect to any room namespace (`syncboard-main` or arbitrary room query string) without credentials, tokens, or authorization checks.
- **Impact:** Unauthorized users can join active collaborative rooms, view real-time state, and modify or clear whiteboard elements.

### 2.2 Unvalidated CRDT Update Broadcasting
- **Issue:** The relay server functions as a pass-through broadcaster for Yjs CRDT binary messages. It does not inspect, validate, or sanitize incoming updates against a schema.
- **Risk:** A compromised or malicious client sending manipulated CRDT updates could inject arbitrary properties or corrupt shared maps (`ydoc.getMap('elements')`).
- **Impact:** Malicious payload injection or state corruption across all connected clients in a workspace.

### 2.3 Absence of Rate Limiting & DoS Safeguards
- **Issue:** Neither the WebSocket server (`syncboard/server/index.js`) nor the HTTP wrapper implements connection or message rate limiting.
- **Risk:** An attacker could establish hundreds of concurrent WebSocket connections or flood the server with high-frequency cursor/awareness events (`mouse:move`) or rapid element creation/deletion cycles.
- **Impact:** Server CPU/memory exhaustion and client-side rendering bottlenecks or freezes.

### 2.4 Unrestricted Cross-Origin Connections (CORS / CSWSH)
- **Issue:** The WebSocket server does not inspect or validate `req.headers.origin` during connection handshakes.
- **Risk:** A malicious third-party site visited by a user could open a WebSocket connection to `ws://localhost:1234` or the production relay server.
- **Impact:** Cross-Site WebSocket Hijacking (CSWSH), enabling unintended data leakage or unauthorized room manipulation.

### 2.5 Lack of Server-Side Persistence Authorization & Access Logging
- **Issue:** Room updates are processed purely in memory and via client-side `y-indexeddb` persistence. The relay server lacks connection logging, audit trails, or role-based access control (RBAC).
- **Risk:** Malicious board wipes or element deletions cannot be traced back to IP addresses or authenticated identities.

---

## 3. Production Hardening Roadmap & Recommendations

1. **Implement Token-Based Authentication (JWT):**
   - Require JWT authentication tokens in WebSocket connection query parameters or handshake headers (`ws://host:1234?token=<jwt>`).
   - Reject unauthenticated connections in `wss.on('connection', ...)`.

2. **Add Origin Verification (CSWSH Protection):**
   - Validate `req.headers.origin` against an allowed domain whitelist before calling `setupWSConnection`.

3. **Enforce Rate Limiting & Message Size Bounds:**
   - Integrate rate-limiting middleware (e.g., connection limits per IP address and maximum allowed WebSocket frame size).
   - Throttle awareness state broadcast frequencies on the client and server.

4. **Server-Side Schema Validation & Permission Control:**
   - Implement read-only / write permission roles in room tokens.
   - Validate Yjs update payloads on the server or via a dedicated Yjs server extension before broadcasting to room peers.

5. **Audit Logging & Network Security:**
   - Log WebSocket connection events, room access, and disconnections with timestamped IP addresses for auditing.
   - Enforce TLS encryption (`wss://`) in production environments.
