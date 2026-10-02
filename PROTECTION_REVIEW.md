# SyncBoard Security & Protection Review

## Executive Summary

SyncBoard is a real-time collaborative whiteboard web application. Its architecture consists of:
- **Client Frontend**: React 19, TypeScript, Fabric.js (canvas rendering), Lucide icons, and Tailwind CSS.
- **Real-Time Collaboration Engine**: Yjs CRDT framework (`yjs`, `y-websocket`, `y-indexeddb`).
- **WebSocket Relay Server**: Node.js HTTP & WebSocket server (`ws` library) utilizing `y-websocket/bin/utils` for document broadcasting.

This document presents a comprehensive protection and security analysis of the SyncBoard codebase, outlining existing safeguards, identified structural limitations, threat vectors, and recommended security hardening measures.

---

## 1. Network & Connection Security

### Current State
* **WebSocket Endpoint**: The server (`syncboard/server/index.js`) listens on port 1234 (`ws://localhost:1234`).
* **Transport Encryption**: Default deployment uses unencrypted `ws://` protocols rather than TLS-encrypted `wss://`.
* **CORS & Origin Checks**: The HTTP server responds to all connection requests without origin restrictions or header validation.

### Vulnerabilities & Risks
* **Man-in-the-Middle (MitM) Attacks**: Without TLS (`wss://`), network traffic (including board elements, text notes, and user awareness data) can be eavesdropped on or tampered with in transit.
* **Unauthorized Cross-Origin Connections**: Any web application running in a user's browser can establish a WebSocket connection to `ws://localhost:1234`.

---

## 2. Authentication & Authorization Assessment

### Current State
* **Open Room Access**: Any client can connect to the relay server and subscribe to any document room (e.g., `syncboard-main`).
* **No User Identity Verification**: User identity is managed client-side in transient awareness state (`localUser` object with name and color). There are no tokens (JWT/session), passwords, or access control lists (ACLs).

### Vulnerabilities & Risks
* **Unrestricted Room Join / Data Leakage**: Anyone knowing or guessing a room identifier can join, read, edit, or delete all whiteboard elements.
* **Identity Spoofing**: Users can impersonate any name or color in awareness states without server-side validation.

---

## 3. Data Integrity & CRDT Validation

### Current State
* **Unvalidated CRDT Broadcasting**: The relay server acts as a pure Yjs update distributor. It passes binary CRDT sync messages between peers without inspecting or validating the payload structure.
* **Client-Side JSON Import Safeguards**: The `handleImportJSON` handler in `CanvasApp.tsx` performs basic schema validation (`Array.isArray` check, ensuring `id`, `type`, and `position` exist) before inserting imported elements into `yElements`.
* **String Length Bounds**: Room name editing in `TopBar.tsx` enforces `ROOM_NAME_MAX_LENGTH = 50` both in input fields (`maxLength={50}`) and on save (`tempRoomName.trim().slice(0, 50)`).

### Vulnerabilities & Risks
* **Malicious Payload Injection**: A compromised or custom WebSocket client could broadcast malformed or excessively large CRDT updates, triggering high memory usage or rendering exceptions on connected peers.
* **Lack of Server-Side Enforcement**: Client-side constraints (such as the 50-character room name limit) can be bypassed by sending direct Yjs updates over WebSocket.

---

## 4. Client-Side Safeguards & Operational Protections

The SyncBoard client codebase incorporates several defensive programming measures:

### File Upload & Image Constraints
* **File Size Cap**: Image file uploads in `Toolbar.tsx` are capped at `MAX_FILE_SIZE = 3MB` (`3 * 1024 * 1024` bytes) to prevent client memory bloat and excessive WebSocket bandwidth usage.
* **MIME Validation**: Uploads require `file.type.startsWith('image/')` validation before reading data.
* **Safe Base64 Image Instantiation**: In `CanvasApp.tsx`, `fabric.Image.fromURL` callbacks include `if (!img) return;` guards to handle corrupted or malformed base64 image strings safely without throwing unhandled exceptions.

### Rendering & DOM Protection
* **React 19 DOM Reconciliation Safety**: The `<canvas>` element in `CanvasApp.tsx` is wrapped inside a dedicated `<div>` container (`containerRef`), preventing React DOM reconciliation errors (`Failed to execute 'insertBefore' on 'Node'`) caused by Fabric.js canvas wrappers.
* **Viewport Zoom & Coordinate Protection**: Viewport zoom is clamped between `0.05` and `20` in `mouse:wheel` events, preventing coordinate scaling overflows or NaN matrix errors.
* **Remote Selection Bounds Calculation**: Selection bounding boxes from remote users are calculated dynamically inside `useEffect` during `after:render` events, avoiding ref access during render cycles.

### Resource & Lifecycle Management
* **Clean Event Unbinding**: All Yjs observers (`yElements.unobserve`, `yRoomName.unobserve`), awareness listeners (`awareness.off`), window event listeners (`resize`, `keydown`), intervals, and Fabric canvas instances (`fabricCanvas.dispose()`) are properly torn down in the `useEffect` cleanup return block.
* **Fabric Reference Nullification**: `fabricRef.current` is set to `null` on unmount to prevent async event callbacks from executing against disposed canvas contexts.

---

## 5. Local Persistence & Data Privacy

### Current State
* **IndexedDB Persistence**: Board state is persisted locally using `y-indexeddb` under the database name `syncboard-v3`.
* **Data Isolation**: IndexedDB storage is isolated per domain origin by the browser's same-origin policy.
* **Awareness Privacy**: User cursor locations and user profiles (names and colors) are held in memory only and cleared when the WebSocket connection terminates.

---

## 6. Security Hardening Recommendations

To prepare SyncBoard for production deployments, the following security enhancements are recommended:

1. **Enable TLS Encryption (WSS)**:
   - Configure HTTPS/WSS certificates on the relay server or place it behind a reverse proxy (e.g., Nginx or Caddy) with TLS termination.

2. **Implement Token-Based Authentication**:
   - Require JWT authentication during the WebSocket connection handshake (`wss://server?token=...`).
   - Validate room access permissions on the server before invoking `setupWSConnection`.

3. **Server-Side Rate Limiting & Payload Limits**:
   - Limit WebSocket message size (`maxPayload: 5MB`) in the `ws` server initialization.
   - Implement rate limiting per IP / client connection to mitigate Denial-of-Service (DoS) and message spamming.

4. **Add Content Security Policy (CSP)**:
   - Configure HTTP CSP headers on Vite web server / CDN to restrict script execution origins and control WebSocket connection endpoints (`connect-src`).

5. **Server-Side Document Verification**:
   - Integrate server-side Yjs document validation hooks to discard non-standard updates or oversized document states.
