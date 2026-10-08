# SyncBoard Security & Protection Review

## Executive Summary

SyncBoard is a real-time collaborative whiteboard application built with React, Fabric.js, Yjs (CRDTs), and WebSocket relays (`y-websocket`). This document presents a comprehensive security and protection review of the SyncBoard architecture, analyzing existing safeguards, structural vulnerabilities, threat vectors, and recommended security hardening measures.

---

## 1. Architecture Overview & Data Flow

SyncBoard utilizes a decentralized client-side state model synchronized over WebSockets:
- **Client Application (`syncboard/client`)**: Manages the local Fabric.js canvas UI and Yjs document (`Y.Doc`). State changes (drawn shapes, sticky notes, frames, badges, uploaded images) are stored in a Yjs shared Map (`elements`) and synced via CRDT updates.
- **Local Persistence**: `y-indexeddb` persists the `Y.Doc` locally in IndexedDB (`syncboard-v3`) for offline resilience and fast initial load times.
- **Relay Server (`syncboard/server`)**: A minimal Node.js HTTP/WebSocket server utilizing `y-websocket/bin/utils`. It acts as a passive message-passing relay that forwards binary Yjs state vector updates and awareness state between connected clients.

---

## 2. Existing Security & Protection Controls

The codebase implements several client-side safeguards to protect application performance, usability, and stability:

1. **File Upload Payload Controls (`Toolbar.tsx`)**:
   - **File Size Cap**: Image uploads are constrained to a maximum size of **3MB** (`MAX_FILE_SIZE = 3 * 1024 * 1024`), preventing bloated base64 payloads from clogging WebSockets and browser memory.
   - **MIME Type Check**: Validates that uploaded files start with `image/*`.

2. **Room Name & Input Limits (`TopBar.tsx`, `constants.ts`)**:
   - **Character Truncation**: Room names are restricted to a maximum length of **50 characters** (`ROOM_NAME_MAX_LENGTH`), preventing layout breaking and memory issues in Yjs shared text objects.

3. **Fabric.js Null-Safety Checks (`CanvasApp.tsx`)**:
   - **Corrupted Image Handling**: Callback functions inside `fabric.Image.fromURL` check for null image instances before adding objects to the canvas, preventing browser crashes or unhandled exceptions from corrupted base64 data.

4. **DOM Isolation & Strict React Lifecycle Cleanup (`CanvasApp.tsx`)**:
   - Canvas element wrapping in dedicated DOM containers avoids React 19 reconciliation conflicts when Fabric.js manipulates `.canvas-container`.
   - Explicit cleanup of Yjs observers (`unobserve`), awareness listeners (`awareness.off`), and canvas instances (`fabricCanvas.dispose()`) on unmount prevents memory leaks and stale execution context errors.

5. **Local Profile Isolation**:
   - Local user metadata (name, color) is synchronized via Yjs awareness decoupled from main canvas initialization, preventing re-render cycles and canvas re-instantiations.

---

## 3. Structural Vulnerabilities & Security Risks

While client-side controls protect basic user operations, the current system architecture presents structural security limitations:

### A. Unauthenticated WebSocket Relay
- **Risk**: The Node.js WebSocket server listens on port `1234` without authentication or session validation (`wss.on('connection', ...)` directly executes `setupWSConnection`).
- **Impact**: Any unauthorized network actor can connect to `ws://localhost:1234`, listen to live room updates, broadcast arbitrary Yjs CRDT operations, or overwrite room contents.

### B. Lack of Server-Side CRDT Validation & Schema Enforcement
- **Risk**: The relay server passes raw Yjs update payloads (`Uint8Array`) between clients without inspecting or validating content structure.
- **Impact**: Malicious clients can send invalid or oversized CRDT operations, unexpected element types, or malicious state mutations that honest client instances cannot render or parse.

### C. Client-Side Only Input & Image Upload Validation
- **Risk**: Image size (3MB limit) and MIME type restrictions are enforced exclusively in `Toolbar.tsx`.
- **Impact**: A malicious actor using custom WebSocket tools can bypass client-side checks and transmit multi-megabyte base64 strings or arbitrary files into the Yjs map.

### D. Denial of Service (DoS) & Resource Exhaustion
- **Risk**: The relay server lacks connection rate limiting, message frequency limits, or maximum room state size caps.
- **Impact**: An attacker can flood the server with connection requests or mass-create millions of canvas elements, causing server memory exhaustion or client browser freeze.

### E. Cross-Site Scripting (XSS) & Content Injection Hazards
- **Risk**: User-controlled content (text items, room names, sticky notes, status badges) is synchronized directly across peers.
- **Mitigation Status**: Fabric.js renders text strings onto HTML5 canvas surfaces rather than injecting innerHTML, which naturally mitigates DOM-based XSS for canvas elements. However, room names or display names displayed in standard DOM elements must remain properly escaped (React handles DOM text escaping by default).

---

## 4. Risk Assessment Matrix

| Threat Vector | Severity | Likelihood | Impact | Current Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **Unauthenticated Room Join** | High | High | High | None (Open WebSocket relay) |
| **Bypassed Image Size Limit** | Medium | Medium | Medium | Client-side check in `Toolbar.tsx` |
| **CRDT State Corruption / Injection** | High | Low | High | Fabric.js null-safety checks |
| **WebSocket Connection Flooding (DoS)** | High | Medium | High | None |
| **Memory / CPU Exhaustion via Massive Map** | Medium | Low | Medium | Client React StrictMode cleanup |

---

## 5. Security Hardening & Mitigation Recommendations

To achieve production-grade security, the following structural improvements should be implemented:

1. **Authentication & Room Authorization**:
   - Implement JWT or token-based authentication on WebSocket upgrade requests (`wss.on('headers')` or upgrade handler).
   - Validate room access tokens on the server before invoking `setupWSConnection`.

2. **Server-Side CRDT Parsing & Validation**:
   - Integrate a lightweight Yjs server instance (`y-websocket` persistence handler or Yjs Node binding) to maintain and validate the authoritative `Y.Doc` state server-side.
   - Enforce element counts, payload size limits, and schema structure on the server.

3. **Rate Limiting & Connection Throttling**:
   - Implement `express-rate-limit` or custom WebSocket throttling (e.g., maximum 50 messages/second per client) to prevent DoS attacks.
   - Restrict maximum concurrent WebSocket connections per IP address.

4. **Transport Layer Security (TLS)**:
   - Deploy WebSockets behind HTTPS/WSS protocols (`wss://`) using SSL/TLS certificates to prevent man-in-the-middle (MitM) eavesdropping or payload tampering.

5. **Content Security Policy (CSP)**:
   - Configure strict CSP headers restricting `connect-src` to trusted WebSocket origins and `img-src` to trusted domains or base64 data URIs.

---

## Conclusion

SyncBoard's current implementation is well-structured for client-side stability and real-time interactive performance. By addressing the server-side authentication, validation, and rate-limiting recommendations detailed in this review, SyncBoard can achieve a robust, production-ready defense posture.
