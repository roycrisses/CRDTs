# SyncBoard Security & Protection Review

## Executive Summary
SyncBoard is a real-time collaborative whiteboard application built with React, Fabric.js, Yjs (CRDTs), and WebSocket relays (`y-websocket`).
This document details a comprehensive security and protection review of the codebase, covering architectural boundaries, structural limitations, threat vectors, implemented guardrails, and recommended production hardening strategies.

## 1. Architectural Overview & System Trust Model
- **Client Tier**: React application running Fabric.js for canvas rendering, Yjs for local CRDT state management, and `y-websocket` / `y-indexeddb` for persistence and sync.
- **Relay Tier**: Node.js WebSocket server using `y-websocket/bin/utils` to broadcast CRDT update vectors and awareness messages between connected peers.
- **Trust Assumption**: The system operates primarily on an optimistic CRDT convergence model where connected clients synchronize shared maps and awareness payloads.

## 2. Structural & Architectural Limitations
1. **Unauthenticated WebSocket Relay**:
   - The WebSocket server accepts connections on port `1234` without verifying client identities or session tokens.
   - Any client with network access can subscribe to room document updates (e.g., `syncboard-main`).

2. **Unvalidated CRDT Document Mutability**:
   - Updates to the Yjs `elements` `Y.Map` and `roomName` `Y.Text` types are processed by the WebSocket relay without deep server-side schema verification.
   - Malicious clients could inject non-conforming objects into the shared document map.

3. **Client-Side Payload & Size Constraints**:
   - While image upload limits (`3MB`) in `Toolbar.tsx` and room name length validation (`50` characters) in `TopBar.tsx` are enforced in the client UI, server-side payload caps and rate limits prevent protocol-level abuse.

4. **Awareness State Spoofing**:
   - User names, colors, cursor positions, and selection IDs sent via Yjs awareness protocol (`awareness.setLocalStateField`) are client-managed and unverified by the server.

5. **Arbitrary Workspace Wiping**:
   - Workspace state clearing (`yElements.clear()`) relies on client confirmation dialogs, though programmatically it can be dispatched by connected clients.

## 3. Potential Attack Vectors & Threat Analysis
- **Denial of Service (DoS) / Resource Exhaustion**:
  - High-frequency WebSocket updates or oversized payloads (e.g., embedding multiple large Base64 images or complex SVG paths) can saturate server network bandwidth and cause client rendering lag or browser crashes (`OOM`).
  - *Mitigation*: 5MB WebSocket payload limit (`maxPayload`) and sliding-window rate limiting (200 msgs/sec) on the relay server.
- **Data Corruption & Injection**:
  - Direct insertion of malicious or corrupted properties into the Yjs map could trigger runtime JavaScript exceptions when rendered on other connected clients.
  - *Mitigation*: Null-safety checks on image decoders, safe defaults, and client error handling.
- **Eavesdropping / Unauthorized Room Access**:
  - Lack of authorization allows unauthorized peers on the local network to join room WebSocket connections.
- **Client Storage Saturation**:
  - Unbounded local state persistence via `IndexeddbPersistence` (`syncboard-v3`) could fill browser IndexedDB storage if millions of objects are appended.
- **Zombie Socket Accumulation**:
  - Abandoned or broken client connections lingering on the relay server wasting socket handles and memory.
  - *Mitigation*: 30-second ping/pong heartbeat cleanup.

## 4. Implemented Defense Mechanisms & Guardrails

### Server-Side Guardrails (`syncboard/server/index.js`)
- **WebSocket Frame Size Capping**: Configured `maxPayload: 5 * 1024 * 1024` (5MB) on the WebSocket server to prevent oversized message frame attacks.
- **Sliding-Window Message Rate Limiting**: Enforced rate limiting (max 200 messages per 1-second window per connection); sockets violating the threshold are closed with code `1008` (Policy Violation).
- **Zombie Socket Heartbeat & Cleanup**: Implemented 30-second ping/pong heartbeat interval that detects dead connections and terminates them to prevent server file descriptor and memory leaks.
- **HTTP Security Headers**: Set `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and Content Security Policy headers on the HTTP upgrade server.
- **Error Resilience & Safe Termination**: Implemented error handlers on HTTP server, WebSocket server, and individual client connections (`conn.on('error')`), preventing uncaught socket exceptions from crashing the relay process. Configured graceful shutdown listeners for `SIGTERM` / `SIGINT`.

### Client-Side Guardrails (`syncboard/client/src/`)
- **Base64 Image Null-Safety Checks**: Null checks within `fabric.Image.fromURL` callbacks in `CanvasApp.tsx` to prevent canvas context `clearRect` errors on malformed image data.
- **Strict Character Limits**: 50-character limit on collaborative room names (`maxLength={50}`) in `TopBar.tsx`.
- **File Upload Type & Size Guards**: Strict `image/*` MIME type verification and `3MB` file size ceiling in `Toolbar.tsx`.
- **JSON Import Hardening & Sanitization**:
  - 5MB maximum file size check before parsing into memory.
  - 500-element maximum batch cap to prevent client-side DoS or browser lockups.
  - Strict type whitelisting (`rectangle`, `circle`, `triangle`, `diamond`, `text`, `sticky`, `path`, `arrow`, `stamp`, `image`, `frame`, `badge`).
  - Finite number validation on coordinates (`position.x`, `position.y`) and dimensions (`size.width`, `size.height`).
  - Content length sanitization (max 10,000 characters).
  - Safe protocol verification for `imageUrl` (`data:image/`, `http://`, `https://`) to block malicious schemes (e.g., `javascript:`).
- **StrictMode Cleanup**: Explicit unobserving of Yjs maps/text, unregistering awareness handlers, and disposing of Fabric canvas contexts on component unmounting to prevent memory leaks and dangling listeners.

## 5. Recommended Production Hardening Strategies
To prepare SyncBoard for enterprise/production multi-tenant deployment, the following additional protections should be considered:

1. **Authentication & Room Access Control**:
   - Implement JWT / OAuth token verification on the WebSocket HTTP upgrade request (`server.on('upgrade')` / `wss.on('connection')`).
   - Associate room names with authenticated user tenancy and permission models (read-only vs. read-write access).

2. **Server-Side CRDT Document Validation**:
   - Implement a custom server provider or `y-websocket` hook to validate incoming document update transactions against defined JSON schema definitions before broadcasting.

3. **Production Reverse Proxy & TLS**:
   - Deploy behind Nginx / Cloudflare termination with `wss://` TLS encryption, origin domain verification, and DDoS rate limiting.

---
*Review Completed: November 2026*
