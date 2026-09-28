# SyncBoard Protection & Security Review

## Executive Summary

This document presents a comprehensive protection and security review of the **SyncBoard** collaborative whiteboard platform. The analysis covers the client-side application (`syncboard/client`), the real-time Conflict-free Replicated Data Type (CRDT) engine powered by Yjs, and the backend WebSocket relay server (`syncboard/server`).

While SyncBoard implements several client-side safeguards (such as file payload limits, string truncation, defensive canvas rendering, and structured JSON import handling), structural limitations exist in the underlying real-time communication architecture—specifically regarding unauthenticated WebSocket connections, unvalidated CRDT updates, and lack of transport encryption in default configurations.

---

## 1. System Architecture Overview

SyncBoard consists of two primary operational layers:

1. **Client Application (`syncboard/client`)**:
   - **Framework**: React 19 with TypeScript and Vite.
   - **Canvas Rendering**: Fabric.js HTML5 `<canvas>` rendering engine.
   - **Real-Time State & CRDT**: Yjs (`Y.Doc`, `Y.Map` for elements, `Y.Text` for room name) synchronized via `y-websocket` provider and local persistence via `y-indexeddb` (`IndexeddbPersistence`).
   - **Presence & Awareness**: Yjs Awareness protocol for real-time cursor tracking, remote user profile state, active object selection bounds, and transient laser pointer trails.

2. **Backend WebSocket Relay Server (`syncboard/server`)**:
   - **Runtime**: Node.js HTTP server and `ws` (WebSocket) server.
   - **Relay Mechanism**: Serves as a stateless Yjs CRDT update relay utilizing `setupWSConnection` from `y-websocket/bin/utils`.

---

## 2. Existing Protection Mechanisms & Defenses

SyncBoard implements several client-side defense mechanisms and design practices to preserve state integrity and prevent browser crashes or UI rendering failures:

### 2.1 Payload & File Size Constraints
- **Image Upload Cap**: Enforced in `Toolbar.tsx` via `MAX_FILE_SIZE = 3 * 1024 * 1024` (3MB limit). File uploads exceeding 3MB are rejected prior to FileReader conversion and CRDT insertion.
- **MIME Type Checking**: File inputs validate `file.type.startsWith('image/')` to prevent arbitrary file types from being processed as canvas images.

### 2.2 Input Length Restrictions
- **Room Name Limit**: Room names are capped at 50 characters (`ROOM_NAME_MAX_LENGTH = 50` in `constants.ts`) and truncated automatically on save/blur in `TopBar.tsx`.
- **User Display Name Limit**: Capped at 24 characters (`maxLength={24}`) in `TopBar.tsx` profile menu to prevent UI overlap or overflow in cursor indicators and top bar headers.

### 2.3 Defensive Rendering & Null-Safety
- **Safe Base64 Image Instantiation**: In `CanvasApp.tsx`, `fabric.Image.fromURL` callbacks incorporate strict null-checking (`if (!img) return;`) and configure `crossOrigin: 'anonymous'` to prevent browser crashes or uncaught exceptions from invalid image data strings.
- **Text Wrapping & Bounds Handling**: Sticky note text elements utilize `splitByGrapheme: true` in Fabric.js to handle multi-line rendering and wide character sets cleanly.
- **Strict Observer Cleanup**: `useEffect` cleanup routines explicitly unobserve Yjs structures (`yElements.unobserve`, `yRoomName.unobserve`), detach awareness listeners (`awareness.off`), and dispose of Fabric canvas instances (`fabricCanvas.dispose()`) to eliminate memory leaks and null-context execution (`clearRect` on null) under hot reloading or React StrictMode.

### 2.4 Data Export/Import Validation
- **JSON Backup Parsing**: The JSON import handler (`handleImportJSON` in `CanvasApp.tsx`) wraps parsing in `try...catch` blocks and verifies that imported data is an array containing mandatory element fields (`id`, `type`, `position`).
- **UUID Re-generation**: Imported elements are assigned newly generated UUIDs (`crypto.randomUUID()`) before insertion into `yElements` to prevent primary key collision attacks with existing elements.

### 2.5 Cross-Site Scripting (XSS) Mitigation
- **HTML5 Canvas Isolation**: Graphical objects and textual notes are rendered strictly via Fabric.js onto an HTML5 `<canvas>` context, eliminating traditional DOM-based script execution vulnerabilities from user-submitted canvas text.
- **Safe React JSX Interpolation**: React components (`TopBar`, `Toolbar`, `CursorsLayer`) render dynamic values (user names, room names, stamp emojis) through React JSX text nodes without using `dangerouslySetInnerHTML`.

---

## 3. Structural Limitations & Vulnerability Analysis

Despite the client-side safeguards, the application exhibits structural limitations stemming from its lightweight, stateless backend architecture:

### 3.1 Unauthenticated WebSocket Relays (High Risk)
- **Description**: The WebSocket server in `syncboard/server/index.js` listens on port 1234 and attaches all connections to `setupWSConnection` without requiring authentication tokens (e.g., JWT, session cookies, or API keys).
- **Impact**: Any client capable of reaching `ws://<host>:1234` can join any room name (`/syncboard-main` or custom room IDs) and read or modify the board contents without identity verification.

### 3.2 Unvalidated CRDT Updates (High Risk)
- **Description**: The server acts as a transparent relay for Yjs binary sync messages (`SyncStep1`, `SyncStep2`, `Update`). It does not decode, validate, or enforce schema compliance on incoming updates.
- **Impact**: A malicious actor operating a modified WebSocket client can bypass client-side file upload limits, inject arbitrarily large base64 strings, or insert malformed nested data into `yElements`. These updates will be relayed to all connected peers, potentially causing client memory bloat or rendering lag.

### 3.3 Client-Side Safeguard Bypass Potential (Medium Risk)
- **Description**: Constraints such as the 3MB image size limit and 50-character room name limit are enforced purely on the client side (`Toolbar.tsx` and `TopBar.tsx`).
- **Impact**: Attackers can construct raw Yjs updates bypassing frontend UI controls to broadcast oversized or malformed attributes to all room participants.

### 3.4 Unencrypted Transport Layer (Medium Risk)
- **Description**: The server defaults to unencrypted HTTP and plain WebSockets (`ws://localhost:1234`).
- **Impact**: Deploying the server across public networks without TLS termination leaves real-time data transfers vulnerable to eavesdropping and man-in-the-middle (MITM) tampering.

### 3.5 Missing Connection & Message Rate Limiting (Medium Risk)
- **Description**: The WebSocket server has no limits on connection rates, message frequencies, or payload frame sizes.
- **Impact**: High-frequency message floods or massive WebSocket frames can lead to denial-of-service (DoS) conditions on the server or client CPU saturation during CRDT convergence.

### 3.6 Lack of Granular Access Control (Low/Medium Risk)
- **Description**: Every client connected to a room possesses equal read/write access to the shared Yjs document.
- **Impact**: There is currently no mechanism for read-only / viewer roles vs. editor roles.

---

## 4. Risk Assessment Matrix

| Vulnerability / Risk | Risk Level | Existing Mitigation | Recommended Resolution |
| :--- | :--- | :--- | :--- |
| **Unauthenticated WebSocket Server** | **High** | None (Public access) | Implement JWT or session authentication during HTTP upgrade handshake. |
| **Unvalidated CRDT Updates** | **High** | Client-side type checks & defensive rendering | Implement server-side Yjs document inspection or validation hooks. |
| **Client Payload Limit Bypass** | **Medium** | Client 3MB limit & string truncation | Enforce maximum frame/payload sizes at the WebSocket server level (`maxPayload`). |
| **Plaintext WebSocket Transport** | **Medium** | Localhost execution scope | Mandate TLS/WSS termination (`wss://`) in production deployments. |
| **DoS via Message Flooding** | **Medium** | Transient laser point filtering | Implement connection throttling and per-socket message rate limiting. |
| **Missing Role-Based Access (RBAC)** | **Low** | None | Implement signed room access tokens distinguishing Read-Only vs. Read-Write permissions. |

---

## 5. Security & Protection Roadmap

To address these structural limitations, the following multi-phase hardening roadmap is recommended:

### Phase 1: Transport & Connection Hardening
1. **Enable TLS Encryption**: Deploy the WebSocket server behind a TLS-terminating reverse proxy (e.g., Nginx, Caddy) or enable HTTPS/WSS (`wss://`) directly in `server/index.js`.
2. **Configure Max Payload Sizes**: Pass `maxPayload: 5 * 1024 * 1024` (5MB) into the `WebSocket.Server` constructor options in `server/index.js` to reject oversized WebSocket frames at the network layer.
3. **Origin & CORS Validation**: Validate the `Origin` header during the WebSocket upgrade request to restrict connections to trusted web client origins.

### Phase 2: Authentication & Authorization
1. **WebSocket Handshake Auth**: Extract authentication tokens (e.g., Bearer JWT or ticket tokens) from request headers or query parameters during the WebSocket `upgrade` event before calling `setupWSConnection`.
2. **Room Authorization**: Verify user permissions for specific room IDs before granting WebSocket connection access.

### Phase 3: Server-Side Validation & Rate Limiting
1. **Socket Rate Limiting**: Integrate rate-limiting middleware (e.g., `express-rate-limit` or custom token-bucket limiters) to limit connection attempts and message bursts.
2. **CRDT Update Inspection**: Utilize Yjs server hooks to observe `yDoc` transactions on the server and discard updates that violate schema rules or size thresholds.

### Phase 4: Granular Permissions (RBAC)
1. **Read-Only Connections**: Support read-only Yjs clients by accepting updates only from clients holding write tokens, while broadcasting updates to read-only subscribers.

---

## 6. Audit Summary

| Component | Audit Status | Remarks |
| :--- | :--- | :--- |
| Client UI Components (`TopBar`, `Toolbar`, `PropertyMenu`) | **PASSED** | Correct payload caps, length limits, clean React state management. |
| Canvas & Object Model (`CanvasApp.tsx`) | **PASSED** | Null-safe Fabric.js instantiation, clean observer/event cleanup. |
| Local Offline Persistence (`IndexeddbPersistence`) | **PASSED** | Client-isolated storage in browser IndexedDB. |
| WebSocket Server (`server/index.js`) | **NEEDS HARDENING** | Requires auth, TLS, max payload caps, and rate-limiting. |

*Review completed and documented for SyncBoard platform.*
