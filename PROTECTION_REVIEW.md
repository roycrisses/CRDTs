# SyncBoard Security & Protection Review

## 1. Executive Summary

This document presents a comprehensive security and protection analysis of the **SyncBoard** collaborative whiteboard system. SyncBoard is a real-time collaborative workspace utilizing **React 19**, **Fabric.js** for interactive canvas manipulation, **Yjs** CRDTs for distributed state management, and a Node.js **y-websocket** server running on port 1234 as the relay backend.

This review identifies key security boundaries, structural constraints, threat vectors, and recommended hardening strategies across the client, server, and network protocols.

---

## 2. Architecture & Security Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                      SyncBoard Client                       │
│  (React 19, Fabric.js, Yjs Client, y-indexeddb, Lucide UI)  │
└──────────────┬──────────────────────────────▲───────────────┘
               │                              │
               │  WebSocket (ws://localhost:1234)
               │  Yjs Binary Update Packets   │
               ▼                              │
┌─────────────────────────────────────────────────────────────┐
│                   WebSocket Relay Server                    │
│            (Node.js http + y-websocket utils)              │
└─────────────────────────────────────────────────────────────┘
```

### Key Components:
1. **Client (`syncboard/client`)**: Manages UI state, Fabric.js canvas objects, user awareness cursors, local IndexedDB persistence via `y-indexeddb`, and real-time CRDT updates via `y-websocket`.
2. **Relay Server (`syncboard/server`)**: A lightweight Node.js server using `y-websocket/bin/utils` to broadcast binary Yjs document updates and awareness protocol state between connected clients.

---

## 3. Findings & Vulnerability Analysis

### 3.1 Authentication & Authorization
- **Finding**: The WebSocket server (`syncboard/server/index.js`) operates without authentication or room-level access token validation. Any client capable of reaching `ws://localhost:1234` can connect to any room string (e.g., `syncboard-main`).
- **Risk Level**: **High** in multi-tenant or public deployment scenarios. Unauthorized users can join active collaborative sessions, view confidential canvas data, or clear/modify board contents.
- **Mitigation**: Implement JWT or token-based handshake authentication during the initial WebSocket connection setup in `index.js`.

---

### 3.2 WebSocket Relay Security & Rate Limiting
- **Finding**: The server exposes a generic WebSocket endpoint with no connection rate limiting or per-IP message throttling.
- **Risk Level**: **Medium-High**. Malicious actors or corrupted clients could flood the WebSocket server with high-frequency updates or spam connection attempts, causing high CPU/memory usage or Denial of Service (DoS).
- **Mitigation**: Add connection rate limiting (e.g., using `express-rate-limit` or custom WS handshake throttling) and limit maximum packet message sizes in `ws.Server`.

---

### 3.3 Data Validation & CRDT Payload Integrity
- **Finding**: Incoming Yjs updates transmitted over WebSockets are accepted and merged blindly into the shared `Y.Doc` map (`elements`).
- **Risk Level**: **Medium**. If an attacker crafts raw WebSocket updates containing invalid or oversized JSON structures, recipient clients could throw runtime exceptions or experience browser tab crashes.
- **Client-Side Safeguards Currently Implemented**:
  - Image URL base64 size enforcement (3MB limit in `Toolbar.tsx`).
  - Null-safety checks in `fabric.Image.fromURL` within `CanvasApp.tsx` preventing crashes from corrupted base64 strings.
  - Room name character capping (`ROOM_NAME_MAX_LENGTH = 50`) enforced in `TopBar.tsx`.
- **Mitigation**: Introduce server-side or schema validation (e.g., Zod or JSON Schema) before broadcasting or persisting Yjs updates.

---

### 3.4 Client-Side Resource Limits & Input Handling
- **Finding**: File uploads allow arbitrary image MIME types to be parsed as Base64 data URLs.
- **Client Safeguards Currently Implemented**:
  - File size restricted to `MAX_FILE_SIZE = 3 * 1024 * 1024` (3MB) in `Toolbar.tsx`.
  - MIME type pre-flight check (`file.type.startsWith('image/')`).
  - Canvas element boundaries and canvas zoom clamped between `0.05` and `20`.
- **Recommendation**: Sanitize base64 SVG inputs if SVG uploads are added, to prevent Potential Stored Cross-Site Scripting (XSS) vectors.

---

### 3.5 Cross-Site Scripting (XSS) & DOM Injection
- **Finding**: Fabric.js handles canvas text rendering via native HTML5 Canvas 2D contexts rather than direct DOM innerHTML insertion. Text content rendered inside sticky notes, frames, badges, and text blocks is escaped natively by canvas text APIs.
- **Risk Level**: **Low**. Standard DOM-based XSS vectors via board text elements are implicitly mitigated by HTML5 Canvas text rendering mechanics.

---

### 3.6 Memory Safety & React Cleanup
- **Finding**: React StrictMode can trigger double-mounting of canvas elements, leading to orphan WebSocket connections or `clearRect` errors on null Fabric.js canvas contexts.
- **Current Safeguards Implemented**:
  - `CanvasApp.tsx` implements explicit cleanup in `useEffect` return block:
    - `wsProvider.destroy()`
    - `dbProvider.destroy()`
    - `yElements.unobserve(...)`
    - `awareness.off(...)`
    - `fabricCanvas.dispose()`
    - Explicit reset of `fabricRef.current = null`.

---

## 4. Protection Matrix & Security Controls Summary

| Security Layer | Current Status | Implemented Controls | Recommended Enhancements |
| :--- | :--- | :--- | :--- |
| **Authentication** | Unauthenticated | None (Open WS relay) | Token/JWT verification on WS connection |
| **Authorization** | Room-level string match | Implicit room naming | Room ACLs & owner permissions |
| **Payload Limits** | Client-enforced | 3MB file limit, 50-char room limit | Server-side max message size (e.g., 5MB) |
| **Input Validation** | Client-enforced | Image MIME check, null-safe image load | Schema validation for CRDT map properties |
| **Rate Limiting** | Missing | None | WS handshake rate limit per IP |
| **Canvas Safety** | Implemented | Zoom bounds [0.05, 20], memory cleanup | Canvas object count limits per room |

---

## 5. Audit & Remediation Roadmap

1. **Short-Term (Client & Local Workspace)**:
   - Maintain client-side payload limits and input sanitization.
   - Retain robust React StrictMode cleanup for WebSockets and Fabric.js canvas instances.

2. **Medium-Term (Server Infrastructure)**:
   - Configure environment variables for WS port and CORS origins.
   - Implement `maxPayload` size limits on `WebSocket.Server`.
   - Add authentication middleware for private workspace rooms.

---
*Report compiled and verified for SyncBoard codebase.*
