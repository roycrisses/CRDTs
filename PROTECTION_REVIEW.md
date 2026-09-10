# SyncBoard Security & Protection Review

This document provides a comprehensive security and protection review of the SyncBoard codebase (comprising the Node.js WebSocket relay server and the Fabric.js/Yjs-based client application). It outlines critical structural limitations, identifies potential security vulnerabilities, analyzes corresponding threat vectors, and details recommended mitigations to ensure system integrity, availability, and confidentiality.

---

## 1. Executive Summary

SyncBoard is a highly collaborative real-time whiteboard built using [Yjs](https://github.com/yjs/yjs) (Conflict-free Replicated Data Types) and [Fabric.js](http://fabricjs.com/). While it provides highly reactive state synchronization, low latency, and offline-first persistence (via IndexedDB), its default architecture prioritizes development simplicity over security controls.

Several critical security, performance, and stability vectors must be addressed before deployment in a production environment:
1. **Unauthenticated WebSocket Relays**: The backend relay server blindly accepts connection and synchronization messages from any client.
2. **Unvalidated CRDT Updates**: The server acts as a passive relay, distributing state mutations without validation, allowing a single malicious client to corrupt the canvas or clear the board for all users.
3. **Client-Side Payload Constraints**: Massive payloads (such as large images, high-density pen drawings, or corrupted Base64 blobs) are not restricted by the relay, introducing risks of browser crashes, high latency, and Denial of Service (DoS).

---

## 2. Architectural & Security Analysis

### 2.1 Unauthenticated WebSocket Relays
The backend WebSocket relay server (`syncboard/server/index.js`) is built upon the default `y-websocket` bin utilities:

```javascript
const wss = new WebSocket.Server({ server });

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req);
});
```

#### Vulnerabilities:
- **Lack of Authentication**: The server accepts incoming WebSocket connections on port `1234` from any origin without validating authorization headers, cookies, or access tokens.
- **Arbitrary Room Creation**: Anyone can connect and request access to any arbitrary room name (e.g., `ws://localhost:1234/syncboard-main` or `ws://localhost:1234/any-private-room-id`). The server dynamically provisions state in-memory for the room on-demand.
- **Eavesdropping / Data Leakage**: Since room IDs are the sole mechanism for joining a session, guessable or leaked room IDs expose all board contents (elements, text, drawings, metadata) to unauthorized users.

#### Impact:
- **High**: Attackers can join sensitive boards, capture real-time vector coordinate streams, extract proprietary drawings/text, and inject arbitrary canvas objects.

---

### 2.2 Unvalidated CRDT Updates
In Yjs collaboration, clients synchronize state by transmitting binary-encoded update payloads. The `y-websocket` server relays these updates back and forth between all clients connected to the same room:

```javascript
// Clients listen for changes locally and push updates
yElements.observe((event) => {
  // Local render loop handles mutations
});
```

#### Vulnerabilities:
- **Trusting the Client**: The relay server performs no inspections or validations on the Yjs update packets. It is mathematically impossible for a dumb relay to distinguish a valid, user-initiated drawing coordinate from a malicious update intended to delete all objects.
- **Unrestricted Mutability / Deletion**: Any client can execute `yElementsRef.current?.clear()` or delete other users' objects (e.g., `yElements.delete(obj.id)`). Because Yjs treats all nodes with equal authority, these actions are synchronized globally.
- **State Hijacking / Corruption**: A compromised client can send crafted updates that change text values to malicious scripts (Stored XSS), set infinite coordinates, or modify shape types to invalid values.

#### Impact:
- **Critical**: Malicious actors can trivially execute a single-line script to instantly delete weeks of collaborative whiteboard work or inject payload spam that renders the canvas unusable.

---

### 2.3 Client-Side Payload Constraints & Performance Limitations
Whiteboards frequently handle resource-heavy content, such as freehand paths (composed of thousands of SVG coordinate pairs) and raster image uploads.

#### Vulnerabilities:
- **Memory Bloat via Vector Paths**: Freehand pencil strokes create high-density `fabric.Path` objects. A flood of drawings creates thousands of Yjs map entries, resulting in high CPU usage and sluggish browser rendering due to Fabric's re-rendering overhead.
- **Oversized Image Payloads**: Fabric.js synchronizes images by converting them to Base64 strings inside the Yjs map. A 10MB image uploaded by one client translates to a massive Base64 string that must be synchronized over WebSocket and saved to IndexedDB on every peer's machine.
- **Corrupted Base64 Image Processing**: Calling `fabric.Image.fromURL` on invalid or truncated Base64 strings can trigger browser warnings, canvas rendering failures, or application crashes:
  ```javascript
  // Risk of browser crashes and canvas breakages if image URLs are unvalidated or corrupted
  fabric.Image.fromURL(data.url, (img) => { ... })
  ```

#### Impact:
- **Medium-to-High**: Lack of payload limits allows users to degrade the performance of all other connected clients, causing lag, memory leaks, and browser tab crashes.

---

## 3. Denial of Service (DoS) and Flood Vulnerabilities

### 3.1 Rate Limiting Issues
- **No Connection Throttling**: The Node.js server does not restrict the number of concurrent connections per IP address. An attacker can spawn thousands of concurrent WebSocket connections, exhausting socket file descriptors.
- **Message Flooding**: Clients can send an infinite stream of cursor coordinate updates or state mutations per second. The relay server immediately broadcasts these messages, multiplying bandwidth consumption geometrically:
  $$\text{Outgoing Messages} = \mathcal{O}(N^2) \quad (\text{where } N \text{ is the number of active clients})$$

### 3.2 Storage/Memory Exhaustion
- **In-Memory Server State**: The Yjs relay server maintains the document history in memory. In-memory maps can grow indefinitely if users upload large objects, leading to server-side Out-Of-Memory (OOM) crashes.
- **IndexedDB Saturation**: On the client side, local IndexedDB persistence stores all historical Yjs transactions. Over time, bloated transactions can exceed browser quota limits.

---

## 4. Concrete Mitigations & Recommendations

To robustly secure SyncBoard, we recommend implementing the following defense-in-depth mitigations across the architecture:

### 4.1 Authentication and Access Control
1. **Token-Based Authentication**:
   - Require clients to provide a JSON Web Token (JWT) as a query parameter or inside the WebSocket protocol handshake:
     ```javascript
     const wsProvider = new WebsocketProvider(
       'ws://localhost:1234',
       'syncboard-main',
       ydoc,
       { params: { auth: 'YOUR_JWT_TOKEN' } }
     );
     ```
   - In `server/index.js`, intercept the HTTP upgrade request and validate the token signature, expiry, and permissions before accepting the WebSocket connection.
2. **Path-Based Namespace Authorization**:
   - Prevent arbitrary room creation. Require the server to verify that the requesting user has "read" or "write" permissions for the requested room ID against an external application database.

### 4.2 Server-Side CRDT Validation & Filtering
1. **Server-Side Yjs State Inspection**:
   - Instead of a "dumb" relay, run a headless Yjs instance on the server. Join the document room on the server, observe changes, and validate updates before relaying them.
2. **Access Control Lists (ACL) inside CRDTs**:
   - Restrict write operations on specific fields (such as locking shapes or prohibiting non-owners from deleting objects).
   - Reject/drop update packages if they perform prohibited operations or modify read-only structures.

### 4.3 Client-Side Protections & Payload Filtering
1. **Strict File Upload Controls**:
   - In the client toolbar, enforce a strict maximum size (e.g., 3MB) and validate that the MIME type is an approved image format (e.g., JPEG, PNG, WEBP) before base64 conversion:
     ```typescript
     const handleImageUpload = (file: File) => {
       if (file.size > 3 * 1024 * 1024) {
         alert('File size exceeds the 3MB limit.');
         return;
       }
       if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
         alert('Unsupported file format.');
         return;
       }
       // Process file...
     };
     ```
2. **Null-Safety and Error Handlers for Image Loading**:
   - Ensure `fabric.Image.fromURL` handles corrupted base64 strings gracefully without throwing uncaught runtime exceptions:
     ```typescript
     fabric.Image.fromURL(data.url, (img) => {
       if (!img) {
         console.error('Failed to load image: Corrupted or invalid base64 data.');
         return;
       }
       // Add to canvas safely...
     }, { crossOrigin: 'anonymous' });
     ```
3. **Throttling/Debouncing Cursor Coordinates**:
   - Throttle awareness state updates (e.g., cursors) to a maximum of 30-60ms to decrease network traffic significantly while maintaining a smooth visual experience.

### 4.4 Network & Infrastructure Defenses
1. **Reverse Proxy & Rate Limiting**:
   - Deploy Nginx or Cloudflare in front of the WebSocket relay to throttle incoming connections and mitigate distributed DoS (DDoS) attacks.
2. **TLS/WSS Encryption**:
   - Always run the WebSocket connection over `wss://` (WebSocket Secure) in production to encrypt collaborative sessions in transit and prevent eavesdropping or man-in-the-middle attacks.

---

*Prepared by: Jules (Principal Software Engineer)*
