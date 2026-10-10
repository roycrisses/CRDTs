# SyncBoard Security & Protection Review

## Executive Summary
This document provides a comprehensive security and protection review of the SyncBoard collaborative whiteboard platform. The system uses a Yjs CRDT real-time architecture, `y-websocket` server relay, and a React + Fabric.js frontend. The review evaluates current security controls, client-side safety measures, structural limitations, and potential threat vectors across transport, data sync, and local storage layers.

---

## 1. System Architecture & Data Flow Overview
- **Client**: React SPA utilizing Fabric.js for HTML5 canvas rendering, Yjs (`yjs`) for conflict-free replicated data types, `y-websocket` for real-time synchronization, and `y-indexeddb` for offline document persistence.
- **Server**: Lightweight Node.js server (`syncboard/server/index.js`) exposing an HTTP status endpoint and running `y-websocket` relay protocol on port 1234.
- **Data Flow**: Canvas state updates (shapes, text, drawings, stamps, images) are serialized into Yjs Y.Map objects (`yElements`) and broadcast over WebSockets as binary update messages (`Uint8Array`).

---

## 2. WebSocket & Transport Security Analysis
### Findings & Structural Limitations:
1. **Unauthenticated Relay Connections**:
   - The WebSocket server accepts connections from any client without requiring authentication tokens (JWT or session cookies).
   - Any client that connects can subscribe to any room ID simply by connecting to `ws://server:1234/<room-name>`.
2. **Lack of Encryption (TLS/WSS)**:
   - Default configuration listens on unencrypted HTTP/WS (`ws://localhost:1234`). Production deployment requires reverse-proxy SSL termination or native HTTPS/WSS.
3. **Absence of Rate-Limiting & Flood Protection**:
   - The relay server blindly broadcasts incoming binary updates to all connected clients in the same room. There is no message rate limiting, connection count throttling per IP, or bandwidth capping.
4. **Room Isolation**:
   - Rooms are isolated by URL parameter (`/roomName`), but because room names are unauthenticated, room enumeration or unauthorized access is possible if room names are guessable.

---

## 3. CRDT Data Integrity & Input Validation
### Findings & Risk Analysis:
1. **Unvalidated Message Relaying**:
   - The server does not deserialize or validate Yjs binary updates; it acts as a pure relay. An attacker sending malformed or excessively large CRDT frames could disrupt connected peers.
2. **Client-Side Deserialization & Rendering Safety**:
   - Incoming element data in `CanvasApp.tsx` (`upsertFabricObject`) maps remote data types directly to Fabric.js objects (`fabric.Rect`, `fabric.Circle`, `fabric.IText`, `fabric.Path`, `fabric.Image`).
   - Base64 Image strings are rendered via `fabric.Image.fromURL`. Null-safety checks are implemented on the callback (`if (!img || !img.getElement()) return;`) to prevent canvas crashes from corrupted or malformed base64 strings.
3. **Script Injection / XSS Vector Assessment**:
   - Canvas text nodes use Fabric.js `IText` and `Text` rendered to HTML5 2D canvas context. Text content is rendered directly as pixels, preventing traditional DOM HTML injection (DOM XSS).
   - React UI components render user inputs (e.g. Room Name, User Profile Name, Badge Text) within React JSX, which automatically escapes strings and prevents HTML injection.

---

## 4. Client-Side Protection Controls Implemented
1. **Payload & File Size Constraints**:
   - **Image Upload Limit**: `Toolbar.tsx` enforces a `MAX_FILE_SIZE` limit of **3MB** (`3 * 1024 * 1024` bytes) and validates MIME types (`file.type.startsWith('image/')`) prior to FileReader Base64 conversion.
2. **Room Name Input Validation**:
   - `TopBar.tsx` enforces a maximum length of **50 characters** (`maxLength={50}`) and sanitizes text inputs on blur / submit to prevent UI header overflow and ballooning Yjs document state.
3. **DOM Container Isolation (React 19 Compatibility)**:
   - `<canvas ref={canvasRef} />` is wrapped inside a dedicated wrapper container `div` in `CanvasApp.tsx` to prevent React DOM reconciliation errors (`Failed to execute 'insertBefore' on 'Node'`) when Fabric.js wraps canvas elements inside its `.canvas-container` wrapper.
4. **Memory Leak & Stale Ref Protection**:
   - Fabric canvas initialization explicitly sets `fabricRef.current = null` on unmount.
   - Yjs observers (`yElements.unobserve`, `yRoomName.unobserve`) and awareness handlers (`awareness.off`) are cleaned up to prevent memory leaks and null `clearRect` errors under React StrictMode / HMR.

---

## 5. State Persistence & Local Data Security
1. **IndexedDB Storage Security**:
   - Document state is cached locally via `y-indexeddb` (`IndexeddbPersistence`).
   - **Risk**: Local storage in IndexedDB is unencrypted. Any process or browser extension running within the same origin can read local room states.
2. **Session / Awareness Data**:
   - User profile names, cursor positions, and selections are transmitted in cleartext over awareness protocol.

---

## 6. DoS & Resource Exhaustion Protection
1. **Canvas Element Overload Risk**:
   - There is currently no hard cap on the maximum number of canvas elements (`yElements`) per room. An automated script could flood a room with tens of thousands of shapes, causing client browser memory usage to spike and canvas rendering to lag.
2. **Network Bandwidth Saturation**:
   - High-frequency drawing tools (pencil / highlighter path points) generate dense path datasets. Continuous path rendering can saturate WebSocket bandwidth if multiple users draw simultaneously.

---

## 7. Hardening Roadmap & Remediation Recommendations
1. **Server-Side Hardening**:
   - Integrate authentication token validation (JWT) in `wss.on('connection')` handshake in `syncboard/server/index.js`.
   - Set maximum payload limits on the WebSocket server (`maxPayload: 10 * 1024 * 1024` / 10MB).
   - Implement IP-based connection rate limiting and message frequency limits.
2. **WSS / TLS Enforcement**:
   - Configure HTTPS/WSS with SSL certificates (e.g. Let's Encrypt or reverse proxy via Nginx/Caddy).
3. **Schema Validation for CRDT Updates**:
   - Implement client-side or server-side schema verification for `ElementData` payloads before applying or persisting updates.
4. **Local Store Protection**:
   - Optional client-side field-level encryption for sensitive sticky note content prior to writing to IndexedDB or transmitting over WebSockets.

---
*Audit Date: 2026-10-10 | SyncBoard Core Platform*
