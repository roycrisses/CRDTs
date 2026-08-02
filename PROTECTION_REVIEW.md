# SyncBoard Security & Protection Review

This document provides a comprehensive security assessment and structural protection review of the **SyncBoard** codebase. SyncBoard is a real-time collaborative whiteboarding application that uses [Yjs](https://github.com/yjs/yjs) (CRDTs) over WebSockets via `y-websocket` for state synchronization, [Fabric.js](http://fabricjs.com/) for canvas rendering, and React/TypeScript for the user interface.

While the application provides an excellent, high-performance collaborative experience, its current reliance on a decentralized, trust-based client-server model introduces several security, abuse, and performance limitations. This review details these structural limitations and provides concrete mitigation strategies.

---

## 1. Executive Summary

| Risk Area | Severity | Description | Core Mitigation |
| :--- | :--- | :--- | :--- |
| **Authentication & Access Control** | **Critical** | Unauthenticated WebSocket relay; anyone can connect to any room. | Token-based auth (JWT) handshake on WS connect. |
| **CRDT State Integrity** | **High** | Blind relaying of updates; server does not validate structural updates. | Server-side document validation or headless Yjs schema checker. |
| **Resource Exhaustion (DoS)** | **High** | In-CRDT Base64 image storage allows malicious clients to crash other clients. | Offload images to secure S3/Blob storage; store only validated URLs. |
| **Abuse & Rate Limiting** | **Medium** | No rate limits or IP connection caps on the WebSocket relay. | Implement server-side rate-limiting and connection pooling. |
| **Data Privacy & Injection** | **Medium** | No output sanitization on text rendering, potential XSS on custom inputs. | Strict schema validation and text rendering constraints. |

---

## 2. Deep-Dive Security & Structural Limitations

### A. Unauthenticated WebSocket Relay Server
**Current Implementation:**
The Node.js server (`syncboard/server/index.js`) listens on port 1234. It blindly delegates all connection requests to `setupWSConnection` from `y-websocket/bin/utils`:
```javascript
wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req);
});
```
**The Vulnerability:**
* There are no authorization checks, session validations, or room access controls.
* Anyone who discovers or guesses a room name can join the WebSocket provider (`ws://localhost:1234/yjs-room-name`) and receive/modify the complete whiteboarding state.
* **Impact:** High risk of data eavesdropping, unauthorized modifications, and vandalism of workspaces.

### B. Blind Server-Side Relaying & Unvalidated CRDT Updates
**Current Implementation:**
The `y-websocket` relay acts as an agnostic message passing layer. It collects binary update vectors from one client and sends them to all other connected clients.
**The Vulnerability:**
* The server has no insight into, and does not validate, what is written to the Yjs `Y.Map` or `Y.Text` structures.
* A modified or malicious client could bypass UI restrictions and push arbitrary JSON objects, corrupted binary paths, or massive key-value pairs to the `elements` map.
* **Impact:** Connected clients will attempt to sync these invalid schemas. This can trigger unhandled rendering exceptions, infinite React re-renders, or browser runtime errors (such as the canvas `clearRect` of null errors or out-of-memory heap exhaustion), effectively causing a Denial of Service (DoS) for all legitimate participants in the room.

### C. Client-Side Payload Constraints & Media Abuse
**Current Implementation:**
SyncBoard supports image uploads. The client-side UI (`Toolbar.tsx`) enforces a maximum file size of 3MB and verifies that the uploaded file has a valid image MIME type.
However, once validated, the image is converted to a base64 string and stored directly inside the shared Yjs `ElementData` schema under the `content` field.
**The Vulnerability:**
* A client-side check is easily bypassed by using browser developer tools, custom scripts, or a direct WebSocket connection.
* A malicious actor could transmit massive base64 payloads (e.g., 50MB files) or corrupt base64 strings.
* **Impact:**
  - **Memory Bloat:** The server memory and client-side IndexedDB databases (`y-indexeddb` persistence) will balloon rapidly.
  - **Network Congestion:** WebSocket queues will experience extreme head-of-line blocking, and clients with slower connections will fail to synchronize.
  - **Client-Side Crashes:** When Fabric.js tries to decode and render hundreds of megabytes of base64 data via canvas images, the browser tab will crash due to hardware/WebGL context limitations.

### D. Lack of Server-Side Rate Limiting & Denial of Service (DoS) Protection
**Current Implementation:**
The Node.js WebSocket server does not configure IP connection limiting, message-rate throttling, or maximum payload boundaries.
**The Vulnerability:**
* A single malicious actor can open thousands of simultaneous WebSocket connections or flood the server with arbitrary message payloads.
* **Impact:** Total server CPU and memory exhaustion, resulting in service outages for all board rooms hosted on that instance.

### E. Cross-Site Scripting (XSS) & Script Injection
**Current Implementation:**
Text and room names are synchronized as shared types. Although the UI uses React to render text securely inside standard DOM elements, Fabric.js and some of the rendering overlays might process raw strings.
**The Vulnerability:**
* If exported SVGs, PNG meta-tags, or room name DOM components lack proper output escaping, text payloads could be crafted containing `<script>` or malicious handler hooks.
* **Impact:** Potential execution of unauthorized scripts inside a victim’s session, allowing session hijacking or credential/token theft.

---

## 3. Concrete Recommendations & Mitigation Strategies

To transform SyncBoard into a secure, production-ready enterprise collaboration tool, we recommend implementing the following architectural enhancements:

### 1. Secure the WebSocket Handshake (Auth Gate)
Do not use `setupWSConnection` directly without checking the request authenticity. Implement a verification middleware:
* **Token Handshake:** Require clients to pass a JWT token as a query parameter (e.g., `ws://localhost:1234?token=eyJhbGci...`).
* **Server Verification:** Verify the token against your primary database or authentication server (e.g., Firebase, Auth0, or a custom backend) before completing the WebSocket connection.
* **Room-Level ACL:** Verify that the user payload in the token has read/write permissions for the requested room name.

### 2. Move Media Off the CRDT (Decoupled Asset Uploads)
**Never store raw media payloads directly inside Yjs state.**
* **Upload Flow:** When a user uploads an image, the client should upload the file directly to a secure cloud bucket (e.g., AWS S3, Cloudflare R2, or Google Cloud Storage) via a pre-signed, single-use upload URL.
* **Reference Flow:** Once uploaded, the cloud service returns a CDN-cached, secure, read-only URL.
* **CRDT Reference:** The client writes only this URL to the Yjs `ElementData.content` field.
* **Server Validation:** The cloud storage bucket must enforce strict maximum file sizes (e.g., 3MB) and run virus scanning (e.g., ClamAV) on incoming assets.

### 3. Server-Side Schema Validation (Yjs Headless Checker)
* Run a headless Node.js background worker or use Yjs inside a server-side state-validation model.
* Intercept document update transactions on the server and ensure that keys added/updated in the `elements` map conform precisely to the `ElementData` TypeScript schema.
* Instantly discard any update payload that attempts to modify values outside valid coordinates, sizes, colors, or unexpected field types.

### 4. Implement Server-Side WebSocket Protections
Enhance the WebSocket server initialization in `syncboard/server/index.js` with rate limits and payload restrictions:
* **Max Payload Size:** Restrict the maximum frame size in the `ws` constructor:
  ```javascript
  const wss = new WebSocket.Server({
    server,
    maxPayload: 5 * 1024 * 1024 // Strict 5MB limit per message frame
  });
  ```
* **IP-Based Rate Limiting:** Track connections and incoming message counts per remote IP address. Automatically terminate or throttle connections that exceed thresholds (e.g., max 10 connections per IP, max 60 WebSocket frames per second).

### 5. Output Sanitization & Security Headers
* Ensure that any custom text rendered into DOM/SVG/PNG outputs is strictly sanitized using libraries like `DOMPurify` to eliminate any possible vector for Cross-Site Scripting (XSS).
* Set secure HTTP headers (such as Content Security Policy, X-Content-Type-Options) on the frontend host server to prevent arbitrary scripts from running or loading external unauthorized files.
