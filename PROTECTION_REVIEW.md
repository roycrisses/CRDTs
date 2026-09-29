# SyncBoard Security & Protection Review Report

This document presents a comprehensive security and protection review of the SyncBoard real-time collaborative whiteboard platform. It evaluates client-side defense mechanisms, server-side relay architecture, data synchronization protocols, potential attack vectors, structural limitations, and a multi-phase security hardening roadmap.

---

## 1. System Architecture Overview

SyncBoard is structured into two core layers:

1. **Client Application (`syncboard/client`)**:
   - **Framework & UI**: React 19, TypeScript, Tailwind CSS, Lucide icons, Vite.
   - **Canvas Rendering Engine**: Fabric.js HTML5 `<canvas>` object-oriented graphics library.
   - **Real-Time CRDT State Management**: Yjs (`Y.Doc`, `Y.Map` for elements, `Y.Text` for room name) with `y-websocket` provider for real-time peer updates and `y-indexeddb` (`IndexeddbPersistence`) for client-side persistence across reloads.
   - **Presence & Awareness Protocol**: Yjs Awareness protocol for dynamic cursor tracking, user profiles (display names, avatar colors), object selection bounds, and transient laser pointer trails.

2. **Backend Relay Server (`syncboard/server`)**:
   - **Runtime**: Node.js HTTP server paired with `ws` (WebSocket) server.
   - **Relay Handler**: Stateless Yjs CRDT update relay utilizing `setupWSConnection` from `y-websocket/bin/utils`.

---

## 2. Existing Protection Mechanisms & Defenses

SyncBoard incorporates client-side input validation, resource caps, and defensive rendering practices to preserve canvas state integrity and prevent client crashes:

### 2.1 File Upload & Payload Safeguards
- **File Size Cap**: In `Toolbar.tsx`, image file uploads are restricted via `MAX_FILE_SIZE = 3 * 1024 * 1024` (3MB limit). Uploads exceeding this threshold are aborted prior to FileReader base64 encoding and CRDT insertion.
- **MIME Type Validation**: File input handlers check `file.type.startsWith('image/')` to ensure non-image MIME types are rejected before insertion onto the canvas.

### 2.2 Input Length & Bounds Restrictions
- **Room Name Length Cap**: Room names are capped at 50 characters (`ROOM_NAME_MAX_LENGTH = 50` in `constants.ts`) and trimmed on save/blur in `TopBar.tsx`.
- **User Display Name Cap**: User profile names are limited to 24 characters (`maxLength={24}`) in `TopBar.tsx` to prevent UI overflow or header clipping in collaborative cursor indicators.

### 2.3 Defensive Rendering & Null-Safety
- **Safe Base64 Image Instantiation**: In `CanvasApp.tsx`, `fabric.Image.fromURL` callbacks include strict null checks (`if (!img) return;`) and configure `crossOrigin: 'anonymous'` to prevent browser crashes or uncaught exceptions from invalid image data strings.
- **Text Wrapping & Formatting**: Sticky notes utilize `splitByGrapheme: true` in Fabric.js to ensure multi-line text and wide character sets wrap safely without overflowing container boundaries.
- **Strict Observer & Event Cleanup**: `useEffect` cleanup blocks in `CanvasApp.tsx` explicitly unobserve Yjs maps/texts (`yElements.unobserve`, `yRoomName.unobserve`), detach awareness listeners (`awareness.off`), and dispose of Fabric canvas instances (`fabricCanvas.dispose()`) to eliminate memory leaks and null-context execution (`clearRect` on null) during hot-module reloading or under React StrictMode.

### 2.4 Data Backup & Import Sanitation
- **JSON Import Structure Validation**: The `handleImportJSON` handler in `CanvasApp.tsx` parses JSON within `try...catch` blocks and verifies that imported elements are formatted as an array containing required properties (`id`, `type`, `position`).
- **UUID Re-generation**: Imported element objects are assigned fresh unique identifiers (`crypto.randomUUID()`) before insertion into `yElements` to prevent key collision attacks with existing board objects.

### 2.5 Cross-Site Scripting (XSS) Mitigation
- **Canvas Context Isolation**: Whiteboard shapes, text elements, notes, and paths are drawn onto HTML5 `<canvas>` via Fabric.js vector operations, preventing direct DOM script execution from user input.
- **React Output Encoding**: UI overlays (`TopBar`, `Toolbar`, `CursorsLayer`, `PropertyMenu`) render dynamic values through React JSX text bindings, avoiding dangerous methods like `dangerouslySetInnerHTML`.

---

## 3. Structural Limitations & Vulnerabilities

Despite client-side safeguards, the default backend architecture presents several structural limitations inherent to stateless WebSocket relay implementations:

### 3.1 Unauthenticated WebSocket Relays (High Risk)
- **Issue**: The WebSocket server in `syncboard/server/index.js` listens on port 1234 and routes all connections directly to `setupWSConnection` without identity verification (e.g., JWT, OAuth, or session cookies).
- **Impact**: Any network client capable of reaching `ws://<host>:1234` can connect to any room namespace and read or alter document contents.

### 3.2 Unvalidated CRDT Updates (High Risk)
- **Issue**: The backend acts as a transparent relay for Yjs binary sync messages (`SyncStep1`, `SyncStep2`, `Update`). It does not decode or validate CRDT updates against a defined schema.
- **Impact**: A modified client bypassing the frontend UI could insert malformed data or oversized payloads into `yElements`, causing connected clients to experience rendering lag or excessive client memory usage.

### 3.3 Client-Side Safeguard Bypass Potential (Medium Risk)
- **Issue**: Controls such as the 3MB image size limit and 50-character room name limit are enforced solely in frontend UI components (`Toolbar.tsx` and `TopBar.tsx`).
- **Impact**: Direct WebSocket connections bypassing the React frontend could transmit larger attributes or unexpected properties across the room.

### 3.4 Plaintext Transport Layer (Medium Risk)
- **Issue**: The default configuration operates over unencrypted HTTP and WebSockets (`ws://localhost:1234`).
- **Impact**: Transporting updates across public or untrusted networks without TLS/WSS termination exposes communications to eavesdropping or man-in-the-middle (MITM) tampering.

### 3.5 Absence of WebSocket Rate Limiting (Medium Risk)
- **Issue**: The relay server lacks connection rate limiting, message frequency limits, or maximum WebSocket frame size configurations.
- **Impact**: High-frequency message floods or massive payloads could create high network utilization or CPU load during CRDT convergence on client devices.

### 3.6 Lack of Granular Access Control (Low/Medium Risk)
- **Issue**: All clients connected to a room share identical read/write access to the Yjs document model.
- **Impact**: There is currently no native role-based distinction between Read-Only (viewers) and Read-Write (editors) users.

---

## 4. Risk Assessment Matrix

| Vulnerability / Risk | Risk Level | Existing Mitigation | Recommended Resolution |
| :--- | :--- | :--- | :--- |
| **Unauthenticated WebSocket Server** | **High** | None (Public workspace) | Implement JWT/token-based handshake authentication. |
| **Unvalidated CRDT Updates** | **High** | Client-side type checks & defensive rendering | Add server-side Yjs transaction hooks or document validators. |
| **Client Safeguard Bypass** | **Medium** | Client 3MB upload limit & input truncation | Configure server-side maximum frame size (`maxPayload`). |
| **Plaintext Transport** | **Medium** | Localhost execution scope | Enforce TLS/WSS termination (`wss://`) in production. |
| **DoS via Message Flooding** | **Medium** | Transient laser point expiration | Implement rate-limiting middleware and socket frame caps. |
| **Missing Role-Based Access (RBAC)** | **Low** | None | Implement signed room access tokens for Read-Only vs. Editor roles. |

---

## 5. Security Hardening Roadmap

To address structural limitations in future infrastructure iterations, the following hardening roadmap is recommended:

### Phase 1: Transport & Connection Hardening
1. **Enable TLS Encryption**: Deploy the relay server behind a TLS-terminating reverse proxy (e.g., Nginx, Caddy) or enable `wss://` in production.
2. **Configure Max Payload Limits**: Set `maxPayload: 5 * 1024 * 1024` (5MB) in `WebSocket.Server` constructor options (`server/index.js`) to reject oversized frames.
3. **Validate WebSocket Request Origins**: Verify the `Origin` header during the HTTP upgrade handshake to reject unauthorized domains.

### Phase 2: Authentication & Access Control
1. **Handshake Token Authentication**: Pass access tokens during the WebSocket connection handshake before executing `setupWSConnection`.
2. **Room Access Verification**: Authorize client access against specific room IDs before establishing CRDT sync channels.

### Phase 3: Server-Side Validation & Rate Limiting
1. **Socket Rate Limiting**: Implement connection and message rate limiters (e.g., token bucket algorithms) on incoming WebSocket streams.
2. **CRDT Update Inspection**: Use server-side Yjs observers to validate structural integrity before broadcasting updates to peers.

---

## 6. Audit Summary

| Component | Audit Status | Remarks |
| :--- | :--- | :--- |
| Client UI Components (`TopBar`, `Toolbar`, `PropertyMenu`) | **PASSED** | Validated payload caps, input length constraints, and clean React state handling. |
| Canvas & Object Model (`CanvasApp.tsx`) | **PASSED** | Confirmed defensive Fabric.js rendering, null checks, and event listener cleanup. |
| Local Offline Persistence (`IndexeddbPersistence`) | **PASSED** | Verified client-isolated browser IndexedDB storage. |
| WebSocket Relay Server (`server/index.js`) | **NEEDS HARDENING** | Requires authentication, TLS, max payload caps, and rate-limiting. |

*Review completed and documented for SyncBoard platform.*
