# SyncBoard Security & Protection Review

## Executive Summary

SyncBoard is a real-time collaborative whiteboard application built with React, Fabric.js, Yjs (using `y-websocket` and `y-indexeddb`), Vite, Tailwind CSS, and Node.js. This review presents a comprehensive assessment of the security, data integrity, input validation, network resilience, and rendering protections within the current codebase, along with architectural limitations and a roadmap for production security hardening.

---

## 1. Architecture & Threat Landscape Overview

SyncBoard's system architecture comprises three core operational layers:
1. **Client Application (`syncboard/client`)**: React SPA rendering interactive vector shapes, text elements, drawings, and templates via Fabric.js canvas, synchronized in real time via Yjs CRDTs.
2. **WebSocket Relay Server (`syncboard/server`)**: Node.js HTTP/WebSocket server utilizing `y-websocket/bin/utils` to broadcast binary CRDT sync vectors and awareness state updates between connected clients.
3. **Local Storage Persistence Layer**: Browser IndexedDB (`y-indexeddb` database `syncboard-v3`) allowing local offline availability and state restoration across browser sessions.

---

## 2. WebSocket & Network Layer Security

### Current Implementation Analysis
- **Unauthenticated Relay Server**: The WebSocket server in `syncboard/server/index.js` listens on port `1234` and routes connections via `setupWSConnection(conn, req)`. It accepts incoming WebSocket connections from any client without token verification, user authentication, or connection handshake authorization.
- **Unrestricted Room Access**: Clients connect to room names (e.g. `ws://localhost:1234/syncboard-main`) without room-level access tokens or ACL check. Any client knowing or guessing a room identifier can join and receive/modify canvas state.
- **Transport Security**: Development setup defaults to unencrypted `ws://` protocols.

### Key Risks & Limitations
- **Unauthorized Data Access & Injection**: Unauthenticated peers can eavesboard workspace sessions or insert arbitrary Yjs updates into active documents.
- **Denial of Service (DoS)**: Lack of WebSocket rate limiting, max message size caps, or connection throttling on the Node.js server leaves the server vulnerable to socket flooding or memory exhaustion.

---

## 3. CRDT & Data Integrity Protections

### Current Implementation Analysis
- **Conflict-Free Replication**: Yjs CRDTs ensure eventual consistency across distributed clients without server-side lock contention.
- **Client-Side Type Safety & Null Checks**:
  - `CanvasApp.tsx` employs explicit property fallback mechanisms and type guards when deserializing `ElementData` maps.
  - Image load safety: `fabric.Image.fromURL` utilizes null checks on the returned image callback to prevent browser crashes or uncaught exceptions from malformed/corrupted base64 or URL inputs.
  - Casts and strict type checks protect string manipulation on shared `yRoomName` text fields against duplication anomalies.

### Key Risks & Limitations
- **Server-Side Payload Unvalidation**: The WebSocket relay functions as a pure blind relay. It does not validate Yjs update binary structures or payload sizes before broadcasting them to other peers.
- **CRDT Poisoning**: Malicious or corrupted client state pushed to Y.Map ('elements') will be propagated to all connected clients and persisted in IndexedDB.

---

## 4. Client-Side Input & Resource Protections

### Implemented Controls
- **File Upload Limits**:
  - `Toolbar.tsx` enforces a strict 3MB file size restriction (`MAX_FILE_SIZE = 3 * 1024 * 1024` bytes) for uploaded images.
  - Validates image MIME types using `file.type.startsWith('image/')` before reading data URLs to prevent arbitrary binary file processing.
- **String Length Limits**:
  - `TopBar.tsx` enforces a maximum character constraint (`maxLength={50}`) on collaborative room name edits.
- **DOM Reconciliation Protection**:
  - In `CanvasApp.tsx`, `<canvas ref={canvasRef} />` is wrapped inside a dedicated wrapper `div`. This prevents React 19 DOM reconciliation errors (`Failed to execute 'insertBefore' on 'Node'`) when Fabric.js dynamically wraps the HTML5 canvas element with `.canvas-container`.
- **Decoupled Render & Awareness Updates**:
  - User profile updates (name/color) are decoupled from the main canvas/WebSocket initialization effect, preventing full canvas teardown and re-initialization cycles when users update their profile.

---

## 5. Memory, Performance & Rendering Resilience

### Implemented Controls
- **Lifecycle Garbage Collection**:
  - Clean unmount handling in `CanvasApp.tsx` explicitly destroys `WebsocketProvider` and `IndexeddbPersistence`, unobserves Yjs maps (`yElements`, `yRoomName`), unsubscribes awareness handlers, clears laser trail timers, disposes the Fabric canvas instance, and clears refs (`fabricRef.current = null`).
- **StrictMode & Stale Ref Protection**:
  - Setting `fabricRef.current = null` on unmount prevents decoupled background callbacks (such as awareness changes or resize listeners) from attempting operations on disposed canvas contexts.
- **Event Loop & Rendering Efficiency**:
  - Uses `useRef` for rapidly changing operational states (`activeTool`, `snapToGrid`, `localUser`, `isUpdatingRef`) to prevent unnecessary React component re-render loops during mouse dragging, drawing, or panning.

---

## 6. Production Security Hardening Roadmap

To elevate SyncBoard to enterprise-grade security, the following enhancements are recommended:

1. **Authentication & Authorization**:
   - Implement JWT or session token verification on WebSocket connection handshakes in `syncboard/server/index.js`.
   - Introduce room-level access control lists (ACLs) and read/write permission scopes.

2. **Transport Security**:
   - Enforce TLS/WSS encryption (`wss://`) in production using reverse proxies (e.g. Nginx, Caddy, or Cloudflare).

3. **Server-Side Rate Limiting & Validation**:
   - Add rate limiting and maximum frame size limits (e.g., max 1MB per WS frame) on the Node.js WebSocket server.
   - Implement server-side document verification or Yjs proxy parsing to sanitize CRDT updates.

4. **Content Security Policy (CSP)**:
   - Configure strong HTTP headers and CSP directives restricting image source domains and WebSocket endpoints.
