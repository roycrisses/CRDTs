# SyncBoard Comprehensive Protection & Security Review

This document provides a detailed security and protection review of **SyncBoard**, a real-time collaborative whiteboard application built with React, Fabric.js, Yjs CRDTs, and a Node.js WebSocket relay server.

---

## 1. System Architecture Overview

SyncBoard consists of two main subsystems:
1. **Frontend Client (`syncboard/client`)**: React 19 single-page application utilizing Fabric.js for 2D canvas manipulation, Yjs for conflict-free replicated data types (`Y.Map` for elements, `Y.Text` for room name), `y-websocket` for state synchronization, and `y-indexeddb` for offline browser storage.
2. **Backend Relay Server (`syncboard/server`)**: Lightweight Node.js HTTP/WebSocket server invoking `y-websocket/bin/utils` (`setupWSConnection`) on port 1234 to broadcast Yjs CRDT updates and awareness signals across connected client peers.

---

## 2. Currently Implemented Security & Protection Controls

### 2.1 File Upload Limits & Type Validation
* **Location**: `syncboard/client/src/components/Toolbar.tsx`
* **Mechanisms**:
  * **File Size Constraint**: Restricts uploaded image files to a maximum size of **3MB** (`MAX_FILE_SIZE = 3 * 1024 * 1024`).
  * **MIME Type Validation**: Validates that incoming files begin with `image/` before invoking `FileReader.readAsDataURL()`.
* **Protection Benefit**: Shields client memory and network bandwidth from oversized file payloads and prevents non-image file processing.

### 2.2 Defensive Image Parsing & Crash Prevention
* **Location**: `syncboard/client/src/CanvasApp.tsx`
* **Mechanisms**:
  * Callback null-safety checks inside `fabric.Image.fromURL`.
* **Protection Benefit**: Prevents browser tab crashes or unhandled client exceptions when encountering corrupted, missing, or malformed base64 image strings received over CRDT sync.

### 2.3 Input Validation & Length Limits
* **Location**: `syncboard/client/src/components/TopBar.tsx`, `syncboard/client/src/constants.ts`
* **Mechanisms**:
  * **Room Name Truncation**: Enforces a max length of 50 characters (`ROOM_NAME_MAX_LENGTH = 50`) on the input element and inside `handleSaveRoomName`.
  * **User Display Name Truncation**: Enforces `maxLength={24}` on user display profile names.
* **Protection Benefit**: Mitigates UI layout overflow, database key bloat, and unexpected canvas label behavior.

### 2.4 React DOM Reconciliation Isolation
* **Location**: `syncboard/client/src/CanvasApp.tsx`
* **Mechanisms**:
  * Encapsulates `<canvas ref={canvasRef} />` inside a dedicated container `div`.
* **Protection Benefit**: Prevents React 19 DOM reconciliation errors (`Failed to execute 'insertBefore' on 'Node'`) caused when Fabric.js injects wrapper elements (`.canvas-container`) into the DOM structure.

### 2.5 Resource & Listener Lifecycle Cleanup
* **Location**: `syncboard/client/src/CanvasApp.tsx`
* **Mechanisms**:
  * Explicit cleanup in the `useEffect` cleanup return block:
    * Unobserves Yjs observers (`yElements.unobserve`, `yRoomName.unobserve`).
    * Detaches awareness listeners (`awareness.off`).
    * Destroys WebSocket provider (`wsProvider.destroy()`) and IndexedDB instance (`dbProvider.destroy()`).
    * Disposes Fabric canvas (`fabricCanvas.dispose()`).
* **Protection Benefit**: Prevents memory leaks, stale event callbacks, and Fabric null context (`clearRect`) errors under React StrictMode or HMR.

### 2.6 Context Sanitization & XSS Defense
* **Mechanisms**:
  * Text content (e.g. text objects, sticky notes, frame titles, status badges) is rendered through Fabric.js 2D canvas drawing APIs or React JSX text nodes rather than `dangerouslySetInnerHTML` or `eval`.
* **Protection Benefit**: Protects client instances from cross-site scripting (XSS) via injected HTML tags or script elements within board elements.

---

## 3. Structural Limitations & Architectural Vulnerabilities

### 3.1 Unauthenticated WebSocket Relay Server
* **Severity**: High
* **Impact**: Any client connecting to `ws://<server>:1234` can specify any room name (e.g., `syncboard-main`) and immediately gain read and write access to all room CRDT data and awareness streams.
* **Root Cause**: `syncboard/server/index.js` invokes `setupWSConnection(conn, req)` without verifying authentication headers, session cookies, or access tokens.

### 3.2 Unvalidated CRDT Updates
* **Severity**: High
* **Impact**: A malicious peer can forge Yjs update messages containing malformed objects, arbitrary properties, or excessive element counts, corrupting board state or causing client rendering performance degrade.
* **Root Cause**: Yjs CRDT map changes (`yElements.observe`) on the client directly deserialize incoming object properties into Fabric.js shapes without server-side or client-side schema validation (e.g., Zod schema validation).

### 3.3 Lack of WebSocket Connection & Payload Rate Limiting
* **Severity**: Medium
* **Impact**: Susceptible to Denial of Service (DoS) attacks where a malicious client connects repeatedly or floods the server with high-frequency WebSocket frames, exhausting server CPU and memory.
* **Root Cause**: Node.js `ws` server in `server/index.js` lacks rate-limiting middleware or frame rate throttling.

### 3.4 Plaintext IndexedDB Browser Persistence
* **Severity**: Low to Medium
* **Impact**: Board history stored in browser IndexedDB (`syncboard-v3`) is stored in plaintext. Local malware or untrusted scripts with access to the browser origin could inspect stored canvas state.
* **Root Cause**: `y-indexeddb` persists binary Yjs document snapshots to IndexedDB without encryption at rest.

### 3.5 Unencrypted Development Transport Protocols
* **Severity**: Medium
* **Impact**: Default connection string uses unencrypted `ws://localhost:1234`. Transporting whiteboard updates over unencrypted WebSockets in production environments exposes traffic to man-in-the-middle (MitM) eavesdropping.
* **Root Cause**: Hardcoded `ws://` protocol in default client provider initialization.

---

## 4. Threat Matrix & Risk Assessment

| Threat Vector | Attack Scenario | Risk Level | Current Control | Recommended Mitigation |
|---|---|---|---|---|
| **Unauthorized Room Access** | Attacker connects to WebSocket room URL and reads/edits board data. | **High** | None (Public room name matching) | Implement JWT authentication & room ACLs in `server/index.js`. |
| **CRDT State Pollution** | Attacker broadcasts unexpected object types or giant payloads over Yjs. | **High** | 3MB image upload restriction | Implement server/client schema validation (Zod) on CRDT updates. |
| **Denial of Service (DoS)** | Attacker floods WebSocket connection with frames to crash server or freeze peers. | **Medium** | None | Add connection rate-limiting and max payload size parameters to `ws` server. |
| **Malformed Image Crash** | Malformed image payload received on canvas. | **Low** | Null checks on `fabric.Image.fromURL` | Maintain existing null checks and add image dimensions verification. |
| **XSS / HTML Injection** | Attacker enters `<script>alert(1)</script>` as sticky note content. | **Low** | Fabric.js canvas 2D text rendering & React JSX escaping | Keep text rendering isolated from raw HTML DOM insertion. |
| **Eavesdropping (MitM)** | Attacker intercepts room traffic on open network. | **Medium** | None (Dev `ws://`) | Enforce `wss://` (TLS) and HTTPS in production deployment. |

---

## 5. Security Hardening Roadmap

To prepare SyncBoard for production deployment, the following steps are recommended:

1. **WebSocket Authentication & Room Access Control**:
   - Update `syncboard/server/index.js` to validate JWT authorization tokens passed in WebSocket query parameters or connection headers before calling `setupWSConnection`.
2. **Server-Side Payload & Rate Limiting**:
   - Set `maxPayload` on the `ws.Server` configuration (e.g., `maxPayload: 5 * 1024 * 1024`).
   - Implement IP-based connection throttling (e.g., using `express-rate-limit` or socket connection limits).
3. **CRDT Schema Enforcement**:
   - Introduce Zod schema validation on incoming Yjs element objects prior to Fabric canvas instantiation in `CanvasApp.tsx`.
4. **Transport Encryption & Secure Headers**:
   - Deploy behind a reverse proxy (e.g., NGINX or Caddy) enforcing TLS (`wss://` and `https://`).
   - Configure Content Security Policy (CSP), CORS headers, and `X-Content-Type-Options: nosniff`.
5. **Storage Security**:
   - If sensitive enterprise data is processed, consider encrypted persistence or session-only canvas modes.
