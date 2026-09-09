# SyncBoard - Security & Protection Review

## Executive Summary

This report presents a security and protection review of **SyncBoard**, a real-time collaborative whiteboard application built with **React**, **Fabric.js**, **Yjs (CRDT)**, and a **Node.js WebSocket Relay Server**.

The objective of this review is to evaluate the application's overall security posture, identify structural vulnerabilities and protection limitations, and provide actionable recommendations for production hardening.

---

## 1. System Architecture & Data Flow

SyncBoard operates on a client-server architecture powered by conflict-free replicated data types (CRDTs):

```
+-------------------------------------------------------------+
|                      Client Application                     |
|  - React UI (TopBar, Toolbar, PropertyMenu, ZoomControls)  |
|  - Fabric.js HTML5 Canvas Rendering                         |
|  - Yjs Document (ydoc) + y-indexeddb Local Persistence      |
+------------------------------+------------------------------+
                               |
                   WebSocket (ws://localhost:1234)
                               |
+------------------------------v------------------------------+
|                     WebSocket Relay Server                  |
|  - Node.js http + ws server                                 |
|  - y-websocket setupWSConnection utility                    |
+-------------------------------------------------------------+
```

### Key Components:
1. **Client (`syncboard/client`)**: Manages canvas state, tool selections, user interaction, base64 image loads, local IndexedDB persistence (`syncboard-v3`), and real-time cursor/selection awareness via Yjs.
2. **Server (`syncboard/server`)**: A lightweight Node.js relay server using `ws` and `y-websocket` utilities to broadcast Yjs sync updates and awareness states among connected clients.

---

## 2. Security & Protection Analysis

### 2.1 Authentication & Authorization
* **Status**: ⚠️ **Unauthenticated Access**
* **Finding**: The WebSocket server (`syncboard/server/index.js`) accepts connections without authenticating client requests or verifying identity credentials. Any client capable of reaching `ws://localhost:1234` can connect to any room (e.g., `syncboard-main`) and modify room content or awareness states.
* **Impact**: Unauthorized users can join active collaborative sessions, alter or erase room canvas elements, or spoof user display names/colors.
* **Mitigation Recommendation**: Implement JWT-based or session token authentication during the WebSocket HTTP handshake (`wss.on('connection', ...)` or `server.on('upgrade', ...)`), validating user identity and room permissions before calling `setupWSConnection`.

### 2.2 Unvalidated CRDT Updates
* **Status**: ⚠️ **Blind Relay Server**
* **Finding**: The server uses `y-websocket/bin/utils` (`setupWSConnection`), which acts as an opaque message relay. It relays binary Yjs update packets without inspecting or validating the internal structure of document mutations (`ElementData`).
* **Impact**: A modified or malicious client can submit malformed, excessively nested, or corrupt Yjs updates into shared `Y.Map` or `Y.Text` instances.
* **Mitigation Recommendation**: Introduce server-side Yjs document binding (`Y.Doc` on the server) to intercept, validate, and sanitize updates against expected schemas before broadcasting to other clients.

### 2.3 Client-Side vs. Server-Side Payload Constraints
* **Status**: 🟡 **Client Enforcement Only**
* **Finding**:
  - **Image Uploads**: Restricted in `Toolbar.tsx` to `MAX_FILE_SIZE = 3MB` and checked via `file.type.startsWith('image/')`.
  - **Room Name**: Constrained in `TopBar.tsx` to `ROOM_NAME_MAX_LENGTH = 50` characters.
  - **Display Name**: Constrained in `TopBar.tsx` to 24 characters (`maxLength={24}`).
* **Gaps**: These limits are strictly client-side UI validations. An attacker sending raw WebSocket messages directly to the relay can bypass client UI checks and insert arbitrarily large base64 strings or strings into the Yjs shared document.
* **Mitigation Recommendation**:
  - Enforce max payload sizes at the WebSocket server level (`maxPayload` parameter in `ws.Server`).
  - Offload image storage to object stores (e.g., AWS S3 / Cloudflare R2) and store clean image URLs in Yjs data instead of raw base64 data strings.

### 2.4 Input Handling, XSS & Injection Protection
* **Status**: ✅ **Low Risk (Strong Sanitization)**
* **Finding**:
  - **Canvas Text Elements**: Fabric.js renders text primitives using standard 2D canvas context methods (`fillText()`), preventing HTML/script tag evaluation in canvas text.
  - **React Components**: TopBar and PropertyMenu components use JSX data bindings (`{roomName}`, `{u.name}`), which automatically escape HTML entities and neutralize DOM Cross-Site Scripting (XSS).
  - **Image Rendering**: Image loads in `CanvasApp.tsx` use `fabric.Image.fromURL` wrapped with a null check on the returned image instance (`if (!img) return`), protecting against DOM crashes from corrupted image source strings.

### 2.5 Rate Limiting & Denial of Service (DoS)
* **Status**: ⚠️ **Unthrottled Broadcasts**
* **Finding**: The server does not enforce connection rate limits, packet rate limits, or message throttling. Rapid event emitters (e.g., continuous mouse movement or script-driven element insertion) can flood the relay.
* **Impact**: High CPU consumption on connected client browsers and bandwidth exhaustion on the relay server.
* **Mitigation Recommendation**: Implement rate-limiting middleware (e.g., `express-rate-limit` or token bucket rate limiters on WebSocket message events) and debounce high-frequency awareness updates (cursors/lasers).

### 2.6 Cross-Site WebSocket Hijacking (CSWSH)
* **Status**: ⚠️ **Origin Unchecked**
* **Finding**: The WebSocket server does not inspect the `Origin` HTTP header during the connection handshake.
* **Impact**: Malicious websites visited by a user could initiate cross-origin WebSocket connections to the local SyncBoard relay server.
* **Mitigation Recommendation**: Validate the `req.headers.origin` against an allowed origin whitelist during the connection setup in `server/index.js`.

---

## 3. Vulnerability Risk Matrix

| Risk Area | Threat Level | Current Status | Remediation Priority |
| :--- | :--- | :--- | :--- |
| **Unauthenticated WebSocket Relay** | High | No token or authentication check | High |
| **Unvalidated CRDT Updates** | High | Blind relaying of binary blobs | High |
| **Client-Only Payload Validation** | Medium | UI limits (3MB images, 50-char room name) | Medium |
| **Rate-Limiting / DoS Protection** | Medium | Unthrottled WebSocket server | Medium |
| **Cross-Site WebSocket Hijacking** | Medium | `Origin` header unvalidated | Medium |
| **XSS / HTML Injection** | Low | Safe (React JSX + Fabric.js Canvas) | Low |
| **Image Crash Vulnerabilities** | Low | Safe (Null checks on `fromURL`) | Low |

---

## 4. Remediation & Hardening Roadmap

1. **Server Authentication & Origin Checks**:
   - Add origin header checks in `syncboard/server/index.js`.
   - Require bearer tokens or signed room access tokens during WebSocket connection initialization.

2. **Server-Side Payload & Connection Throttling**:
   - Set `maxPayload: 5 * 1024 * 1024` (5MB max message size) on `ws.Server`.
   - Throttle client connection rates per IP address.

3. **Schema Validation for Shared State**:
   - Implement server-side Yjs document observers to validate shape properties, text lengths, and element structures.

4. **Externalize Binary Assets**:
   - Transition image uploads from base64 strings stored in Yjs state to presigned S3/R2 uploads, storing clean HTTPS URLs in `ElementData.imageUrl`.
