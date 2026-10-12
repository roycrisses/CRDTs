# SyncBoard Security & Protection Review

## Executive Summary
SyncBoard is a real-time collaborative whiteboard application built with React, Fabric.js, Yjs (CRDTs), and WebSocket relays (`y-websocket`).
This document details a comprehensive security and protection review of the codebase, covering architectural boundaries, structural limitations, attack vectors, and recommended production hardening strategies.

## 1. Architectural Overview & System Trust Model
- **Client Tier**: React application running Fabric.js for canvas rendering, Yjs for local CRDT state management, and `y-websocket` / `y-indexeddb` for persistence and sync.
- **Relay Tier**: Node.js WebSocket server using `y-websocket/bin/utils` to broadcast CRDT update vectors and awareness messages between connected peers.
- **Trust Assumption**: Currently, the system operates on a **peer-trust model** where all connected clients are implicitly trusted to produce valid CRDT updates and cursor awareness payloads.

## 2. Structural & Architectural Limitations
1. **Unauthenticated WebSocket Relay (`syncboard/server/index.js`)**:
   - The WebSocket server accepts connections on port `1234` without verifying client identities, auth headers, session tokens, or room membership authorization.
   - Any client can connect to `ws://localhost:1234` and subscribe to room document updates (e.g., `syncboard-main`).

2. **Unvalidated CRDT Document Mutability**:
   - Updates to the Yjs `elements` `Y.Map` and `roomName` `Y.Text` types are processed blindly by the WebSocket relay server without server-side schema verification or type checks.
   - Malicious clients could inject invalid shape payloads or non-conforming JSON objects into the shared document map.

3. **Client-Side Payload & Size Constraints**:
   - Image upload limits (`3MB`) in `Toolbar.tsx` and room name length validation in `TopBar.tsx` are enforced purely in the client frontend UI.
   - The relay server does not enforce maximum message sizes or rate limits on incoming WebSocket frames.

4. **Awareness State Spoofing**:
   - User names, colors, cursor positions, and selection IDs sent via Yjs awareness protocol (`awareness.setLocalStateField`) are client-managed and unverified by the server.

5. **Arbitrary Workspace Wiping**:
   - Workspace state clearing (`yElements.clear()`) relies on client confirmation dialogs but can be dispatched programmatically by any connected client.

## 3. Potential Attack Vectors & Threat Analysis
- **Denial of Service (DoS) / Resource Exhaustion**:
  - High-frequency WebSocket updates or oversized payloads (e.g., embedding multiple large Base64 images or complex SVG paths) can saturate server network bandwidth and cause client rendering lag or browser crashes (`OOM`).
- **Data Corruption & Injection**:
  - Direct insertion of malicious or corrupted properties into the Yjs map could trigger runtime JavaScript exceptions when rendered on other connected clients.
- **Eavesdropping / Unauthorized Room Access**:
  - Lack of authorization allows unauthorized peers to join room WebSocket connections and stream all canvas data real-time.
- **Client Storage Saturation**:
  - Unbounded local state persistence via `IndexeddbPersistence` (`syncboard-v3`) could fill browser IndexedDB storage if millions of objects are appended.

## 4. Implemented Front-End Defense Mechanisms
To mitigate immediate UI crashes and state corruption, SyncBoard includes the following client-side guardrails:
- **Base64 Image Null-Safety Checks**: Null checks within `fabric.Image.fromURL` callbacks in `CanvasApp.tsx` to prevent canvas context `clearRect` errors on malformed image data.
- **Strict Character Limits**: 50-character limit on collaborative room names (`maxLength={50}`) in `TopBar.tsx`.
- **File Upload Type & Size Guards**: Strict `image/*` MIME type verification and `3MB` file size ceiling in `Toolbar.tsx`.
- **StrictMode Cleanup**: Explicit unobserving of Yjs maps/text and disposing of Fabric canvas contexts on component unmounting to prevent memory leaks.
- **Input Sanitization in JSON Import**: Validation of basic object schema before applying imported JSON templates.

## 5. Recommended Production Hardening Strategies
To prepare SyncBoard for enterprise/production deployment, the following backend and middleware protections should be implemented:

1. **Authentication & Room Access Control**:
   - Implement JWT / OAuth token verification on the WebSocket HTTP upgrade request (`http.createServer` / `wss.on('connection')`).
   - Associate room names with authenticated user tenancy and permission models (read-only vs. read-write access).

2. **Server-Side Message Capping & Rate Limiting**:
   - Configure WebSocket frame size limits (e.g., `maxPayload: 1 * 1024 * 1024` on `ws.Server`).
   - Add token-bucket rate limiters per WebSocket connection to throttle high-frequency message floods.

3. **Server-Side CRDT Document Validation**:
   - Implement a custom server provider or `y-websocket` hook to validate incoming document update transactions against defined JSON schema definitions before broadcasting.

4. **Content Security Policy (CSP) & CORS**:
   - Restrict WebSocket origins (`ws://` / `wss://`) via CORS/Origin header checking on server connection initialization.
   - Enforce CSP headers on client app serving to restrict inline script executions.

---
*Review Completed: September 2026*
