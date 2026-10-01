# SyncBoard Protection & Security Review

## Executive Summary

SyncBoard is a real-time collaborative whiteboard web application engineered with React, Fabric.js, Yjs CRDTs, and a Node.js `y-websocket` relay server. This document provides a comprehensive security and protection audit of SyncBoard, detailing its system architecture, network transport security, authentication posture, input validation safeguards, storage safety, client rendering controls, and recommended security hardening roadmap.

---

## 1. System Architecture & Threat Vectors

### System Tiering
- **Client Application**: React single-page application (SPA) executing in browser runtimes. Utilizes Fabric.js for HTML5 canvas manipulation, Lucide React icons, and Yjs (`y-websocket`, `y-indexeddb`) for Conflict-free Replicated Data Type (CRDT) document synchronization and offline persistence.
- **Relay Server**: Node.js HTTP/WebSocket server running `y-websocket/bin/utils` listening on port `1234`. Acts as a broadcast relay for Yjs binary update frames and awareness state messages.

### Key Threat Vectors
1. **Unauthenticated Access & Room Hijacking**: Publicly accessible room endpoints without access tokens or passcodes allowing unauthorized state manipulation.
2. **Denial of Service (DoS) via Payload Inflation**: Sending massive binary update frames, extremely high element counts, or bloated base64 strings to exhaust client memory or server bandwidth.
3. **Malicious JSON Import / Data Injection**: Importing crafted JSON board backups designed to cause client runtime execution exceptions or prototype corruption.
4. **Spoofing & Impersonation**: Modifying Yjs awareness state to impersonate display names or cursor colors of other active participants.
5. **Transport Interception**: Cleartext transmission over unencrypted WebSocket protocols (`ws://`) in untrusted network environments.

---

## 2. Network & Transport Security

- **Current Status**: Development relay utilizes unencrypted WebSockets (`ws://localhost:1234`).
- **Origin Validation**: The WebSocket server currently accepts incoming connections from any HTTP `Origin` header without CORS restricted checks.
- **Production Requirement**: Deployments must utilize Transport Layer Security (`wss://`) behind a reverse proxy (e.g., NGINX, Caddy, or Cloudflare) with rigid origin controls.

---

## 3. Authentication & Access Control Posture

- **Authentication Model**: Unauthenticated. Rooms are addressed via room name parameters in the WebSocket connection string (`ws://localhost:1234/syncboard-main`).
- **Authorization Granularity**: Peer-to-peer equivalence. Any connected client possesses full read and write capabilities over Yjs shared structures (`yElements` map, `yRoomName` text).
- **Awareness Integrity**: Participant metadata (name, color, cursor position, selection state) is supplied directly by local clients without cryptographic signatures or server verification.

---

## 4. Input Validation & Payload Safeguards

### Client-Side Guardrails
- **Image File Size & MIME Capping**:
  - Image uploads in `Toolbar.tsx` are constrained to a maximum file size of **3MB** (`MAX_FILE_SIZE = 3 * 1024 * 1024`).
  - Strict MIME validation enforces `file.type.startsWith('image/')` before reading data URLs.
- **Text & Room Name Sanitization**:
  - Room name updates are validated and truncated to a maximum length of **50 characters** (`ROOM_NAME_MAX_LENGTH = 50`).
  - User display names are capped at **24 characters** max length in `TopBar.tsx`.
- **JSON Backup Import Validation**:
  - `handleImportJSON` in `CanvasApp.tsx` parses uploaded files safely inside a `try/catch` block and verifies that imported array elements contain required structural properties (`id`, `type`, `position`) before appending to the Yjs document.

### Server-Side Guardrails (Gaps & Mitigation)
- **Current Limitation**: The Node.js WebSocket relay passes raw Yjs update binary frames without server-side schema verification or payload size limits.
- **Mitigation Strategy**: Implement `maxPayload` boundaries on `WebSocket.Server` in `server/index.js` to restrict frame sizes to a reasonable limit (e.g., 5MB).

---

## 5. Storage & Persistence Security

- **Browser Storage Mechanism**: `IndexeddbPersistence` (`syncboard-v3`) persists board states locally within the browser's IndexedDB database.
- **Isolation Controls**: Browser Same-Origin Policy (SOP) restricts access to stored board data strictly to the same origin.
- **Data Privacy**: Local board backups contain raw element properties. Sensitive data should not be placed on public board instances.

---

## 6. Client Rendering & Execution Safeguards

- **Fabric.js Image Rendering**: The callback in `fabric.Image.fromURL` inside `CanvasApp.tsx` incorporates defensive null checks (`if (!img) return;`) to prevent client crashes when encountering malformed base64 image strings.
- **React StrictMode & Lifecycle Hygiene**:
  - Explicit cleanup handlers on unmount unobserve Yjs structures (`yElements.unobserve`, `yRoomName.unobserve`) and disconnect awareness listeners (`awareness.off`).
  - Fabric canvas instance is safely disposed (`fabricCanvas.dispose()`) and ref cleared (`fabricRef.current = null`) to prevent stale `clearRect` invocation on null context.
- **Render Cycle Decoupling**: Viewport coordinates and floating overlay positions (`PropertyMenu`, `remoteSelections`) are computed reactively in dedicated event listeners to prevent reading refs during React render phase.

---

## 7. Hardening Recommendations Roadmap

### Phase 1: Immediate Server Hardening
1. Enforce max payload limit on the `ws` server in `syncboard/server/index.js`:
   ```javascript
   const wss = new WebSocket.Server({ server, maxPayload: 5 * 1024 * 1024 });
   ```
2. Verify connection `Origin` headers in the `connection` event listener to prevent unauthorized cross-origin framing.

### Phase 2: Authentication & Token Authorization
1. Integrate JWT or cookie-based authentication during the WebSocket handshake (`req.url` query tokens or headers).
2. Restrict room access based on token permissions (read-only vs edit rights).

### Phase 3: Infrastructure & TLS
1. Enforce HTTPS and `wss://` TLS encryption across all endpoints.
2. Implement rate limiting on WebSocket upgrades and message transmission frequency per IP address.
