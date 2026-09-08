# SyncBoard Security & Protection Review

## 1. Executive Summary

SyncBoard is a real-time collaborative whiteboard application built with React, Fabric.js, Yjs CRDTs, and WebSockets. This document provides a comprehensive security and protection review of SyncBoard's architecture, relay server implementation, CRDT synchronization mechanics, client-side data handling, and local persistence layer.

While the application provides performant multi-user synchronization, its current implementation operates under an implicit trust model that lacks authentication, transport encryption, payload validation, and rate limiting. This review details these structural limitations, potential attack vectors, and recommendations for hardening the platform for production deployment.

---

## 2. Architectural Security & Relay Server Limitations

### 2.1 Unauthenticated WebSocket Relay Endpoint
- **Finding:** The Node.js relay server (`syncboard/server/index.js`) delegates connection handling directly to `y-websocket/bin/utils` without inspecting authentication headers or session tokens.
- **Impact:** Any client capable of reaching `ws://localhost:1234` can establish a connection to any room, read all whiteboard content, and inject arbitrary updates.
- **Risk Level:** **High**

### 2.2 Absence of TLS / Transport Security (`ws://`)
- **Finding:** WebSockets operate over unencrypted HTTP (`ws://`), exposing all canvas object updates, user profile names, and cursor positioning to local network eavesdropping or Man-in-the-Middle (MitM) inspection.
- **Impact:** Sensitive diagram content and user identity metadata can be intercepted and modified in transit.
- **Risk Level:** **High**

### 2.3 Cross-Site WebSocket Hijacking (CSWSH) & Missing Origin Checks
- **Finding:** The WebSocket server does not validate the `Origin` header during the HTTP upgrade handshake (`wss.on('connection', ...)`).
- **Impact:** Malicious websites visited by an active user can silently establish WebSocket connections to the local SyncBoard server on behalf of the user, extracting or altering whiteboard state.
- **Risk Level:** **High**

### 2.4 Unbounded Connections, Message Sizes, & Rate Limiting
- **Finding:** The WebSocket server does not enforce a `maxPayload` limit, message rate limiting per socket, or IP-based connection limits.
- **Impact:** Attackers can overwhelm server memory and network bandwidth by opening thousands of concurrent sockets or transmitting oversized Yjs binary updates, leading to Denial of Service (DoS).
- **Risk Level:** **Medium-High**

---

## 3. CRDT & Yjs Synchronization Security

### 3.1 Blind Binary Broadcasts & Lack of Server-Side Schema Validation
- **Finding:** The relay server operates as a zero-knowledge byte relay. It receives Yjs update messages as raw binary buffers and broadcasts them to all peers without inspecting or validating the structure of the enclosed CRDT maps (`yElements`).
- **Impact:** A compromised or malicious client can inject invalid data types, malformed path coordinates, or unexpected schema keys that break client render engines across all connected users.
- **Risk Level:** **High**

### 3.2 Unrestricted Mutation & Object Access Control
- **Finding:** Yjs `Y.Map` operations allow any client to modify or delete elements (`yElements.delete(id)` or `yElements.set(id, data)`) created by other participants. There is no concept of object ownership or role-based access control (RBAC).
- **Impact:** Malicious participants can clear entire whiteboards, delete other users' work, or corrupt object coordinates in real time.
- **Risk Level:** **Medium-High**

### 3.3 State Poisoning & Canvas Flooding
- **Finding:** The client listens to `yElements.observe()` and automatically invokes `upsertFabricObject()` for every added key.
- **Impact:** An attacker script can programmatically insert tens of thousands of complex shape objects into `yElements`. This triggers continuous DOM/Canvas re-renders, driving client CPU/GPU usage to 100% and crashing user browser tabs.
- **Risk Level:** **High**

---

## 4. Client-Side Vulnerabilities & Data Handling

### 4.1 Unsanitized String & Path Data Ingestion
- **Finding:** Property values (such as text content `data.content`, path arrays `data.path`, and color strings `data.style.fill`) received over Yjs are assigned directly to Fabric.js instances without strict sanitization or length constraints.
- **Impact:** Unrestricted string lengths can degrade memory performance. Complex or invalid SVG path strings can cause Fabric.js path parser exceptions or infinite render loops.
- **Risk Level:** **Medium**

### 4.2 Property Injections & Type Safety Limits
- **Finding:** The client casts generic string inputs into specific Fabric object definitions (e.g., `(data.path as unknown as string)`).
- **Impact:** Structural mismatches between Yjs `ElementData` and Fabric object instances may throw runtime exceptions during canvas interaction (`renderAll` or `getBoundingRect`), disrupting client operation.
- **Risk Level:** **Medium**

---

## 5. Data Privacy & Local Persistence

### 5.1 Unencrypted IndexedDB Storage (`y-indexeddb`)
- **Finding:** Canvas documents are cached locally using `IndexeddbPersistence('syncboard-v2', ydoc)`. Data is stored in plain, unencrypted browser IndexedDB storage.
- **Impact:** Anyone with physical or malware access to the user's browser profile can extract complete whiteboard history from local storage.
- **Risk Level:** **Medium**

### 5.2 Awareness Protocol Data Leakage
- **Finding:** Yjs Awareness broadcasts user cursor coordinates (`x`, `y`) and user profiles (`USER_NAME`, `USER_COLOR`) unencrypted to all connected clients.
- **Impact:** User activity metadata and real-time cursor tracking are visible to all connected participants without consent toggles or privacy controls.
- **Risk Level:** **Low-Medium**

### 5.3 Predictable / Hardcoded Room Names
- **Finding:** The client connects to a single hardcoded room identifier (`syncboard-main`).
- **Impact:** All users who open the application automatically join the same global workspace, increasing exposure to collision, data overwrites, or targeted disruption.
- **Risk Level:** **Medium**

---

## 6. Vulnerability Matrix

| Vulnerability / Risk Area | Severity | Impact | Primary Cause |
| :--- | :--- | :--- | :--- |
| **Unauthenticated WebSocket Server** | High | Unauthorized data access & manipulation | Lack of Auth/Token validation on WS upgrade |
| **Cross-Site WebSocket Hijacking** | High | Silent session hijacking via third-party web pages | Missing `Origin` header validation |
| **Unencrypted WS Transport (`ws://`)** | High | Passive eavesdropping & MitM attacks | Unencrypted protocol usage |
| **Blind CRDT Broadcast / No Validation**| High | Client rendering crash & state corruption | Zero-knowledge relay without schema checks |
| **Canvas Flooding / Client DoS** | High | Browser tab freeze / crash | Lack of client element limits & rate bounds |
| **Unencrypted IndexedDB Persistence** | Medium | Local document data exposure | Plaintext `y-indexeddb` storage |
| **Hardcoded Room Name (`syncboard-main`)** | Medium | Cross-user data contamination | Lack of dynamic room routing |

---

## 7. Recommended Protection Mechanisms & Remediation Roadmap

1. **Authentication & Authorization:**
   - Integrate JWT or session cookie validation during the HTTP `upgrade` request on the WebSocket server.
   - Enforce origin checks against an explicit allowlist of authorized client domains.
   - Upgrade server connection to Secure WebSockets (`wss://`) using TLS.

2. **Server-Side Payload & Connection Protection:**
   - Configure `maxPayload` on the WebSocket server (e.g., limit single messages to 1MB).
   - Implement rate limiting (e.g., maximum 50 messages per second per client socket).
   - Enforce IP connection limits to prevent socket exhaustion attacks.

3. **Data Schema & Client Sanitization:**
   - Validate Yjs map payloads against a strict schema before applying them to Fabric.js instances.
   - Truncate text content lengths (e.g., max 5,000 characters) and sanitize color/style strings.
   - Implement maximum element caps (e.g., maximum 1,000 objects per board) to safeguard client rendering performance.

4. **Dynamic Room Isolation & Local Storage Encryption:**
   - Replace hardcoded room names with dynamic, unguessable room identifiers (UUIDs/tokens) in the URL hash or query parameters.
   - Provide options to clear IndexedDB local caches on logout or session end.
