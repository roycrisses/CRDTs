# SyncBoard Security & Protection Review

## Executive Summary
SyncBoard is a real-time collaborative whiteboard application built with a React/Fabric.js frontend, Yjs CRDT state management, and a Node.js WebSocket relay server (`y-websocket`). This document presents a comprehensive security and architectural protection review across the network layer, state synchronization engine, client-side input handling, data persistence, and UI rendering boundaries.

---

## 1. Network & Transport Security

### Findings
- **Unauthenticated WebSocket Relay**: The Node.js WebSocket relay server (`syncboard/server/index.js`) accepts incoming connections on `ws://localhost:1234` without authentication tokens, session cookies, or authorization checks.
- **Unencrypted Transport (In Development)**: WebSockets run over plain `ws://` rather than encrypted `wss://`.
- **Lack of Rate Limiting & Denial of Service (DoS) Controls**: The WebSocket server does not enforce IP-based rate limiting, connection count caps per IP, or message frequency limits.
- **Room Isolation & Eavesdropping Risks**: Room routing relies solely on the room identifier parameter in the WebSocket connection path. Without room-level access tokens or ACLs, any user knowing or guessing a room name can join and inspect/modify the workspace CRDT state.

### Current Protection & Mitigations
- Dev environment runs locally on `localhost:1234`.

### Recommended Production Enhancements
1. **WebSocket Authentication**: Implement JWT or session-based token verification in `wss.on('connection')` prior to invoking `setupWSConnection(conn, req)`.
2. **TLS Encryption**: Enforce `wss://` with valid SSL/TLS certificates terminated via reverse proxy (Nginx/Envoy) or HTTPS server.
3. **Connection Rate Limiting**: Integrate `express-rate-limit` / `ws` middleware or firewall-level IP throttling.
4. **Room Authorization**: Enforce room access permissions on the server before joining Yjs document channels.

---

## 2. CRDT State Integrity & Data Validation

### Findings
- **Unvalidated Yjs Map Updates**: The Yjs shared map (`ydoc.getMap<ElementData>('elements')`) accepts `ElementData` objects transmitted by clients.
- **Missing Server-Side Schema Assertions**: The node server acts as a passive relay without inspecting or validating CRDT updates. A malicious client could send malformed objects or unexpected properties.
- **Type Guarding in Client Rendering**: The client application (`CanvasApp.tsx`) relies on runtime type checks (`instanceof fabric.Group`, `data.type === 'path'`, etc.) when deserializing Yjs elements into Fabric.js objects.

### Current Protection & Mitigations
- Client-side type guards and `instanceof` checks protect against rendering crashes on unexpected object types.
- Strict type definitions (`ElementData`) in TypeScript prevent accidental local mutations of bad state.

### Recommended Production Enhancements
1. **Runtime Schema Validation**: Implement Zod or TypeBox schema validation on incoming Yjs elements before inserting or updating local state.
2. **Server-Side Validation Hook / Yjs Document Provider**: Validate CRDT updates on a custom backend server before broadcasting to peer clients.

---

## 3. Client Payload & Resource Constraints

### Findings
- **Inline Image Base64 Data**: Images uploaded by users are converted to Base64 data URLs (`reader.readAsDataURL`) and stored directly within `ElementData.imageUrl` in the Yjs map.
- **Resource Exhaustion Risk**: Large embedded images can significantly inflate the Yjs update logs, increase WebSocket network bandwidth usage, and degrade client rendering performance.

### Current Protection & Mitigations
- **UI File Size Cap**: `Toolbar.tsx` enforces `MAX_FILE_SIZE = 3 * 1024 * 1024` (3MB limit) and validates image MIME types (`file.type.startsWith('image/')`).
- **Null-Safety on Image Loading**: `CanvasApp.tsx` handles `fabric.Image.fromURL` with null-checks (`if (!img) return;`) to prevent crashes from invalid or corrupted image data URLs.
- **Room Name Length Cap**: `TopBar.tsx` caps room names at `ROOM_NAME_MAX_LENGTH = 50` characters.
- **Profile Name Length Cap**: `TopBar.tsx` caps user profile display names at 24 characters.

### Recommended Production Enhancements
1. **External Object Storage**: Replace inline Base64 strings with uploads to S3/Cloud Storage, storing only secure CDN HTTPS URLs in the CRDT map.
2. **Server-Side Payload Cap**: Enforce maximum WebSocket frame size on the server (`maxPayload: 1024 * 1024`).

---

## 4. UI Safeguards & Injection Defense

### Findings
- **HTML5 Canvas Boundary**: Fabric.js renders element contents (text, sticky notes, frames) on an HTML5 `<canvas>` element using canvas 2D rendering contexts, rendering raw strings safely without DOM HTML parsing.
- **React JSX Escaping**: User display names and room names rendered in React DOM overlays (TopBar, CursorsLayer) are automatically escaped by React, mitigating DOM Cross-Site Scripting (XSS).
- **Floating Property Menu Viewport Guard**: Coordinates for `PropertyMenu.tsx` are calculated using `fabric.util.transformPoint` and bounded within window margins (>= 80px from top, >= 180px from left/right) to prevent offscreen UI rendering or overflow issues.

---

## 5. Persistence & Local Storage Security

### Findings
- **Unencrypted Local Caching**: `IndexeddbPersistence` ('syncboard-v3', ydoc) stores workspace CRDT states offline in browser IndexedDB.
- **Local Access Scope**: IndexedDB is isolated per origin by the browser's Same-Origin Policy (SOP). However, any script executing within the same origin has full access to the stored whiteboard state.

---

## 6. Lifecycle, Concurrency & Memory Protection

### Findings
- **React StrictMode Cleanup**: `CanvasApp.tsx` handles cleanup in `useEffect` returns, explicitly calling `wsProvider.destroy()`, `dbProvider.destroy()`, `yRoomName.unobserve()`, `yElements.unobserve()`, `awareness.off()`, and `fabricCanvas.dispose()`.
- **Ref State Decoupling**: Solved React 19 render-cycle rule violations by moving active tool refs (`activeToolRef`), profile awareness updates (`localUser`), and floating menu coordinate calculation outside of render phases.
- **DOM Reconciliation Container**: Fabric's `<canvas>` element is wrapped in a dedicated container `div` (`containerRef`) to prevent React 19 DOM insertion conflict errors (`insertBefore` on null node).

---

## Summary Matrix

| Security Area | Current Status | Risk Level | Primary Safeguard | Recommended Enhancement |
| :--- | :--- | :--- | :--- | :--- |
| **WebSocket Relay Auth** | Unauthenticated | Medium | Localhost isolation | JWT / Session auth on connection |
| **Data Encryption** | Plain WS | Low (Dev) / High (Prod) | N/A | Enforce WSS / TLS encryption |
| **CRDT Schema Validation** | Client Type Guards | Low | TypeScript + Runtime Guards | Zod validation on incoming updates |
| **File Upload Payload** | 3MB UI Cap | Low | `MAX_FILE_SIZE` + MIME check | S3/Cloud storage URL references |
| **XSS Defense** | Protected | Very Low | React JSX Escaping + Canvas 2D | Content Security Policy (CSP) headers |
| **Offline Persistence** | IndexedDB | Low | Browser Same-Origin Policy | Encrypted offline storage wrapper |
| **Memory & Lifecycle** | Robust | Very Low | Handled cleanup + `dispose()` | Continuous regression monitoring |
