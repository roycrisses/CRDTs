# SyncBoard Security and Protection Review

This document provides a comprehensive security and protection audit of the SyncBoard collaborative whiteboard platform, analyzing its architecture, client-side safeguards, server-side WebSocket relay vulnerabilities, and structural CRDT protection mechanisms.

---

## 1. Executive Summary

SyncBoard is a real-time collaborative whiteboard application powered by **React**, **Fabric.js**, **Yjs (CRDT)**, and **y-websocket**.

While the system implements several robust client-side input validations, payload controls, and memory lifecycle protections, the WebSocket relay server currently operates in a permissive mode without authentication or message validation. This review outlines existing protections, structural security gaps, risk severity assessments, and concrete remediation recommendations.

---

## 2. Architecture Overview

- **Client (`syncboard/client`)**: Built with React 19, TypeScript, Tailwind CSS, and Fabric.js. Real-time synchronization is driven by Yjs shared documents (`yDoc.getMap('elements')` and `yDoc.getText('roomName')`) connected via `WebsocketProvider`. Local offline persistence is provided by `IndexeddbPersistence`.
- **Server (`syncboard/server`)**: A lightweight Node.js HTTP & WebSocket relay server using `y-websocket` running on port `1234`. It accepts WebSocket connections and proxies Yjs sync protocol messages across clients in the same room.

---

## 3. Client-Side Protection Mechanisms & Safeguards

The client codebase incorporates multiple defensive mechanisms to ensure stability, prevent UI degradation, and protect client memory:

### 3.1 Payload & File Upload Protection
- **File Size Validation**: In `Toolbar.tsx`, file uploads (such as images) are restricted to a maximum size of **3MB** (`MAX_FILE_SIZE = 3 * 1024 * 1024`).
- **MIME Type Validation**: Only MIME types matching `image/*` are accepted, preventing non-image binaries or executable scripts from being uploaded.

### 3.2 Input Sanitization & String Boundaries
- **Room Name Length Limit**: In `TopBar.tsx`, room names are enforced to a maximum length of **50 characters** (`ROOM_NAME_MAX_LENGTH = 50`) both via HTML attributes (`maxLength={50}`) and programmatically inside event handlers to prevent layout overflow and storage bloat.

### 3.3 Canvas Context & Image Safety
- **Null-Safe Image Loading**: In `CanvasApp.tsx`, `fabric.Image.fromURL` includes explicit null-checks in its callback before adding image objects to the canvas, preventing application crashes if invalid or corrupted base64 strings are present in the Yjs map.
- **React 19 DOM Wrapper Isolation**: The `<canvas>` element is wrapped in a dedicated `<div>` container to isolate Fabric.js DOM mutations from React 19's virtual DOM reconciliation tree, preventing `insertBefore` DOM exceptions.

### 3.4 Memory Management & Event Listener Cleanup
- **Strict Cleanup on Unmount**: In `CanvasApp.tsx`, observers (`yElements.unobserve`, `yRoomName.unobserve`), awareness listeners (`awareness.off`), and window event listeners are explicitly unregistered during component unmount.
- **Canvas Instance Disposal**: `fabricRef.current.dispose()` and `fabricRef.current = null` are executed on unmount to prevent memory leaks and eliminate `clearRect` null-context errors under React StrictMode or Hot Module Replacement (HMR).

### 3.5 Selection & State Synchronization Integrity
- **Local Creation Isolation**: Newly created canvas elements are tracked in `localCreatedIdsRef` Set, ensuring local programmatic selection without interfering with remote users' active selections.
- **Safe Viewport Overlay Calculations**: Viewport overlay positioning transforms use `fabric.util.transformPoint` with typed `fabric.Point` objects, ensuring DOM overlays (like `PropertyMenu`) track canvas objects accurately across zoom and pan actions.

---

## 4. Server-Side Security Gaps & Structural Vulnerabilities

### 4.1 Unauthenticated WebSocket Relay
- **Vulnerability**: `syncboard/server/index.js` instantiates `y-websocket`'s `setupWSConnection` directly without authenticating incoming WebSocket requests.
- **Risk**: Any client can connect to any room ID on `ws://localhost:1234` and read, modify, or clear board contents without credentials.

### 4.2 Lack of Rate Limiting & Message Throttling
- **Vulnerability**: The server does not enforce rate limits on incoming WebSocket connections or message frames.
- **Risk**: A malicious or faulty client could flood the server with rapid sync updates, causing high CPU usage, network saturation, or Denial of Service (DoS).

### 4.3 Unvalidated CRDT Payload Ingestion
- **Vulnerability**: Yjs sync updates are relayed as binary byte streams (`Uint8Array`) without server-side inspection or validation.
- **Risk**: Rogue clients could push oversized or deeply nested state updates to exhaust memory on peer clients.

---

## 5. Threat Matrix & Impact Analysis

| Threat / Vulnerability | Likelihood | Impact | Current Mitigation Status |
| :--- | :--- | :--- | :--- |
| **Oversized Image Upload (Client Memory DoS)** | Medium | High | **Mitigated**: 3MB size limit & image MIME check in `Toolbar.tsx`. |
| **Corrupted Base64 Image Crash** | Low | Medium | **Mitigated**: Null safety check inside `fabric.Image.fromURL` callback. |
| **Room Name UI Overflow** | Medium | Low | **Mitigated**: Enforced 50-character limit in `TopBar.tsx`. |
| **Memory Leak / Canvas Context Crash** | High | Medium | **Mitigated**: Explicit listener cleanup & canvas disposal in `CanvasApp.tsx`. |
| **Unauthorized Room Access** | High | High | **Unmitigated**: Open WebSocket relay; requires token/auth header verification. |
| **WebSocket Message Flooding (DoS)** | Medium | High | **Unmitigated**: No connection/message rate limiting on server. |

---

## 6. Recommended Remediation Roadmap

1. **Implement WebSocket Authentication**:
   - Introduce JWT or session token verification during the WebSocket handshake (`wss.on('connection')`).
2. **Add Server-Side Rate Limiting & Frame Size Rules**:
   - Configure `maxPayload` on `WebSocket.Server` (e.g., 5MB).
   - Implement message frequency limits per client connection using `express-rate-limit` or custom token buckets.
3. **Room Passwords & Access Control**:
   - Option to protect room documents with encrypted keys or room-level passcodes prior to state sync.

---

*Audit completed: 2026-09-27*
