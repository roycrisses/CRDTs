# SyncBoard Protection & Security Review

## 1. Executive Summary

SyncBoard is a real-time collaborative whiteboard web application built using **React**, **Fabric.js**, **Yjs (CRDT)**, and **y-websocket**. This document presents a comprehensive security and protection review of the SyncBoard codebase, covering architectural limitations, server-side WebSocket vulnerabilities, client-side data handling risks, threat vectors, and recommended security controls.

---

## 2. System Architecture Overview

SyncBoard relies on a client-server architecture for real-time state synchronization and local persistent caching:

1. **Relay Server (`syncboard/server/index.js`)**: An HTTP/WebSocket server using Node.js, `ws`, and `y-websocket/bin/utils`. It acts as an in-memory document relay and synchronization point for clients sharing a room document (`syncboard-main`).
2. **Client Application (`syncboard/client/src/CanvasApp.tsx`)**:
   - Uses **Yjs** (`Y.Doc`, `Y.Map`) for conflict-free replicated data type (CRDT) document synchronization.
   - Uses **y-indexeddb** (`IndexeddbPersistence`) for local browser document persistence (`syncboard-v2`).
   - Uses **y-websocket** (`WebsocketProvider`) connecting to `ws://localhost:1234` for real-time document synchronization and awareness (mouse cursors, user presence).
   - Renders state changes to an HTML5 canvas via **Fabric.js**.

---

## 3. Server-Side Vulnerabilities & Limitations

### 3.1 Unauthenticated WebSocket Server
- **Finding**: The relay server (`index.js`) directly calls `setupWSConnection(conn, req)` upon receiving any WebSocket connection without validating client credentials, tokens, or session headers.
- **Impact**: Any unauthenticated actor who can reach `ws://<server-host>:1234` can connect, join any document room, receive full document updates, and broadcast arbitrary modifications or deletes.

### 3.2 Lack of Origin & CORS Validation
- **Finding**: The server does not inspect the `Origin` header during the HTTP upgrade or WebSocket handshake.
- **Impact**: Cross-Site WebSocket Hijacking (CSWSH) is possible. Malicious third-party websites visited by a user can open WebSocket connections to the SyncBoard server on behalf of the victim.

### 3.3 Absence of Rate Limiting and Connection Throttling
- **Finding**: No connection limits, message frequency rate limiters, or IP-based throttling mechanisms are implemented on the WebSocket server (`ws.Server`).
- **Impact**: An attacker can flood the server with thousands of concurrent WebSocket connections or high-frequency updates, causing Denial of Service (DoS) by exhausting server memory, CPU, or network bandwidth.

### 3.4 Unbounded Payload and Buffer Limits
- **Finding**: `WebSocket.Server` is instantiated with default options without setting `maxPayload`. `y-websocket` processes incoming binary frames directly.
- **Impact**: Clients can transmit arbitrarily large binary messages or CRDT vectors, leading to excessive server buffer allocation, memory exhaustion, or process crash (`ERR_OUT_OF_MEMORY`).

### 3.5 Plaintext Transport Protocol
- **Finding**: The client connects via unencrypted `ws://` (`ws://localhost:1234`).
- **Impact**: In non-local network environments, real-time drawing data, text contents, user names, and metadata are transmitted in cleartext, exposing them to eavesdropping and man-in-the-middle (MitM) modification.

---

## 4. Client-Side Vulnerabilities & Data Handling Risks

### 4.1 Unvalidated CRDT State Ingestion
- **Finding**: In `CanvasApp.tsx`, the `yElements.observe` handler reads element data from `yElements.get(key)` and passes it directly to `upsertFabricObject(key, data)`.
- **Impact**: Malicious or malformed CRDT updates (e.g. invalid shape types, unexpected data structures, NaN coordinates, or malicious SVG paths) injected by a rogue client are executed directly on all connected clients. This can trigger client runtime exceptions, uncaught UI crashes, or continuous canvas re-render loops.

### 4.2 Awareness State Impersonation & Spoofing
- **Finding**: The real-time awareness protocol uses client-side supplied user object state (`awareness.setLocalStateField('user', { name, color })`).
- **Impact**: Clients can broadcast arbitrary user names, administrative identities, or high-frequency cursor movements to impersonate other users or visually disrupt other connected sessions.

### 4.3 Unrestricted Room Access & Hardcoded Document Names
- **Finding**: The WebSocket client connects to a single hardcoded room name (`syncboard-main`).
- **Impact**: All users connecting to the server share a single global workspace room. There is no room isolation, role-based access control (RBAC), or authorization checking per document room.

### 4.4 Local Storage Exposure (`y-indexeddb`)
- **Finding**: Document history and canvas contents are persisted locally using `IndexeddbPersistence('syncboard-v2', ydoc)`.
- **Impact**: Plaintext canvas element data is accessible to any script running within the same origin or local browser context.

---

## 5. Threat Vector Analysis

| Threat Vector | Source | Likelihood | Impact | Severity | Mitigation Summary |
|---|---|---|---|---|---|
| **Unauthorized Data Modification / Deletion** | Remote Client | High | High | **High** | Implement token-based authentication and document-level authorization in `y-websocket`. |
| **Denial of Service (DoS) via Frame Flooding** | Remote Client | High | High | **High** | Introduce IP rate limiting, `maxPayload` caps, and connection limits on `ws.Server`. |
| **Cross-Site WebSocket Hijacking (CSWSH)** | Web Browser | Medium | High | **High** | Validate `Origin` headers on WebSocket server handshake. |
| **Client UI Crash via Malformed Update** | Rogue Peer | Medium | Medium | **Medium** | Enforce client-side schema validation (Zod/Type Guards) prior to Fabric.js object creation. |
| **Man-in-the-Middle (MitM) Eavesdropping** | Network | High | High | **High** | Enforce TLS/WSS encryption (`wss://`). |

---

## 6. Recommended Mitigations & Remediation Plan

1. **Authentication & Authorization**:
   - Implement JWT-based handshake validation in `index.js` prior to calling `setupWSConnection`.
   - Verify room-level permissions before associating a WebSocket connection with a Yjs document.

2. **WebSocket Server Hardening**:
   - Set `maxPayload: 10 * 1024 * 1024` (10MB) or lower on `WebSocket.Server`.
   - Check `req.headers.origin` against an allowed origin whitelist.
   - Integrate rate-limiting middleware (e.g. `express-rate-limit` or custom token bucket per socket) for WebSocket updates.

3. **Client-Side Data Sanitization & Schema Validation**:
   - Use strict type-guard functions or Zod schemas in `CanvasApp.tsx` before invoking Fabric.js constructors (`Rect`, `Circle`, `Path`, `IText`).
   - Validate string lengths and numeric bounds for position, size, and scale properties.

4. **Transport & Storage Security**:
   - Upgrade transport protocol from `ws://` to `wss://` in production deployments.
   - Isolate workspace document IDs dynamically via URL path parameters (e.g., `/room/:roomId`).
