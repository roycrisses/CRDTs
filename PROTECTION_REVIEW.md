# SyncBoard Codebase Protection & Security Review

This document contains a comprehensive protection and security review of the SyncBoard collaborative canvas application (client and server modules). The audit details potential security vulnerabilities, architectural concerns, risk levels, and recommended mitigations to ensure secure and robust production operations.

---

## 1. Executive Summary

SyncBoard is a real-time collaborative whiteboard application built with React, Vite, Fabric.js, and Yjs (with `y-websocket` as the relay protocol).

While the use of Conflict-free Replicated Data Types (CRDTs) via Yjs ensures reliable state synchronization out of the box, the current implementation operates with minimal active security controls. Specifically:
- **Websocket relay** has no authentication, authorization, or payload validation, allowing arbitrary connections and updates.
- **Client-side storage & state synchronization** lack schema verification, exposing users to cross-site scripting (XSS), DOM manipulation, and denial-of-service (DoS) vectors through malformed CRDT payloads.
- **File & asset handling** do not have active server-side bounds-checking or type verification, which can lead to bandwidth exhaustion or server disruption.

---

## 2. In-Depth Vulnerability Analysis

### 2.1 WebSocket Server Lack of Authentication & Authorization (`syncboard/server/index.js`)
- **Severity**: Critical (High)
- **Description**:
  The WebSocket server (`ws://localhost:1234`) uses the default `setupWSConnection` from `y-websocket/bin/utils` directly without overriding the connection or request handlers. Any client can connect, join any arbitrary room name (e.g., `syncboard-main`), and perform read/write operations.
- **Impact**:
  Unauthenticated attackers can eavesdrop on private collaborative sessions, overwrite whiteboards, inject unauthorized shapes, or wipe entire boards of active users.
- **Mitigation**:
  1. **Token Authentication**: Intercept the HTTP upgrade request and validate a JSON Web Token (JWT) or session cookie passed in the query parameters or request headers before calling `setupWSConnection`.
  2. **Room Access Control**: Implement an authorization check to verify if the authenticated user has access rights to the requested workspace/room ID.

### 2.2 Unvalidated CRDT Payload Ingestion (`syncboard/client/src/CanvasApp.tsx`)
- **Severity**: High
- **Description**:
  The canvas client observes keys in a shared `Y.Map` named `elements` and directly updates Fabric.js objects with the incoming parameters. There is no structural or type validation of the incoming properties (e.g., `id`, `type`, `position`, `style`, `content`, `path`).
- **Impact**:
  - Malformed coordinates (e.g., `NaN`, `Infinity`, or extremely large integers) can freeze or crash the Fabric.js canvas renderer, leading to client-side Denial of Service (DoS) for all participants in a room.
  - A malicious actor can write raw, unexpected keys or nested structures to the shared Map, causing runtime errors or unhandled exceptions when other clients attempt to process the payload.
- **Mitigation**:
  1. **Strict Type/Schema Validation**: Integrate a validation schema library (such as `zod` or a custom lightweight schema guard) inside the `yElements.observe` callback to validate each property before feeding it to `upsertFabricObject`.
  2. **Bounds Checking**: Enforce maximum/minimum bounds for coordinates and scale factors.

### 2.3 HTML & XSS Injection Risks in Room Name and Sticky Note Text
- **Severity**: Medium
- **Description**:
  In React, string interpolation (e.g., `{roomName}` or `{user.name}`) is safely escaped by default. However, sticky notes and text shapes use Fabric's `fabric.IText`, which parses and renders text to a canvas context. While rendering text to a canvas element does not execute script tags (`<script>`), potential downstream exposures exist:
  - If room names, workspace metadata, or sticky note contents are later exported to SVG/HTML format (via `toSVG()` or custom template rendering) and served to users without escaping, it creates a stored XSS vector.
  - Remote user names (`user.name` synchronized through Yjs awareness states) are displayed directly in tooltips and connection elements.
- **Impact**:
  Attackers can insert malicious payloads (`<img src=x onerror=alert(1)>`) into user names, causing execution when elements are dynamically rendered or exported.
- **Mitigation**:
  1. **Input Sanitization**: Sanitize textual updates (room names, sticky note texts, user names) on change using a library like `DOMPurify` before storing them in the shared state.
  2. **Safe DOM Binding**: Avoid dynamic DOM generation using raw HTML; always use standard React components and attributes for UI representation.

### 2.4 Unbounded Memory & File Upload payload Size Limits
- **Severity**: High
- **Description**:
  Collaborators are capable of uploading images or creating heavy vectorized path shapes. If the application allows large image files (as base64 strings) or large custom drawing paths to be written to the Yjs document, the document size will inflate significantly.
- **Impact**:
  - Since Yjs preserves history, extremely large base64 strings or high-frequency path points can cause memory exhaustion on the server and long initial load times for clients.
  - A single actor can crash client browsers by flooding a workspace with oversized image properties or extremely complex paths.
- **Mitigation**:
  1. **File Size and MIME-type Validation**: Restrict base64 image uploads strictly in the frontend (e.g., maximum 3MB limit) and check that headers correspond to safe image MIME-types (`image/png`, `image/jpeg`).
  2. **Path Simplification**: Use path simplification algorithms (e.g., Douglas-Peucker) for freehand drawing to limit the quantity of coordinate pairs stored in Yjs state.

### 2.5 Denial of Service (DoS) via Awareness State Flooding
- **Severity**: Medium
- **Description**:
  The client emits mouse coordinates on every `mouse:move` event to synchronize cursors. There is no rate-limiting or throttling on the rate at which cursor awareness states are distributed through the WebSocket relay.
- **Impact**:
  A malicious client or automated script can flood the server with millions of coordinates per second, saturating WebSocket server bandwidth and CPU resources, causing disconnection or lag for legitimate users.
- **Mitigation**:
  1. **Throttling/Debouncing**: Throttle mouse movement cursor updates to a reasonable interval (e.g., once every 50-100ms) before updating the local awareness state.
  2. **Server-Side Rate Limiting**: Limit the frequency of WebSocket frames accepted from any individual connection on the relay server.

---

## 3. Recommended Security Architecture

To elevate SyncBoard to production-grade security, we recommend adopting a multi-layered security model:

```
+------------------+         Upgrade with JWT          +-------------------+
|  Client Browser  | ================================> | WS Relay Server   |
| (React, Fabric)  |     (HTTPS -> WSS Handshake)      | (Node, y-websocket)
+------------------+                                   +-------------------+
        ||                                                       ||
        || Schema & Input Validation                             || Auth Check &
        \/                                                       \/ Rate-Limiting
+------------------+                                   +-------------------+
| Shared CRDT Map  | <================================ | Auth Provider / DB|
| (Strict Types)   |      Room authorization check     | (User Management) |
+------------------+                                   +-------------------+
```

1. **Transport Layer Security (TLS)**: Always serve both HTTP and WebSocket connections over secure protocols (`https://` and `wss://`).
2. **Server-Side Validation Hooks**: Implement customized Yjs document update listeners on the server to reject malformed or oversized updates from unprivileged sockets before broadcasting them to other clients.
3. **Audit Trails & Storage Isolation**: Ensure that workspaces are logically separated in database storage and that updates are stored in separate IndexedDB namespaces per room.

---

## 4. Conclusion

SyncBoard is highly responsive and feature-rich. By introducing WebSocket authentication, payload schema validation, input sanitization, and awareness state throttling, the application can protect itself against the key risk vectors identified in this review.
