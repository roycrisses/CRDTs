# SyncBoard Security & Protection Review

## Overview
SyncBoard is a real-time collaborative whiteboard application built on a client-server architecture using **React**, **Fabric.js**, **Yjs (CRDTs)**, and a **WebSocket Relay Server** (`y-websocket`).

This security and protection review provides a comprehensive analysis of the system's current architecture, identifying structural limitations, security vulnerabilities, and attack vectors, along with actionable mitigation strategies required for production readiness.

---

## 1. WebSocket Authentication & Access Control Limitations

### Current Architecture
- The WebSocket relay server in `syncboard/server/index.js` listens on port `1234` using `y-websocket/bin/utils`.
- Incoming connections (`wss.on('connection')`) directly execute `setupWSConnection(conn, req)` without verifying authentication tokens, origin headers, or user identity.

### Structural Vulnerabilities
- **Unauthenticated Room Access:** Any client capable of opening a WebSocket connection to `ws://<host>:1234` can join any room name (`syncboard-main` or arbitrary room IDs) and receive the complete room state.
- **Missing Authorization / Room Access Control:** There are no room access control lists (ACLs) or role-based permissions (e.g., read-only guests vs. editor users). Any connected socket can read, create, modify, or delete board elements.
- **Session Impersonation:** Awareness state is client-reported (user name and color in `CanvasApp.tsx`). A malicious client can spoof any user's identity or cursor location across the workspace.

---

## 2. CRDT Updates & Unvalidated Document Mutations

### Current Architecture
- State synchronization relies on Yjs binary updates (`Y.Doc` maps and text types) relayed statelessly by the Node.js server.
- The server acts as a pure message pipe/broadcaster without deserializing or validating Yjs state updates.

### Structural Vulnerabilities
- **Unvalidated State Mutations:** Because the server does not parse or validate incoming Yjs update payloads, clients can emit malformed, oversized, or malicious CRDT updates.
- **Arbitrary Data Insertion:** A compromised client can inject arbitrary key-value pairs into `yElements` (e.g., unexpected object properties, invalid nested structures, or script payloads).
- **Destructive Bulk Deletions:** Any user can emit updates that clear the entire `Y.Map` or overwrite global room text (`roomName`), destroying collaborative work without server-side validation or backup snapshots.

---

## 3. Payload Constraints: Client-Side vs. Server-Side

### Current Architecture
- **Image Upload Constraints:** `Toolbar.tsx` enforces client-side validation on file upload:
  - File type check (`file.type.startsWith('image/')`)
  - File size limit (`MAX_FILE_SIZE = 3MB`)
- **Room Name Length Limit:** `TopBar.tsx` enforces `maxLength={50}` on the room name input field.

### Structural Vulnerabilities
- **Bypassing Client Controls:** Client-side checks in React components are cosmetic security controls. A malicious actor using a custom WebSocket script or modified client can bypass React component limits and transmit multi-megabyte base64 images, oversized strings, or corrupted binary blobs over the WebSocket.
- **Memory & Bandwidth Exhaustion:** Storing large base64 data URLs inside Yjs CRDT documents inflates the Yjs update size, causing high CPU usage during CRDT encoding/decoding, high memory consumption on peers, and WebSocket frame buffer bloat on the relay server.

---

## 4. Input Sanitization & XSS / Injection Attack Vectors

### Current Architecture
- Board elements support free-form text (`IText` in Fabric.js) and base64/URL image sources rendered via `fabric.Image.fromURL`.
- Base64 image parsing in `CanvasApp.tsx` uses `crossOrigin: 'anonymous'` and null-safety callbacks.

### Structural Vulnerabilities
- **SVG / Base64 Script Injection:** Rendering arbitrary remote image URLs or embedded SVG data URLs via Fabric.js without strict Content Security Policy (CSP) or MIME validation can lead to cross-site scripting (XSS) if SVGs contain embedded JavaScript (`<script>` or inline handlers).
- **DOM / Canvas Context Corruption:** Unexpected string values or special formatting sequences in text or sticky notes can break layout rendering or trigger client runtime exceptions if property types are mutated.

---

## 5. Denial of Service (DoS) & Rate-Limiting Gaps

### Current Architecture
- Real-time features include continuous mouse move events (`cursor` awareness) and `laser` pointer trails emitted during canvas interaction.
- The WebSocket server does not implement message rate limiting or connection throttling.

### Structural Vulnerabilities
- **WebSocket Flooding:** A client sending high-frequency WS messages (e.g., thousands of cursor movements or path updates per second) can saturate server CPU and network bandwidth.
- **Client Unresponsiveness:** Excessive awareness updates force all connected React clients to execute high-frequency state updates, causing browser UI freeze or frame drops.

---

## 6. Data Persistence & Storage Security

### Current Architecture
- Client state is cached locally in IndexedDB via `y-indexeddb` (`syncboard-v3`).
- Server relay currently maintains ephemeral state without server-side encrypted storage or database persistence.

### Structural Vulnerabilities
- **Unencrypted Local Cache:** Sensitive whiteboard data stored in IndexedDB is unencrypted at rest on the user's browser storage.
- **Lack of Server Audit Logging:** Absence of server-side transaction logs makes it impossible to trace unauthorized modifications or audit user actions in compliance-sensitive environments.

---

## 7. Actionable Production Hardening Roadmap

To transition SyncBoard to a secure production-grade architecture, the following mitigations are recommended:

1. **Authentication & Authorization (WSS + JWT):**
   - Require JWT token authentication on WebSocket upgrade handshakes (`wsProvider` query params or headers).
   - Validate token signatures and verify room access permissions before calling `setupWSConnection`.

2. **Server-Side Payload & Connection Rate-Limiting:**
   - Implement WebSocket rate limiting using middlewares (e.g., `express` / `ws` rate limiters) to cap incoming message frequency per connection.
   - Enforce hard limits on maximum WebSocket message frame size (e.g., 1MB) directly at the server level (`maxPayload` option in `ws.Server`).

3. **Server-Managed Persistence & Validation Layer:**
   - Integrate `y-hasura` or a custom server-side Yjs binding (`y-sqlite` / `y-redis`) to parse CRDT updates on the server, validate schema compliance, and maintain persistent, versioned snapshots with rollbacks.
   - Offload large file uploads to object storage (e.g., AWS S3 / Cloudflare R2) and store clean HTTPS image URLs in board state rather than inline base64 data URLs.

4. **Client Hardening & Content Security Policy (CSP):**
   - Enforce strict CSP headers (`script-src 'self'`, `img-src 'self' data: https:`) to prevent execution of malicious code from injected image/SVG payloads.
   - Throttle client cursor and laser pointer event emission using `lodash.throttle` or `requestAnimationFrame`.
