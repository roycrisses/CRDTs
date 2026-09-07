# SyncBoard Protection & Security Review

## Executive Summary
SyncBoard is a real-time collaborative whiteboard application built with React, Fabric.js, Yjs (CRDT), and a Node.js WebSocket relay server. This document presents a comprehensive security and protection review evaluating system architecture, WebSocket relay security, CRDT data integrity, client-side input safety, and Denial of Service (DoS) resilience.

---

## 1. System Architecture & Trust Boundaries

```
[ Browser Client ]  <--- (Unencrypted WS / Yjs Sync Protocol) --->  [ Node.js WS Relay Server ]
  - Fabric.js Canvas                                                 - y-websocket / ws server
  - React Controls UI                                                 - Port 1234
  - Y.Doc & Awareness                                                 - Simple pub/sub relay
  - IndexedDB Persistence
```

### Trust Boundaries
* **Client-to-Relay Network Boundary**: All real-time synchronization messages (CRDT updates, awareness states, cursors) traverse WebSocket connections.
* **Storage Boundary**: Local state is persisted in IndexedDB (`syncboard-v2`).
* **Server Boundary**: Node.js relay server blindly forwards binary Yjs protocol packets between clients connected to the same room.

---

## 2. Security Analysis & Vulnerability Vectors

### 2.1 WebSocket Relay & Network Security
* **Unauthenticated WebSocket Relay**:
  * `syncboard/server/index.js` listens on port `1234` using `ws` and `y-websocket/bin/utils`.
  * **Risk**: No authentication, token validation, or session check is performed upon connection. Anyone who reaches the WebSocket port can connect to any room.
* **Lack of Room Isolation Controls**:
  * Room names are determined solely by URL path/query parameters in `WebsocketProvider`.
  * **Risk**: A malicious actor can enumerate or guess room names (e.g., `syncboard-main`) and inspect or alter collaborative documents.
* **Unencrypted Transport Protocol**:
  * Default development setup connects over plain `ws://localhost:1234`.
  * **Risk**: Susceptible to eavesdropping and Man-in-the-Middle (MitM) attacks if deployed over unencrypted HTTP environments.

### 2.2 CRDT / Yjs Data Integrity & Schema Validation
* **Unvalidated Binary Updates**:
  * The Node.js WebSocket server treats Yjs updates as opaque binary blobs (`Uint8Array`) and broadcasts them to all peers in the same room.
  * **Risk**: An attacker running a custom client script can send crafted Yjs update vectors to insert corrupt objects, arbitrary keys, or malformed data into `yElements`.
* **Awareness Protocol Poisoning**:
  * User metadata (name, color, cursor position) is shared via Yjs awareness.
  * **Risk**: Fake awareness states can spoof other users' cursors or inject arbitrarily large user profile objects into connected clients' state.

### 2.3 Client-Side Input Safety & Rendering
* **XSS & Canvas Context Execution**:
  * Fabric.js renders text objects using HTML5 Canvas 2D context methods (`fillText`), which inherently do not execute HTML script tags or DOM-based XSS vectors inside the canvas.
  * React handles UI elements (e.g., user names in `TopBar` and `CursorsLayer`), which automatically escapes rendered text strings.
* **Base64 Image Upload Safety**:
  * Images added to the canvas are encoded as base64 strings stored in Yjs `ElementData`.
  * **Risk**: Processing invalid or corrupted base64 images inside `fabric.Image.fromURL` can cause unexpected exceptions or crash client render loops.
* **Local Storage / IndexedDB Privacy**:
  * `IndexeddbPersistence` stores canvas state locally in browser storage without encryption.
  * **Risk**: Local device access allows reading document state from IndexedDB.

### 2.4 Denial of Service (DoS) & Resource Exhaustion
* **Unbounded Frame Sizes**:
  * The server `ws` instance does not restrict maximum payload size for incoming frames.
  * **Risk**: Uploading extremely large base64 images or sending massive CRDT update packets can saturate server network bandwidth and client memory.
* **High-Frequency Awareness Spamming**:
  * Client mouse movements trigger awareness state updates on `mouse:move`.
  * **Risk**: Without throttling, rapidly sending mouse coordinates can overflow WebSocket message queues and degrade client frame rates.

---

## 3. Review of Existing Mitigations in SyncBoard

SyncBoard already implements several important safeguards across client components:

1. **Client-Side File Upload Validation (`Toolbar.tsx`)**:
   * File upload size is hard-capped at **3MB**.
   * File MIME types are strictly restricted to image formats (`image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/svg+xml`).
2. **Room Name Input Bounds (`TopBar.tsx`)**:
   * Enforces a maximum length of **50 characters** on room names to prevent layout breaking and memory payload inflation.
3. **Image Loading Null-Safety (`CanvasApp.tsx`)**:
   * `fabric.Image.fromURL` callbacks inspect the initialized image target for `null`/`undefined` before adding it to the canvas, preventing browser crashes from invalid base64 data.
4. **Decoupled Render & Awareness Hooks (`CanvasApp.tsx`)**:
   * User awareness updates (name, color) are decoupled from full canvas re-initialization, preventing unnecessary WebSocket teardowns and canvas re-renders.
5. **Memory Leak Prevention (`CanvasApp.tsx`)**:
   * Component cleanup functions explicitly call `.destroy()` on `wsProvider` and `dbProvider`, `.dispose()` on `fabricCanvas`, and unobserve Yjs maps on unmount.

---

## 4. Security & Protection Mitigation Roadmap

### 4.1 Short-Term Recommendations
1. **WebSocket Authentication & Authorization**:
   * Integrate JWT/token query parameters into the WebSocket upgrade request on `syncboard/server/index.js`.
   * Verify token validity before calling `setupWSConnection`.
2. **Awareness Coordinate Throttling**:
   * Wrap awareness `cursor` broadcast updates inside `mouse:move` with `requestAnimationFrame` or a 50ms throttle function.
3. **Enforce WSS in Production**:
   * Upgrade `WebsocketProvider` connection scheme to `wss://` in non-development environments.
4. **Server-Side Payload Size Limit**:
   * Set `maxPayload` option on `new WebSocket.Server({ server, maxPayload: 10 * 1024 * 1024 })` in `syncboard/server/index.js` to reject oversized frames.

### 4.2 Long-Term Recommendations
1. **Server-Side Yjs State Inspection / Proxy**:
   * Implement a backend Yjs server node that parses `Y.Doc` state changes, validating element structures (`position`, `size`, `type`) against a strict schema before persisting/broadcasting.
2. **End-to-End Encryption (E2EE)**:
   * Encrypt `Y.Doc` update payloads on the client using a shared room secret key so the WebSocket relay server only sees encrypted blobs.
