# SyncBoard Security & Protection Review

This document provides a comprehensive security and protection review of the SyncBoard real-time collaborative whiteboard system. It details structural and architectural limitations identified across the client-server boundary and outlines concrete recommendations for mitigation and hardening.

---

## 1. Executive Summary

SyncBoard is a high-performance, real-time collaborative whiteboard built using React, Fabric.js, and Yjs/y-websocket. While the system provides seamless real-time state synchronization, its current architecture prioritizes simplicity and user experience over robust security controls.

Key architectural limitations identified during this review include:
- **Unauthenticated WebSocket relaying** that allows arbitrary connections.
- **Unvalidated CRDT payload updates** processed blindly by the relay server.
- **Client-side-only input constraints** (such as file sizes and file types) which are trivial to bypass.
- **Lack of transport and local data encryption**, exposing sensitive collaboration details.
- **Absent rate limiting and abuse prevention mechanisms**, making the system vulnerable to denial-of-service (DoS) attacks.

Implementing the recommended mitigations will transform SyncBoard from a prototype-grade tool into a secure, production-ready enterprise collaboration platform.

---

## 2. Architectural Overview

SyncBoard operates on a peer-to-peer over client-server architecture model using Conflict-free Replicated Data Types (CRDTs):
1. **Frontend (Client)**: Integrates React, Fabric.js (for rendering and canvas interactions), and Yjs (for local document state tracking). Client instances store document updates in browser-local IndexedDB via `y-indexeddb`.
2. **Backend (Relay Server)**: Runs a Node.js HTTP/WebSocket server using `ws` and `y-websocket/bin/utils`'s `setupWSConnection`. The server functions as a stateless, transparent pub/sub broker, multiplexing binary CRDT updates across clients joined to the same room namespace (e.g., `syncboard-main`).

---

## 3. Critical Structural & Security Limitations

### 3.1. Unauthenticated WebSocket Relays
- **Mechanism**: The relay server (`syncboard/server/index.js`) listens on port 1234 and accepts any incoming connection via `wss.on('connection')` without verifying origin, cookies, session tokens, or API keys.
- **Impact**: Any external client can establish a connection to the server, query or subscribe to any room name, and participate in or hijack active collaboration sessions.

### 3.2. Unvalidated CRDT Payload Updates
- **Mechanism**: Real-time replication uses binary-encoded Yjs updates. The server relies on the generic `y-websocket` utility which relays these updates blindly to other peers in the room.
- **Impact**:
  - **Malicious Payload Injection**: An attacker can forge arbitrary CRDT updates with malicious properties, potentially crashing peer browsers (e.g., triggering loop overflows, extremely large coordinate rendering, or deserialization vulnerabilities in Fabric.js or React components).
  - **Document Corruption**: Rogue updates can permanently corrupt the synchronized Yjs state, making the board unusable.

### 3.3. Client-Side-Only Payload Constraints
- **Mechanism**: Front-end checks (e.g., the 3MB file size limit and image MIME-type validation) are executed entirely in the React client code before generating a base64 representation.
- **Impact**: A malicious actor or compromised client can easily bypass the client-side validations and transmit arbitrary binary frames, huge media files (e.g., 50MB+), or malicious scripts via the raw WebSocket connection. This can lead to server memory exhaustion, network bandwidth saturation, and browser crashes for all connected users.

### 3.4. Unencrypted Local Persistence (IndexedDB)
- **Mechanism**: The application persists local canvas state using `IndexeddbPersistence`.
- **Impact**: State is stored in plaintext within the browser's database. If a user's machine is shared, compromised, or subject to physical access, an unauthorized party can easily read, extract, or corrupt the entire board history.

### 3.5. Lack of Rate Limiting & Abuse Prevention
- **Mechanism**: There are no restrictions on the frequency or size of WebSocket messages (such as cursor updates or mouse move events).
- **Impact**: An attacker can flood the relay server with thousands of requests per second. The server will faithfully attempt to serialize and broadcast these messages, leading to CPU starvation, high latency, memory exhaustion, and complete denial-of-service (DoS) for all active sessions.

### 3.6. Room Namespace Enumeration and Exhaustion
- **Mechanism**: Rooms are designated by arbitrary path names (e.g., `ws://localhost:1234/syncboard-main`). There is no registration or access control list (ACL) for rooms.
- **Impact**: Attackers can brute-force room names to discover and eavesdrop on private collaborative sessions, or pre-emptively connect to and squat on important namespaces.

### 3.7. Potential Cross-Site Scripting (XSS) Vectors
- **Mechanism**: Text objects, sticky notes, and room names are synchronized as string properties and rendered onto the canvas or as React DOM elements (e.g., cursors and top-bar edit panels).
- **Impact**: If strings are rendered unsafely (e.g., without escaping or sanitization), malicious payloads could execute within the context of other users' sessions, allowing session hijacking, token theft, or redirect attacks.

### 3.8. Lack of Confidentiality (Plaintext Transport)
- **Mechanism**: The system defaults to using unencrypted WebSockets (`ws://`) rather than Secure WebSockets (`wss://`).
- **Impact**: Payloads are transmitted in the clear, making them susceptible to sniffing, man-in-the-middle (MitM) attacks, and packet injection on local networks or public Wi-Fi.

---

## 4. Hardening & Mitigation Recommendations

To address these vulnerabilities, the following phased mitigations are recommended:

### Phase 1: Authentication & Authorization (Short Term)
1. **Token-Based Authentication**: Require a JSON Web Token (JWT) or session cookie during the initial WebSocket handshake upgrade. Reject connections lacking a valid signature or expired session.
2. **Access Control Lists (ACLs)**: Implement room-level permissions. Ensure that a user can only connect to a room if they have been explicitly invited or possess sufficient privileges.
3. **Origin Validation**: Configure the WebSocket server to enforce strict `Allowed Origins` checks to prevent Cross-Site WebSocket Hijacking (CSWSH).

### Phase 2: Payload Validation & Server-Side Constraints (Medium Term)
1. **Server-Side Size Limits**: Implement strict byte-size limits on WebSocket frames directly on the Node.js server. Disconnect clients immediately if they exceed size thresholds (e.g., 5MB per frame).
2. **Payload Inspection & Validation**: Modify the relay server to inspect or validate CRDT updates, or decouple the media upload flow. Instead of sending large base64 images over WebSockets, clients should upload media to a secure object storage service (e.g., AWS S3) via pre-signed URLs, storing only the secure media URL in the Yjs CRDT model.
3. **Sanitize Inputs**: Ensure all text inputs and user profile names are sanitized using libraries like `DOMPurify` before rendering them in the DOM.

### Phase 3: Infrastructure & Operational Security (Long Term)
1. **Rate Limiting**: Apply connection rate limits and message rate limits using Token Bucket or Leaky Bucket algorithms (e.g., via `ws-rate-limit` or a reverse proxy like Nginx/Cloudflare).
2. **Enforced Transport Encryption**: Always run WebSocket servers over HTTPS/TLS, forcing the use of `wss://` in production.
3. **Database Encryption**: If using local storage/IndexedDB for offline access, encrypt cached data using standard client-side encryption algorithms (e.g., AES-GCM) with a user-derived key.
