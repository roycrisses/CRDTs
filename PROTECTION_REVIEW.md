# SyncBoard Protection & Security Review

## 1. Executive Summary & Overview
This document provides a comprehensive security and protection review of **SyncBoard**, a real-time collaborative whiteboard application built with React, Vite, Fabric.js, Yjs (CRDTs), and `y-websocket`.

The audit evaluated system architecture, WebSocket communication protocols, client-side data validation, payload constraints, state synchronization resilience, and potential security threats.

---

## 2. System Architecture & Threat Surface

### Client Architecture
* **Frontend Stack**: React (Vite, TypeScript), Fabric.js (Canvas rendering), Tailwind CSS (UI & styling), Yjs (`yjs`, `y-websocket`, `y-indexeddb`).
* **Real-time Engine**: CRDT document state (`Y.Doc`) managed locally with real-time awareness and persistence through IndexedDB (`y-indexeddb`).
* **UI Controls**: Modular floating property menus, toolbar selectors, zoom/pan controls, and remote awareness overlays (`CursorsLayer`).

### Server Architecture
* **Relay Stack**: Lightweight Node.js HTTP server + `ws` WebSocket server running `y-websocket/bin/utils` (`setupWSConnection`).
* **Relay Mechanism**: Stateless WebSocket connection pool that broadcasts binary-encoded CRDT document updates (`Y.Doc` state vectors & update messages) across connected clients per room.

---

## 3. WebSocket Security & Access Control Analysis

### Unauthenticated Connections
* **Current Implementation**: The WebSocket relay (`syncboard/server/index.js`) listens on port 1234 and accepts all incoming WebSocket connections without authentication, token verification, or origin validation.
* **Risk Level**: **Medium-High**.
* **Impact**:
  * Anyone with access to the WebSocket endpoint (`ws://host:1234`) can join any room (`syncboard-main`) and read or alter the collaborative board state.
  * Lack of room token authorization allows arbitrary clients to join, clear, or modify board elements.

### Lack of Rate Limiting
* **Current Implementation**: Neither the WebSocket server nor the HTTP relay implements per-IP connection limits or message rate limiting.
* **Risk Level**: **Medium**.
* **Impact**: Malicious or buggy clients could flood the WebSocket server with update frames, causing high bandwidth usage or denial of service (DoS) for connected clients.

---

## 4. Data Integrity & CRDT Update Validation

### Client-Side Trust
* **Current Implementation**: Updates received over WebSocket are applied directly to the client's `Y.Doc` without server-side schema verification or content sanitization.
* **Risk Level**: **Medium**.
* **Impact**: A modified client script could inject unexpected JSON objects into the shared `Y.Map('elements')`. While Fabric.js rendering handles missing properties gracefully, malicious updates could corrupt board visualization for other users.

---

## 5. Client-Side Safety Measures & Payload Constraints

SyncBoard implements several client-side safeguards to maintain UI stability, browser performance, and payload safety:

1. **File Upload Size Limit**:
   * **Location**: `syncboard/client/src/components/Toolbar.tsx` (`MAX_FILE_SIZE = 3MB`).
   * **Protection**: Rejects files exceeding 3MB and enforces `image/*` MIME type validation before base64 encoding, preventing browser memory bloat and excessive WebSocket payload transmission.

2. **Room Name Character Cap**:
   * **Location**: `syncboard/client/src/components/TopBar.tsx` (`ROOM_NAME_MAX_LENGTH = 50`).
   * **Protection**: Limits room name inputs to 50 characters both via HTML input attributes and `handleSaveRoomName` truncation, preventing UI layout overflow and excessive string allocation in Yjs `Y.Text`.

3. **Null-Safe Image Rendering**:
   * **Location**: `syncboard/client/src/CanvasApp.tsx` (`fabric.Image.fromURL`).
   * **Protection**: Verifies the loaded image object callback is non-null before appending to the canvas, preventing runtime DOM/canvas crashes from corrupted base64 data URLs.

4. **DOM Wrapper Isolation**:
   * **Location**: `syncboard/client/src/CanvasApp.tsx`.
   * **Protection**: Fabric canvas element is wrapped in a dedicated container `div`, preventing React DOM reconciliation conflicts (`insertBefore` on Node errors) caused by Fabric's internal DOM modifications.

5. **React Lifecycle & StrictMode Cleanup**:
   * **Location**: `syncboard/client/src/CanvasApp.tsx`.
   * **Protection**: Unmount cleanup handlers explicitly destroy `wsProvider`, `dbProvider`, Yjs observers (`unobserve`), awareness listeners (`awareness.off`), and dispose the Fabric canvas instance, eliminating memory leaks and null context (`clearRect`) errors during hot reloads or unmounting.

---

## 6. Recommended Threat Mitigations & Enhancements

1. **Implement WebSocket Authentication & Room Authorization**:
   * Integrate JWT/token-based authentication into `syncboard/server/index.js` using `y-websocket` authentication hooks or URL query params.
   * Validate user credentials and room access tokens before executing `setupWSConnection`.

2. **Enforce Server-Side Rate Limiting & Message Size Caps**:
   * Configure WebSocket server `maxPayload` size limits (e.g., 5MB per frame) to prevent oversized frame injection.
   * Introduce rate limiting on incoming WebSocket messages per connection.

3. **Enable TLS/WSS for In-Transit Encryption**:
   * In production deployments, serve WebSockets over secure WebSockets (`wss://`) behind a reverse proxy (e.g., Nginx, Caddy, or Cloudflare) with HTTPS termination.

4. **Origin Validation (CORS/Host Headers)**:
   * Validate the `Origin` header during WebSocket handshake to prevent Unauthorized Cross-Site WebSocket Hijacking (CSWSH).
