# SyncBoard - Security & Protection Review

## Executive Summary
This document provides a comprehensive security, data integrity, and application protection review for **SyncBoard**, a real-time collaborative whiteboard built on React, Fabric.js, Yjs CRDTs, and Node.js WebSockets. It details existing architectural safeguards, identified structural risks, client/server resource controls, and a prioritized remediation roadmap.

---

## 1. WebSocket & Relay Server Architecture

### Current Implementation
- **Relay Server**: Located in `syncboard/server/index.js`, using `y-websocket/bin/utils` over HTTP/WS on port 1234.
- **Client Connection**: Configured in `syncboard/client/src/CanvasApp.tsx` via `WebsocketProvider('ws://localhost:1234', 'syncboard-main', ydoc)`.

### Findings & Identified Risks
1. **Unauthenticated Relay Endpoint**: Any WebSocket client can connect to `ws://localhost:1234` without auth tokens, session cookies, or origin verification.
2. **Missing Room Access Control**: Rooms (`syncboard-main` or arbitrary room names) can be joined by any connected client.
3. **Plaintext Transport (WS)**: Connection uses unencrypted `ws://` rather than encrypted `wss://`, exposing real-time board changes to network sniffing.
4. **Lack of Rate Limiting**: The server does not restrict message frequency or bandwidth usage per socket connection, creating potential DoS vulnerabilities.

---

## 2. CRDT Data Integrity & State Management

### Current Implementation
- **Shared Data Structures**: `yElements` (`Y.Map<ElementData>`), `yRoomName` (`Y.Text`), and `awareness` (ephemeral cursor/selection/user state).
- **Offline Persistence**: `IndexeddbPersistence('syncboard-v3', ydoc)` provides client-side offline storage.
- **Backup & Restore**: JSON export/import allows serialization and restoration of canvas elements.

### Findings & Identified Risks
1. **Client-Side Clearance Authority**: Any connected client can call `yElements.clear()`, wiping the entire whiteboard for all connected participants without requiring elevated permissions.
2. **Unvalidated CRDT Updates**: The WebSocket relay forwards raw binary Yjs update vectors indiscriminately.
3. **JSON Import Validation**: In `CanvasApp.tsx`, JSON imports use `JSON.parse` with basic array and required property checks (`el.id`, `el.type`, `el.position`), preventing corrupted or malformed payloads from breaking the canvas state.

---

## 3. Client Payload & Resource Protections

### Implemented Controls
1. **File Upload Size & Type Limits**:
   - Implemented in `syncboard/client/src/components/Toolbar.tsx`.
   - File size restricted to **3MB** max (`MAX_FILE_SIZE = 3 * 1024 * 1024`).
   - File type validated via `file.type.startsWith('image/')` to prevent non-image file processing.
2. **Room Name Input Constraints**:
   - Implemented in `syncboard/client/src/components/TopBar.tsx`.
   - Input field enforces `maxLength={50}` (`ROOM_NAME_MAX_LENGTH`).
   - Text trimmed and sanitized on blur/save to avoid memory or UI layout overflow.
3. **Base64 Image Render Guard**:
   - Implemented in `syncboard/client/src/CanvasApp.tsx`.
   - Callback inside `fabric.Image.fromURL` checks `if (!img) return;` before attaching to canvas, protecting against client crashes from malformed base64 strings.

---

## 4. UI Stability & Canvas Rendering Controls

### Implemented Controls
1. **React 19 DOM Reconciliation Wrapper**:
   - In `CanvasApp.tsx`, the `<canvas ref={canvasRef} />` element is enclosed inside a dedicated `div` container.
   - Prevents React 19 DOM reconciliation errors (`Failed to execute 'insertBefore' on 'Node'`) caused when Fabric.js dynamically wraps the canvas element in `.canvas-container`.
2. **StrictMode & Hot-Module Reloading (HMR) Cleanup**:
   - The primary `useEffect` in `CanvasApp.tsx` performs explicit resource cleanup on unmount:
     - Disposes Fabric.js canvas (`fabricCanvas.dispose()`).
     - Resets `fabricRef.current = null`.
     - Destroys Yjs WebSocket & IndexedDB providers.
     - Unobserves Yjs events (`yElements.unobserve`, `yRoomName.unobserve`).
     - Removes awareness event listeners (`awareness.off`).
   - Prevents memory leaks and Fabric.js null context errors (`clearRect` on null canvas) under React StrictMode double-mounting.
3. **Floating Menu Screen Bounds Clamping**:
   - Implemented in `syncboard/client/src/components/PropertyMenu.tsx`.
   - Clamps floating menu coordinates to keep it at least 180px away from horizontal screen edges and 80px below the top boundary, keeping controls accessible regardless of pan/zoom.

---

## 5. Security Threat Vectors & Remediation Roadmap

| Priority | Category | Vector / Risk | Remediation Action |
|---|---|---|---|
| **P1** | Authentication | Unauthenticated WebSocket connection | Implement JWT token validation middleware in `server/index.js` during connection handshake. |
| **P1** | Transport | Insecure plaintext WebSocket transmission | Enforce TLS (`wss://`) for all production deployments. |
| **P2** | Rate Limiting | WebSocket flooding / DoS | Integrate connection rate limiting (`ws-rate-limit`) and payload byte caps per socket frame. |
| **P2** | Access Control | Global board clearance by any client | Require admin/owner role authorization before accepting `clear()` or bulk deletion operations. |
| **P3** | Input Validation | Unvalidated Yjs binary updates | Introduce server-side document schema verification or client update filtering. |

---
*Last Updated: September 2026*
