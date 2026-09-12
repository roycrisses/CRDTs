# SyncBoard Security and Protection Audit Review

## Executive Summary
SyncBoard is a real-time collaborative whiteboard application composed of:
1. **Client-Side Application**: React + Vite + Fabric.js (canvas rendering engine) + Yjs (CRDT for conflict-free real-time state synchronization).
2. **Server-Side Infrastructure**: Node.js WebSocket relay server leveraging `y-websocket/bin/utils` (`setupWSConnection`).

This document details a comprehensive security and protection audit of SyncBoard, evaluating network security, CRDT synchronization trust models, client-side input sanitization, asset payload constraints, and operational vulnerabilities.

---

## 1. Network & WebSocket Relay Server Security

### 1.1 Unauthenticated WebSocket Endpoint
- **Finding**: The server (`syncboard/server/index.js`) listens on port 1234 and accepts all incoming WebSocket connections indiscriminately without authentication or authorization tokens.
- **Risk**: Any arbitrary client on the network can open a WebSocket connection to `ws://localhost:1234` or an exposed host URL and read or modify shared room data.
- **Mitigation Recommendation**:
  - Implement authentication middleware (e.g., JWT-based auth or session verification during the HTTP upgrade request).
  - Check user permissions before calling `setupWSConnection(conn, req)`.

### 1.2 Missing Origin & Cross-Site WebSocket Hijacking (CSWSH) Protection
- **Finding**: The WebSocket server constructor `new WebSocket.Server({ server })` does not perform origin validation (`verifyClient` callback or `req.headers.origin` check).
- **Risk**: Malicious web pages on third-party domains could initiate WebSocket connections on behalf of an authenticated browser user (CSWSH).
- **Mitigation Recommendation**:
  - Implement a `verifyClient` handler on the WebSocket server to validate `origin` headers against an allowlist of trusted domains.

### 1.3 Unenforced Message Payload Limits (`maxPayload`)
- **Finding**: The WebSocket server does not configure explicit `maxPayload` restrictions on incoming socket frames.
- **Risk**: Malicious or oversized messages (e.g., massive base64 payloads) sent via raw WebSocket messages could lead to memory consumption spikes or Denial of Service (DoS) on the relay server.
- **Mitigation Recommendation**:
  - Set `maxPayload` on `ws.Server` configuration (e.g., `maxPayload: 5 * 1024 * 1024` for a 5MB threshold).

---

## 2. Real-Time CRDT & Data Synchronization Security

### 2.1 Peer-to-Peer CRDT Trust Model
- **Finding**: Yjs operates under an optimistic, fully-trusted peer model where shared maps (`yElements`) and text (`yRoomName`) accept state mutations broadcast by any connected client.
- **Risk**: A rogue client could send malicious CRDT update vectors that wipe out canvas state, inject unexpected object properties, or broadcast excessive element insertions.
- **Mitigation Recommendation**:
  - Move from a pure relay architecture to an authoritative Yjs backend or server-side CRDT observer that validates document updates against element schemas before broadcasting to other clients.

### 2.2 Unauthenticated Awareness Vector Metadata
- **Finding**: Presence metadata (`awareness.setLocalStateField('user', ...)` and `awareness.setLocalStateField('cursor', ...)`) allows clients to self-report display names, avatar colors, cursor coordinates, and selected element IDs.
- **Risk**: Impersonation of other users' display names or visual selection boxes within collaborative sessions.
- **Mitigation Recommendation**:
  - Bind user identity (name, ID, avatar) on the server side during authentication rather than allowing arbitrary client state claims.

---

## 3. Client-Side Protection & Input Sanitization

### 3.1 File Upload & Payload Size Constraints
- **Finding**: In `syncboard/client/src/components/Toolbar.tsx`, uploaded files are validated against MIME types (`image/*`) and checked for size compliance against `MAX_FILE_SIZE` (3MB limit).
- **Protection Analysis**:
  - Restricting uploads to image MIME types prevents arbitrary binary file uploads.
  - The 3MB file size ceiling prevents browser main-thread unresponsiveness and excessive Yjs CRDT payload sizes during base64 encoding.

### 3.2 Canvas Rendering Null-Safety & Image Hardening
- **Finding**: `syncboard/client/src/CanvasApp.tsx` wraps `fabric.Image.fromURL` callbacks with explicit null-safety checks (`if (!img) return;`) and `crossOrigin: 'anonymous'`.
- **Protection Analysis**:
  - Null-safety checks prevent application crashes or unhandled exceptions if malformed or corrupt base64 image strings are received via CRDT state sync.

### 3.3 UI Input Truncation & DOM Escaping
- **Finding**: `syncboard/client/src/components/TopBar.tsx` enforces `ROOM_NAME_MAX_LENGTH` (50 characters) on room name edits. Display names are capped at 24 characters.
- **Protection Analysis**:
  - React's JSX auto-escaping prevents Cross-Site Scripting (XSS) when rendering user-generated text content, sticky note text, and room names on DOM overlays.

---

## 4. Summary Matrix of Findings & Recommendations

| Threat / Vulnerability | Severity | Current Mitigation | Recommended Fix |
|---|---|---|---|
| Unauthenticated WS Relays | High | None | Add JWT auth to WS connection handshake |
| Missing Origin Checks (CSWSH) | Medium | None | Validate `req.headers.origin` in `verifyClient` |
| Unbounded WS Payload Size | Medium | Client-side 3MB limit | Set `maxPayload` on `ws.Server` |
| CRDT State Spoofing / Disruption | Medium | Yjs UndoManager / IndexedDB persistence | Server-side schema validation of Y.Doc updates |
| Malformed Image Base64 Injection | Low | Null checks in `fabric.Image.fromURL` | Maintain strict client validation & image bounds |
| UI Overflows & Memory Leaks | Low | Input length limits, explicit Yjs/WS cleanup on unmount | Continued adherence to React cleanup patterns |

---
*Audit Completed: September 2026*
