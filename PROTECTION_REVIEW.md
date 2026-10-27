# SyncBoard Security & Protection Review

## Executive Summary
SyncBoard is a real-time collaborative whiteboard application built with React, Fabric.js, Yjs (CRDTs), and WebSocket relays (`y-websocket`).
This document details a comprehensive security and protection review of the codebase, covering architectural boundaries, structural limitations, attack vectors, implemented defense mechanisms, and recommended production hardening strategies.

## 1. Architectural Overview & System Trust Model
- **Client Tier**: React application running Fabric.js for canvas rendering, Yjs for local CRDT state management, and `y-websocket` / `y-indexeddb` for persistence and sync.
- **Relay Tier**: Node.js WebSocket server (`syncboard/server/index.js`) using `y-websocket/bin/utils` to broadcast CRDT update vectors and awareness messages between connected peers.
- **Trust Assumption**: Currently, the system operates on a **peer-trust model** where all connected clients are trusted to produce valid CRDT updates and cursor awareness payloads, backed by server-side rate limits and payload caps.

## 2. Structural & Architectural Limitations
1. **Unauthenticated WebSocket Relay (`syncboard/server/index.js`)**:
   - The WebSocket server accepts connections on port `1234` without verifying client JWT identities, session tokens, or room membership authorization.
   - Any client can connect to `ws://localhost:1234` and subscribe to room document updates (e.g., `syncboard-main`).

2. **Unvalidated CRDT Document Mutability**:
   - Updates to the Yjs `elements` `Y.Map` and `roomName` `Y.Text` types are processed by the WebSocket relay server without server-side JSON schema verification or field type checks.
   - Malicious clients could inject invalid shape payloads into the shared document map.

3. **Awareness State Spoofing**:
   - User names, colors, cursor positions, and selection IDs sent via Yjs awareness protocol (`awareness.setLocalStateField`) are client-managed and unverified by the server.

4. **Arbitrary Workspace Wiping**:
   - Workspace state clearing (`yElements.clear()`) relies on client confirmation dialogs but can be dispatched programmatically by any connected client.

## 3. Potential Attack Vectors & Threat Analysis
- **Denial of Service (DoS) / Resource Exhaustion**:
  - High-frequency WebSocket updates or oversized payloads (e.g., embedding multiple large Base64 images or complex SVG paths) can saturate server network bandwidth and cause client rendering lag or browser crashes (`OOM`).
  - *Mitigated*: Active 5MB payload caps and connection rate limiters (100 msgs/sec window) in `syncboard/server/index.js`.
- **Data Corruption & Injection**:
  - Direct insertion of malicious or corrupted properties into the Yjs map could trigger runtime JavaScript exceptions when rendered on other connected clients.
- **Eavesdropping / Unauthorized Room Access**:
  - Lack of authorization allows unauthorized peers to join room WebSocket connections and stream all canvas data real-time.
- **Zombie Sockets & Resource Leaks**:
  - Unclosed or dropped client connections remaining open on the relay server.
  - *Mitigated*: Server ping/pong heartbeat active interval terminates dead client sockets automatically after 30s.

## 4. Implemented Defense Mechanisms

### A. Server-Side Guardrails (`syncboard/server/index.js`)
- **Max Frame Payload Limits**: Hard limit of 5MB (`maxPayload: 5 * 1024 * 1024`) enforced on the WebSocket server to block oversized Base64 or binary data frames.
- **Sliding-Window Rate Limiting**: Per-connection rate limit of 100 messages/sec. Connections exceeding this threshold are automatically terminated with closure code `1008`.
- **Ping/Pong Heartbeat Monitoring**: 30-second heartbeat interval detects inactive or zombie client connections and terminates them to prevent server memory saturation.
- **HTTP Security Headers**: HTTP health endpoint sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Content-Security-Policy: default-src 'none'`.

### B. Front-End Defense Mechanisms (`syncboard/client/src/`)
- **Base64 Image Null-Safety Checks**: Null checks within `fabric.Image.fromURL` callbacks in `CanvasApp.tsx` to prevent canvas context `clearRect` errors on malformed image data.
- **Strict Character Limits**: 50-character limit on collaborative room names (`maxLength={50}`) in `TopBar.tsx`.
- **File Upload Type & Size Guards**: Strict `image/*` MIME type verification and `3MB` file size ceiling in `Toolbar.tsx`.
- **StrictMode Cleanup**: Explicit unobserving of Yjs maps/text and disposing of Fabric canvas contexts on component unmounting to prevent memory leaks.
- **Input Sanitization in JSON Import**: Validation of basic object schema before applying imported JSON templates.

## 5. Recommended Production Hardening Strategies
To prepare SyncBoard for enterprise/production deployment, the following additional backend and middleware protections should be implemented:

1. **Authentication & Room Access Control**:
   - Implement JWT / OAuth token verification on the WebSocket HTTP upgrade request (`http.createServer` / `wss.on('connection')`).
   - Associate room names with authenticated user tenancy and permission models (read-only vs. read-write access).

2. **Server-Side CRDT Document Schema Validation**:
   - Implement a custom server provider or `y-websocket` hook to validate incoming document update transactions against defined JSON schema definitions before broadcasting.

3. **Production CORS & WSS Encryption**:
   - Restrict WebSocket origins (`ws://` / `wss://`) via CORS/Origin header checking on server connection initialization.
   - Serve WebSocket relay over TLS (`wss://`) in production environments.

---
*Review Completed: October 2026*
