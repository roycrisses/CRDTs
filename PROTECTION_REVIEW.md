# SyncBoard Security & Protection Review

This document provides a comprehensive security and protection audit of the SyncBoard real-time collaborative whiteboard platform. It covers structural limitations of the current architecture, data persistence mechanisms, security posture, potential threat vectors (including Denial of Service and client-side payload attacks), and explicit remediation strategies to make the platform enterprise-ready.

---

## 1. Structural Limitations & Architectural Overview

SyncBoard operates on a peer-to-peer over centralized relay topology using **Yjs** (a high-performance CRDT library) for state synchronization, and **y-websocket** as the transport layer.

### System Components:
1. **Frontend (Vite + React + TypeScript + Fabric.js)**: Responsible for capturing user input, drawing onto a HTML5 canvas, and updating the local Yjs document (`Y.Doc`).
2. **Yjs Relay Server (Node.js + ws + y-websocket)**: A lightweight websocket relay that broadcasts Yjs update packets and awareness states between all clients connected to a room.
3. **Local DB (IndexedDB via `y-indexeddb`)**: Persists the Yjs document state locally in the user's browser for offline editing and state recovery.

### Structural Trust Boundaries (or Lack Thereof):
- **Unauthenticated Relay Server**: The WebSocket relay (`syncboard/server/index.js`) accepts connections from any client to any room. There are no authentication headers, tokens (JWT), or session validations.
- **Unvalidated CRDT Update Stream**: The server does not deserialize or validate the CRDT binary updates. It simply forwards the serialized state changes (`Uint8Array`) to other connected clients. If a malicious client constructs corrupted state updates, the server blindly broadcasts them.
- **Client-Side Authoritative Rendering**: Since the server does not execute Fabric.js or have any concept of the whiteboard's layout, all validation, authorization, and collision resolution happen purely on the client.

---

## 2. Core Security & Protection Findings

### 2.1 transport-Layer Risks (Unencrypted Channels)
- **Finding**: The client initializes connections using the unencrypted `ws://` protocol:
  ```typescript
  const wsProvider = new WebsocketProvider('ws://localhost:1234', 'syncboard-main', ydoc);
  ```
- **Impact**: All whiteboard actions, user details, typed messages, and canvas shapes are transmitted in cleartext. This makes the platform highly vulnerable to **Man-in-the-Middle (MITM)** sniffing and packet tampering on shared public networks.
- **Remediation**: Use secure WebSockets (`wss://`) and secure HTTP (`https://`) in production environments. Ensure the protocol scheme is dynamically selected based on the client window context:
  ```typescript
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  ```

### 2.2 Lack of Authentication & Room Access Controls
- **Finding**: Any client can connect to any document namespace by specifying a room name.
- **Impact**: Unauthorized users can guess room names (e.g., `'syncboard-main'`) and spy on, alter, or completely wipe whiteboard sessions. There is no concept of role-based access control (RBAC) (e.g., Viewer vs. Editor).
- **Remediation**:
  1. Integrate authentication middleware (e.g., OAuth2, JWT) on the WebSocket connection upgrade.
  2. Perform token verification before completing the WebSocket handshake:
     ```javascript
     const url = require('url');
     server.on('upgrade', (request, socket, head) => {
       const { query } = url.parse(request.url, true);
       const token = query.token;
       // Verify JWT token and room-level authorization...
     });
     ```

### 2.3 Injection and XSS (Cross-Site Scripting) Risks
- **Finding**: The whiteboard supports collaborative text rendering via `fabric.IText` objects.
- **Impact**: While Fabric.js renders directly to canvas, which is immune to DOM-based XSS, any features that export or display the text contents in standard DOM elements, or export the canvas using SVGs, could be vulnerable to HTML/JS injection if not properly escaped.
- **Remediation**: Ensure text content is sanitized prior to exporting to SVG or rendering inside UI lists. Avoid ever using `dangerouslySetInnerHTML` with synchronized properties.

### 2.4 Denial of Service (DoS) and Vandalism (Input Spam)
- **Finding**: Fabric.js listeners emit multiple rapid updates (e.g., `object:moving`, `object:scaling`) which are directly synced via Yjs.
- **Impact**: A malicious user can write a script to flood the WebSocket channel with hundreds of thousands of updates or giant bounding boxes, causing:
  1. Client browser memory exhaustions and UI rendering freezes (Main Thread blocked by Fabric.js re-renders).
  2. WebSocket relay server bandwidth spikes or exhaustion.
- **Remediation**:
  1. **Rate Limiting**: Implement connection and message rate limiting on the relay server.
  2. **Throttling Updates**: Throttle client-side object updates so state changes are only synchronized at a controlled frequency (e.g., 50ms intervals during dragging) rather than synchronously on every mouse move.
  3. **Input Validation**: Add limits on shape coordinates and dimensions. Discard objects placed outside sane canvas coordinates (e.g., coordinates larger than $\pm 1,000,000$).

### 2.5 Data Privacy in IndexedDB / Local Storage
- **Finding**: SyncBoard uses IndexedDB via `y-indexeddb` to persist state:
  ```typescript
  const dbProvider = new IndexeddbPersistence('syncboard-v2', ydoc);
  ```
- **Impact**: If multiple users share a single workstation (e.g., in school labs or public offices), anyone accessing the machine can open the Developer Console, dump the IndexedDB databases, and steal highly sensitive whiteboard drawings and written ideas.
- **Remediation**:
  1. Implement client-side encryption of the synchronized document structure before saving it to IndexedDB, or
  2. Offer a "Private/Incognito Session" mode that disables `y-indexeddb` persistence, relying entirely on ephemeral in-memory state.

### 2.6 Large File Payload & Image Upload Protection
- **Finding**: The system supports uploading external images/media.
- **Impact**: Storing uncompressed base64 image strings inside Yjs `ElementData` can bloat the document to several megabytes. Because Yjs keeps a full historical record of changes for conflict-free resolution, uploading large files rapidly inflates memory footprint and kills synchronization speed.
- **Remediation**:
  1. **Size Validation**: Enforce strict file size limits on the client before processing any uploaded image (e.g., `< 3MB`).
  2. **Media Storage Server**: Do not embed raw base64 images directly inside the Yjs document state. Instead, upload images to a secure, access-controlled media store (e.g., AWS S3) and store only the secure, ephemeral URL in the Yjs text attribute.

---

## 3. Security Hardening Roadmap

| Priority | Hardening Measure | Target Component | Description |
| :--- | :--- | :--- | :--- |
| **P0** | Enforce TLS (WSS / HTTPS) | Transport (Server/Client) | Encrypt all data in transit. |
| **P0** | WebSocket Auth Handshake | Connection Middleware | Require authentication tokens to open a sync channel. |
| **P1** | Media File Upload Filtering | Client-Side Image Tool | Enforce strict size validation and mime-type verification. |
| **P1** | Rate Limiting & DoS Protection | WebSocket Server | Implement client message rate-limiting at the socket level. |
| **P2** | Coordinate Sanity Checking | Client canvas parser | Reject shapes with infinite or astronomically large dimensions. |
| **P2** | Selective IndexedDB Storage | Client state manager | Provide toggle options to disable local persistence. |

---

## 4. Conclusion

By addressing the transport layer encryption, establishing robust authentication controls at connection upgrade time, enforcing strict image upload limits, and throttling real-time coordinate updates, SyncBoard can transition from an open, collaborative prototype into a highly secure, enterprise-grade interactive workspace.
