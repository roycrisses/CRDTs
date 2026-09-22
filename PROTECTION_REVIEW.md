# SyncBoard Security & Protection Review

## Executive Summary
This document provides a comprehensive protection and security review for **SyncBoard**, a real-time collaborative whiteboard application built with React, Fabric.js, Yjs CRDTs, and `y-websocket`.

The review covers:
1. Architectural Security & Threat Landscape
2. Server Transport & Relay Analysis (`syncboard/server`)
3. CRDT & Data Layer Security (`yjs` / `y-websocket`)
4. Client-Side Input Validation & Payload Constraints (`syncboard/client`)
5. Storage & Persistence Analysis
6. Actionable Security Mitigations & Roadmap

---

## 1. Architectural Overview & Threat Model

SyncBoard operates on a peer-to-peer / client-relay architecture where clients connect via WebSocket (`ws://localhost:1234`) to synchronize state using Conflict-Free Replicated Data Types (Yjs).

### Trust Boundaries & Threat Vectors
* **WebSocket Server (`syncboard/server`)**: Unauthenticated relay server. It blindly broadcasts binary Yjs sync protocol updates to all connected clients in a workspace.
* **Client Frontend (`syncboard/client`)**: Responsible for UI rendering (Fabric.js), canvas object updates, and Yjs awareness metadata (cursor positioning, selections, profile information).
* **Network Interception**: Plaintext `ws://` protocol lacks TLS encryption in development, exposing real-time edits, images, and user profile metadata to local network eavesdropping.
* **Malicious Client / Injection**: Rogue WebSocket clients can send malformed or oversized Yjs update payloads, arbitrary text, or unvalidated Base64 image payloads to corrupt canvas state or exhaust client/server memory.

---

## 2. Server Transport & Relay Analysis (`syncboard/server/index.js`)

### Findings & Vulnerabilities
1. **Unauthenticated Access**:
   * Any client can connect to `ws://<host>:1234` without authentication token or room access token verification.
2. **Missing Rate Limiting / Connection Throttling**:
   * The `ws` server does not enforce connection limits per IP or rate limits on WebSocket messages, leaving the service vulnerable to Denial of Service (DoS) through connection flooding.
3. **Absence of Payload Size Validation**:
   * The WebSocket relay passes binary messages directly through `setupWSConnection(conn, req)`. There are no server-side payload size caps enforced at the HTTP/WS handshake level (`maxPayload`).
4. **Transport Encryption**:
   * The server runs over unencrypted HTTP/WS (`ws://`). Production environments must enforce TLS (`wss://`).

---

## 3. CRDT & Data Synchronization Security (`yjs` / `y-websocket`)

### Findings & Vulnerabilities
1. **Unvalidated CRDT Updates**:
   * Yjs CRDT updates are blindly applied and broadcast. A malicious client can insert arbitrary or oversized data into the `elements` map (`Y.Map<ElementData>`) or `roomName` text (`Y.Text`).
2. **Awareness State Poisoning**:
   * Remote awareness data (`users`, `selections`, `cursor`) is updated based on user-supplied objects without server validation. An attacker could spoof cursor positions, inject excessive user profiles, or transmit XSS vectors in user names (mitigated on client by React escaping).

---

## 4. Client-Side Input Validation & Payload Constraints

### Implemented Controls
* **File Upload Payload Size Limit**: `Toolbar.tsx` enforces `MAX_FILE_SIZE = 3MB` (`3 * 1024 * 1024` bytes) and validates MIME types (`file.type.startsWith('image/')`).
* **Room Name Constraints**: `TopBar.tsx` enforces `maxLength={50}` on the room name input field and sanitizes/prevents duplicate string appending in `CanvasApp.tsx`.
* **Fabric.js Image Robustness**: `CanvasApp.tsx` handles `fabric.Image.fromURL` null/error checks and specifies `{ crossOrigin: 'anonymous' }` for cross-origin safety.

### Residual Client Risks
* **Base64 Canvas Bloat**: Storing image Base64 data directly inside Yjs CRDT elements (`data.imageUrl`) causes memory amplification in `y-indexeddb` and high bandwidth overhead over WebSocket connections.
* **Canvas Object Boundary Attacks**: Extreme coordinate values or scale factors sent by rogue clients could shift objects beyond rendered canvas boundaries, causing high layout computational load in Fabric.js.

---

## 5. Storage & Persistence Security

### Findings
* **IndexedDB Storage (`y-indexeddb`)**:
   * Workspace state is cached locally using IndexedDB (`syncboard-v3`).
   * Data is stored unencrypted in the browser's origin storage space.
* **JSON Import/Export**:
   * JSON import validates basic array structure and essential properties (`id`, `type`, `position`) in `handleImportJSON`, mitigating runtime crashing from malformed files.

---

## 6. Recommended Action Plan & Security Mitigations

| Component | Security Vulnerability | Priority | Recommended Mitigation |
| :--- | :--- | :--- | :--- |
| **Server** | Unauthenticated WebSockets | High | Implement JWT authentication on WebSocket handshake (`req.url` query / headers). |
| **Server** | Unbounded Payloads / DoS | High | Configure `maxPayload` on `WebSocket.Server` and rate-limit updates per client. |
| **Server/Transport** | Plaintext Traffic | High | Enforce `wss://` TLS connections in production environments. |
| **Client/Storage** | Base64 Image Ingestion | Medium | Replace inline Base64 storage with external object storage (e.g. S3) + signed URLs. |
| **Data Layer** | Awareness Spoofing | Low | Implement client-side schema validation (e.g. Zod) on all incoming CRDT elements. |

---
*Review compiled for SyncBoard Whiteboard Platform.*
