# SyncBoard Security and Protection Review

## Executive Summary

SyncBoard is a real-time collaborative whiteboard application built with React, Fabric.js, Yjs CRDTs, and a Node.js WebSocket relay server (`y-websocket`). This document presents a comprehensive security, privacy, and protection analysis of the SyncBoard codebase, detailing structural limitations, threat vectors, client-side safety mechanisms, and actionable remediation recommendations.

---

## 1. Architecture Overview

- **Frontend Client (`syncboard/client`)**: React single-page application utilizing Fabric.js for canvas rendering, Yjs (`yjs`, `y-websocket`, `y-indexeddb`) for shared data sync and offline persistence, and Tailwind CSS for UI components.
- **Backend Relay (`syncboard/server`)**: Lightweight Node.js HTTP/WebSocket server using `ws` and `y-websocket/bin/utils` to relay Yjs CRDT state updates and awareness protocol messages across connected peers.

---

## 2. Structural Security Limitations & Threat Vectors

### 2.1 Unauthenticated & Unauthorized WebSocket Relay
- **Current State**: The backend relay in `syncboard/server/index.js` accepts connections indiscriminately without authenticating clients (e.g., missing JWTs, session tokens, or API keys).
- **Risk**: Any untrusted client can connect to `ws://<server>:1234` and subscribe to or overwrite room states by specifying arbitrary room names (e.g., `syncboard-main`).

### 2.2 Lack of Server-Side CRDT & Awareness Validation
- **Current State**: The `y-websocket` utility passes raw Yjs update vectors and awareness messages between peers without inspecting or schema-validating message payloads.
- **Risk**: Malicious actors could broadcast corrupted or malformed Yjs map updates, injecting invalid object types or malformed nested data structures that trigger client runtime exceptions or canvas rendering loops.

### 2.3 Denial of Service (DoS) & Resource Exhaustion
- **Current State**: Neither the server nor the WebSocket connection handler implements message rate-limiting, maximum frame payload limits, or connection throttling per IP address.
- **Risk**: An attacker could flood the relay server with high-frequency awareness/CRDT updates, causing memory spikes, bandwidth exhaustion, and client UI freeze or crashes.

### 2.4 Transport Security & Data Privacy
- **Current State**: Default configuration uses unencrypted `ws://` protocols. Offline persistence via `y-indexeddb` stores the workspace state unencrypted in the user's browser local IndexedDB.
- **Risk**: Communications over public networks are vulnerable to eavesdropping and man-in-the-middle (MitM) attacks unless wrapped in TLS (`wss://`).

---

## 3. Client-Side Protection & Safeguards Analysis

SyncBoard implements several client-side safeguards to maintain application stability and prevent common UI breakages:

### 3.1 File Upload & Base64 Constraints
- **Validation**: `Toolbar.tsx` restricts uploaded files to image MIME types (`file.type.startsWith('image/')`) and enforces a maximum file size limit of 3MB (`MAX_FILE_SIZE = 3 * 1024 * 1024`).
- **Memory Protection**: File size validation prevents oversized base64 strings from overwhelming the browser memory and WebSocket frame limits.

### 3.2 Input Length Limits & Data Truncation
- **Room Name**: Enforces a 50-character limit (`maxLength={50}`) in `TopBar.tsx` and sanitizes duplicate default strings on initialization.
- **Text & Sticky Elements**: User text input is constrained and wrapped with `splitByGrapheme` in Fabric.js to prevent horizontal overflow and UI clipping.

### 3.3 Canvas Rendering Null-Safety & Exception Handling
- **Image Parsing**: In `CanvasApp.tsx`, `fabric.Image.fromURL` checks for `null` image objects before adding to canvas, preventing browser crashes from bad URLs.
- **Strict Mode Context Cleanup**: The canvas disposal cleanup in `useEffect` explicitly sets `fabricRef.current = null` and unregisters observers (`yElements.unobserve`, `yRoomName.unobserve`, `awareness.off`) to eliminate dangling references and prevent `clearRect` context errors on unmount.

### 3.4 Cross-Site Scripting (XSS) Mitigation
- **Canvas Isolation**: Visual canvas elements are rendered directly within HTML5 Canvas (`<canvas>`), eliminating DOM injection vectors.
- **React Escaping**: User cursor labels, profiles, and badges rendered via React DOM components are safely escaped by React's standard JSX output encoding.

---

## 4. Security Risk Matrix

| Threat / Vulnerability | Likelihood | Impact | Severity | Current Status |
| :--- | :---: | :---: | :---: | :--- |
| **Unauthenticated WebSocket Connections** | High | High | **CRITICAL** | Unmitigated (Backend limitation) |
| **Unvalidated CRDT State Injection** | Medium | High | **HIGH** | Partially mitigated on client |
| **WebSocket DoS / Message Flooding** | Medium | High | **HIGH** | Unmitigated |
| **Oversized Image Payload Exhaustion** | Low | Medium | **MEDIUM** | Mitigated on client (3MB limit) |
| **Unencrypted Transport (`ws://`)** | Medium | Medium | **MEDIUM** | Requires TLS reverse proxy |
| **DOM-based Cross-Site Scripting** | Low | Low | **LOW** | Mitigated by React & Canvas |

---

## 5. Actionable Remediation Roadmap

### Phase 1: Short-Term Enhancements
1. **Authentication Handshake**: Integrate token-based authentication (JWT) during the WebSocket connection handshake in `server/index.js`.
2. **Server Payload Limits**: Set `maxPayload` on `ws.Server` (e.g., 5MB per message) to block abnormally large WebSocket frames at the network boundary.
3. **Transport Encryption**: Enforce `wss://` in production using an NGINX or Caddy TLS termination reverse proxy.

### Phase 2: Enterprise Security Hardening
1. **Room Authorization**: Maintain a room ACL database to verify client permissions before joining specific Yjs document sessions.
2. **CRDT Schema Validation**: Implement schema validation (e.g., Zod) on incoming `ElementData` payloads before applying mutations to Fabric.js objects.
3. **Rate Limiting**: Implement a sliding-window rate limiter per client connection in the WebSocket server to drop excessive messages.

---

## 6. Audit & Verification

This protection review was performed as part of the daily maintenance and security audit cycle. Client production builds (`npm run build`), code style linting (`npm run lint`), and server syntax validation (`node --check index.js`) have been verified clean.
