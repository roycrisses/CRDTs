# SyncBoard Security & Protection Review

This document outlines a comprehensive security and protection review of the SyncBoard codebase, detailing structural limitations, vulnerabilities, and recommended mitigations.

## 1. Structural Security Limitations

### 1.1 Unauthenticated WebSocket Relay
The Yjs WebSocket relay server in `syncboard/server/index.js` listens on port `1234` and accepts incoming connection requests without verifying the identity or credentials of clients. Any client can connect and join any room (`syncboard-main` or others passed in URL parameters).
- **Impact:** Unauthorized clients can join workspaces, eavesdrop on real-time board syncs, inject arbitrary canvas updates, and cause denial of service.
- **Recommendation:** Implement token-based authentication (JWT or OAuth2) as part of the connection handshake. Validate the user session against database records before establishing a Yjs WebSocket connection.

### 1.2 Unvalidated CRDT Updates
The backend server runs a standard unopinionated Yjs relay. It broadcasts arbitrary CRDT changes received from clients directly to other clients without validation or sanitization.
- **Impact:** Malicious clients can craft corrupt Yjs document updates, leading to deserialization failures or infinite loops in other clients, effectively crashing their browsers. They can also inject malicious JavaScript or cross-site scripting (XSS) payloads into shared Text fields (e.g., roomName).
- **Recommendation:** Implement server-side verification of document states. Decode and inspect incoming Yjs updates on the server or use a backend-level validation mechanism before broadcasting to the channel.

### 1.3 Client-Side Payload Constraints & File Size Abuse
Clients can upload files and images, converting them to base64 strings and syncing them directly via Yjs elements data. Currently, there is a limit of 3MB enforced on the frontend client (`Toolbar.tsx`), but a malicious actor can bypass the client UI code and send massive base64 payloads directly via WebSocket awareness or document updates.
- **Impact:** Huge image payloads can consume excessive memory on both the WebSocket relay server and recipient clients, leading to OOM (Out Of Memory) crashes or severe rendering lag.
- **Recommendation:** Enforce strict request size limits on the WebSocket server level. Additionally, offload image uploads to a secure cloud storage service (e.g., AWS S3 with pre-signed URLs) and only sync image URLs in the CRDT document rather than base64 strings.

---

## 2. Operational Vulnerabilities & Safeguards

### 2.1 Denial of Service (DoS) via Object Spam
Since Yjs performs continuous synchronization, a malicious user or automated bot can generate thousands of canvas objects within seconds.
- **Mitigation:** Implement client-side and server-side rate-limiting on object creation events.

### 2.2 Room Hijacking
Room names are synchronized via `ydoc.getText('roomName')`. Any collaborative user can rename the workspace or change preferences of other users.
- **Mitigation:** Introduce role-based access control (RBAC), designating certain users as "Owners" or "Editors", and restrict administrative updates (like room renaming or clearing the entire board) to authorized roles only.
