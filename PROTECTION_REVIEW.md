# Protection and Security Review: SyncBoard Whiteboard Application

## Executive Summary

SyncBoard is a real-time collaborative whiteboard platform built with React, Fabric.js, Yjs CRDTs, and WebSockets (`y-websocket`). This document presents a security and protection review of the application's architecture, data model, network protocol, and client safety controls.

---

## 1. System Architecture & Component Analysis

```
┌────────────────────────────────────────────────────────┐
│                    Client (Vite/React)                 │
│  - Fabric.js HTML5 Canvas                              │
│  - Yjs CRDT (Doc, Map, Text, UndoManager)             │
│  - y-indexeddb (Browser Local Persistence)             │
└───────────────────────────┬────────────────────────────┘
                            │
              WebSocket Connection (ws://localhost:1234)
                            │
┌───────────────────────────▼────────────────────────────┐
│                  Relay Server (Node.js)                │
│  - http server + ws (WebSocket.Server)                │
│  - y-websocket/bin/utils (setupWSConnection)           │
└────────────────────────────────────────────────────────┘
```

---

## 2. Security Assessment & Risk Matrix

| Risk Area | Threat Vector | Current Status / Mitigation | Severity / Recommendation |
| :--- | :--- | :--- | :--- |
| **Authentication & Access Control** | Unauthorized room access or impersonation via WebSocket connection | Unauthenticated. Anyone with the WS URL can join any room name. | **High**: Implement token authentication (JWT) or session verification on WebSocket handshake in server `index.js`. |
| **Data Validation & Sanitization** | Malicious CRDT payloads, oversized objects, XSS injection | Client enforces 3MB image limit and 50-char room name limit. React handles XSS safely. Fabric.js parses base64 with null checks. | **Medium**: Implement server-side message size caps and payload validation in `y-websocket` hooks. |
| **Denial of Service (DoS)** | Resource exhaustion via large payload broadcasts or high-frequency awareness updates | Client filters/debounce Awareness updates. Server lacks rate-limiting. | **Medium**: Implement rate limiting (`ws-rate-limit` or token bucket) on the Node.js relay server. |
| **Client Crash Resistance** | Malformed/corrupted base64 image strings causing browser crash | Implemented null-safety checks in `fabric.Image.fromURL` callback (`CanvasApp.tsx`). | **Low (Mitigated)**: Continuous validation of image URLs before creation. |
| **Memory Leak / Zombie Connections** | Stale Yjs observers or Fabric instances consuming memory on HMR/unmount | Explicit cleanup in `useEffect` unmount (`yElements.unobserve`, `awareness.off`, `fabricCanvas.dispose()`). | **Low (Mitigated)**: Strict cleanup routines implemented. |

---

## 3. Detailed Technical Protection Mechanisms

### 3.1 Client-Side Input Safeguards
1. **File Upload Payload Boundaries**:
   - `Toolbar.tsx` restricts uploaded file sizes to **3MB** (`MAX_FILE_SIZE = 3 * 1024 * 1024`).
   - Validates MIME type to ensure only `image/*` formats are processed.
2. **Room Name Sanitization**:
   - Enforces a maximum length of 50 characters in `TopBar.tsx` to prevent UI layout breakage and DB bloat.
3. **Robust Rendering Bounds & Floating UI Controls**:
   - `PropertyMenu.tsx` constrains floating toolbar positioning to keep menus within visible screen boundaries (at least 180px from horizontal boundaries, 80px from top).

### 3.2 Network & State Synchronization Security
1. **Yjs CRDT Consistency**:
   - Yjs CRDT conflict resolution guarantees eventual consistency across all connected peers without requiring centralized DB locking.
2. **WebSocket Relay Scope**:
   - Server runs a barebones WebSocket listener wrapping `setupWSConnection` from `y-websocket`.
   - Rooms are dynamically created per room topic string.

### 3.3 Memory & React Lifecycle Safety
1. **Unmount Cleanup**:
   - On component unmount, `CanvasApp.tsx` explicitly cleans up:
     - `wsProvider.destroy()` and `dbProvider.destroy()`
     - Yjs observers (`yRoomName.unobserve`, `yElements.unobserve`)
     - Awareness event listeners (`awareness.off`)
     - Fabric canvas context (`fabricCanvas.dispose()`)
2. **Ref Access Decoupling**:
   - Floating property overlays and remote cursor layers are updated reactively without inspecting ref values during render cycles, preventing React 19 StrictMode / concurrent rendering glitches.

---

## 4. Production Hardening Checklist

When deploying SyncBoard to production environments, implement the following safeguards:

1. **WSS Protocol (TLS Encryption)**:
   - Serve WebSockets over `wss://` behind a reverse proxy (e.g., NGINX / Caddy) with valid SSL/TLS certificates to prevent man-in-the-middle inspection.
2. **WebSocket Handshake Authentication**:
   - Attach JWT or authentication headers during WebSocket initiation and verify user credentials inside `wss.on('connection')`.
3. **Server-Side Rate Limiting & Message Caps**:
   - Enforce maximum WebSocket frame size limits (e.g., 5MB per message) on `WebSocket.Server({ maxPayload: 5 * 1024 * 1024 })`.
4. **CORS & Origin Restrictions**:
   - Restrict origin headers during HTTP/WebSocket connection upgrades to allowed production domain origins.
