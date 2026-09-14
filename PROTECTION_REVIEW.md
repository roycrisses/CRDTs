# SyncBoard Security & Protection Review

## Executive Summary
This document provides a comprehensive security, architecture, and protection review of SyncBoard—a real-time collaborative whiteboard application built with React, Fabric.js, Yjs CRDTs, and a Node.js WebSocket relay server.

The review examines system vulnerabilities, network security posture, data integrity mechanisms, payload protections, and offline persistence security. Key recommendations are provided to guide production hardening and risk mitigation.

---

## System Architecture Overview
SyncBoard operates on a peer-to-server-peer CRDT architecture:
- **Client**: React 19 application utilizing Fabric.js for 2D canvas rendering and `y-websocket` + `y-indexeddb` for real-time state synchronization and local persistence.
- **Server**: Node.js HTTP/WebSocket server utilizing `y-websocket` binary utilities (`setupWSConnection`) acting as a real-time message relay on port 1234.
- **Data Model**: Collaborative Yjs document (`Y.Doc`) maintaining `yElements` (a `Y.Map` of whiteboard elements) and `roomName` (`Y.Text`), alongside `awareness` states for cursors and selections.

---

## Detailed Vulnerability & Protection Analysis

### 1. WebSocket & Network Infrastructure Security

#### Findings
- **Unauthenticated Relay Server**: The WebSocket server in `syncboard/server/index.js` accepts connections indiscriminately without verifying client identity, session tokens, or API keys.
- **Lack of Authorization and Multi-tenancy Isolation**: Any client connected to `ws://localhost:1234` can listen to or push updates to any document room name without access controls or role permissions.
- **Unbounded Connection & Message Rate Limits**: The server does not enforce per-client message frequency limits, connection count caps, or maximum payload size limits on incoming WebSocket frames.
- **Unencrypted Transport (`ws://`)**: Default client configuration uses unencrypted WebSocket streams (`ws://`), exposing CRDT operations and awareness updates to network sniffing and man-in-the-middle (MitM) inspection unless wrapped behind TLS.

#### Impact
- Risk of unauthorized users joining rooms, inspecting real-time canvas data, or overwriting content.
- Vulnerability to Denial-of-Service (DoS) attacks via WebSocket flooding or oversized binary message payloads.

---

### 2. CRDT State Integrity & Payload Validation

#### Findings
- **Passive Relay Validation Deficits**: The `y-websocket` relay server operates purely as a passive CRDT message router without validating the structure or schema of Yjs updates.
- **Direct CRDT Manipulation Vulnerabilities**: While the front-end enforces constraints during user actions (e.g., file size validation, string truncation), a malicious client could directly construct and inject invalid or malicious `ElementData` directly into `yElements`.
- **Base64 Payload Storage**: Images uploaded via the toolbar are serialized into base64 Data URLs and stored directly inside the `imageUrl` field of `ElementData`. Large base64 strings increase Yjs state size, causing memory growth across all participating clients and excessive WebSocket bandwidth utilization.
- **Client-Side Rendering Resilience**:
  - `CanvasApp.tsx` guards against canvas corruption by validating `fabric.Image.fromURL` callbacks and checking for `null` image instances.
  - Room name inputs restrict length to 50 characters (`ROOM_NAME_MAX_LENGTH`).
  - Container wrappers around `<canvas>` protect React DOM reconciliation against Fabric.js DOM insertions.

#### Impact
- Memory inflation and browser freezing on client devices if oversized or deeply nested structures are pushed into Yjs maps.
- Potential crash vectors if corrupted path geometries or malformed image base64 strings bypass UI validation.

---

### 3. Client-Side Input Security & XSS Assessment

#### Findings
- **Canvas Rendering Context**: Text elements and sticky note contents are rendered via Fabric.js canvas objects (`fabric.IText`), which draw directly onto an HTML5 `<canvas>` context rather than rendering unsanitized HTML into the DOM.
- **React JSX Interpolation**: Profile names and room titles in UI overlays (`TopBar.tsx`, `CursorsLayer.tsx`) rely on standard React string rendering, mitigating DOM-based Cross-Site Scripting (XSS) injection.
- **File Upload Guardrails**: `Toolbar.tsx` enforces client-side file filtering (`accept="image/*"`), MIME prefix checking (`file.type.startsWith('image/')`), and a strict 3MB size ceiling (`MAX_FILE_SIZE = 3 * 1024 * 1024`).

#### Impact
- Low direct XSS risk via text fields due to canvas-native text rendering and React escaping.
- Mitigation effectiveness relies on client UI constraints; additional server/relay protections are required to secure against non-browser clients.

---

### 4. Local Persistence & Data Privacy

#### Findings
- **Unencrypted Local Persistence**: IndexedDB persistence via `y-indexeddb` (`syncboard-v3`) caches the full CRDT history on the user's local disk.
- **Local Storage Exposure**: Document content, room names, and user profiles persist across sessions without encryption at rest in the browser storage layer.
- **Exported Asset Privacy**: Board exports (`PNG` generation via `canvas.toDataURL()`) run entirely client-side without sending data to external export services.

#### Impact
- Physical or local account access to the client device allows inspection of cached canvas state from IndexedDB.

---

## Actionable Recommendations & Hardening Strategy

### Phase 1: High Priority (Infrastructure & Authentication)
1. **WebSocket Authentication & Token Validation**:
   - Implement authentication middleware in `syncboard/server/index.js` using JSON Web Tokens (JWT) or session cookies during the WebSocket handshake (`upgrade` request).
2. **TLS / Secure Transports (`wss://`)**:
   - Mandate TLS encryption (`wss://`) for WebSocket endpoints in production deployments via NGINX/Caddy reverse proxies or HTTPS Node servers.
3. **Connection & Payload Rate Limiting**:
   - Configure maximum payload size limits (e.g., `maxPayload: 1 * 1024 * 1024` in `ws.Server`).
   - Implement connection throttling and message rate limiting per IP address using libraries like `express-rate-limit` or custom WebSocket message buckets.

### Phase 2: Medium Priority (Storage & Data Optimization)
4. **Decouple Large Assets from CRDT State**:
   - Replace base64 Data URL storage in `ElementData.imageUrl` with presigned S3 / Object Storage upload URLs. Store only lightweight HTTPS image URLs inside Yjs maps.
5. **Server-Side Room Authorization**:
   - Maintain room access control lists (ACLs) on the backend server to ensure users can only subscribe to authorized room topics.

### Phase 3: Low Priority (Client & Storage Hardening)
6. **Encrypted Offline Storage**:
   - Evaluate client-side encryption options (e.g., Web Crypto API) if sensitive workspace data must be stored in IndexedDB.
7. **CRDT Schema Validation**:
   - Implement structural type validation in client-side Yjs event observers (`yElements.observe`) to safely discard malformed or unknown element schema types before canvas insertion.

---

## Summary Matrix

| Category | Status | Current Mitigation | Recommended Action |
| :--- | :--- | :--- | :--- |
| **WS Authentication** | ⚠️ Vulnerable | None (Open Relay) | Add JWT authentication on WS connection handshake. |
| **Network Transport** | ⚠️ Unencrypted | `ws://` default | Deploy TLS (`wss://`) via reverse proxy. |
| **Payload Limits** | 🟡 Partial | Client 3MB image check, 50-char room limit | Add WS server `maxPayload` and rate-limiting. |
| **XSS Protection** | 🟢 Secure | Canvas context rendering & React escaping | Maintain current context isolation. |
| **Asset Storage** | 🟡 Functional | Base64 strings in Yjs CRDT | Transition base64 images to S3 / Object Storage. |
| **Local Storage** | 🟡 Plaintext | IndexedDB persistence (`y-indexeddb`) | Consider Web Crypto API encryption if required. |
