# SyncBoard Protection & Security Review

This document presents a comprehensive security, architecture, and protection analysis of the **SyncBoard** collaborative digital whiteboard platform.

---

## 1. Executive Summary & Architecture Overview

SyncBoard is a real-time, multi-user collaborative whiteboard built using a modern decoupled client-server architecture:

- **Frontend Client (`syncboard/client`)**: React 19, TypeScript, Vite, Fabric.js for interactive HTML5 canvas graphics, Yjs for Conflict-free Replicated Data Types (CRDT), `y-websocket` for state synchronization, and `y-indexeddb` for client-side persistent storage.
- **Backend Relay Server (`syncboard/server`)**: Node.js HTTP server utilizing the `ws` library and `y-websocket/bin/utils` to maintain WebSocket rooms and broadcast CRDT updates across connected clients.

### Data Flow
1. **User Interaction**: Actions on the Fabric.js canvas (creating shapes, drawing, moving sticky notes, uploading images) generate canvas events.
2. **Yjs State Mutations**: Local event listeners modify shared Yjs data structures (`Y.Map` for elements, `Y.Text` for room titles, and Yjs Awareness for live user cursors and selections).
3. **WebSocket Relay**: Binary CRDT updates are sent over WebSockets (`ws://localhost:1234`) to the backend server.
4. **Peer Broadcast**: The relay server forwards these updates to all other clients connected to the same workspace room.

---

## 2. Implemented Protection Mechanisms & Defenses

SyncBoard incorporates several client-side safeguards, resource limits, and defensive programming patterns to ensure UI stability, data integrity, and resilience:

### 2.1 Payload & File Upload Controls
- **Image Size Limits**: In `Toolbar.tsx`, file uploads are restricted to `image/*` MIME types and capped at a maximum of **3MB** (`MAX_FILE_SIZE = 3 * 1024 * 1024` bytes) before conversion to base64 data URLs. This prevents excessive memory allocation and WebSocket bandwidth saturation.
- **Input Clamping**: `TopBar.tsx` clamps room names to a maximum length of **50 characters** (`ROOM_NAME_MAX_LENGTH = 50`) and user display names to **24 characters**, preventing layout overflow or database payload corruption.

### 2.2 Defensive Rendering & Memory Safety
- **Image Null-Safety Checks**: Inside `CanvasApp.tsx`, image rendering callbacks (`fabric.Image.fromURL`) validate `if (!img) return;` and specify `crossOrigin: 'anonymous'` to prevent browser crashes when parsing corrupt, truncated, or cross-origin base64 assets.
- **React 19 Container Isolation**: `<canvas ref={canvasRef} />` is wrapped inside a dedicated wrapper `div`. This prevents React 19 DOM reconciliation errors (`Failed to execute 'insertBefore' on 'Node'`) triggered when Fabric.js manipulates DOM structures.
- **Unmount Resource Cleanup**: `CanvasApp.tsx` cleanly disposes Yjs observers (`yElements.unobserve`, `yRoomName.unobserve`), awareness listeners (`awareness.off`), WebSocket connections (`wsProvider.destroy()`), IndexedDB connections (`dbProvider.destroy()`), and Fabric canvas instances (`fabricCanvas.dispose()`, `fabricRef.current = null`). This prevents memory leaks and null-context canvas runtime errors under React StrictMode or HMR.

### 2.3 UI & Viewport Protections
- **Overlay Boundary Clamping**: Floating UI overlays (such as `PropertyMenu.tsx`) calculate canvas-to-viewport coordinates and clamp positions within screen boundaries (e.g., minimum 180px horizontally and 80px vertically), preventing menus from disappearing outside window bounds.
- **Coordinate Transformation Guards**: Screen space coordinate calculations utilize explicit `fabric.Point` instances with `fabric.util.transformPoint` to ensure strict type compliance and accurate tracking during canvas pan and zoom.

---

## 3. Structural Security Limitations & Vulnerabilities

While the client enforces UI-level restrictions, several architectural limitations exist at the protocol and server levels:

### 3.1 Unauthenticated WebSocket Relay
- **Vulnerability**: The Node.js WebSocket relay server (`syncboard/server/index.js`) accepts connections indiscriminately (`wss.on('connection')`) without validating authentication tokens, session cookies, or authorization headers.
- **Risk**: Any client capable of reaching port `1234` can connect to any room (`syncboard-main`), inspect room contents, inject arbitrary Yjs updates, or erase all elements on the canvas.

### 3.2 Lack of Server-Side Message & Payload Validation
- **Vulnerability**: The backend uses standard `y-websocket` utility functions acting as a pass-through pub/sub relay. It does not parse, inspect, or validate binary CRDT updates, message lengths, or update frequency.
- **Risk**: A malicious or modified client can bypass client UI restrictions (such as the 3MB upload limit) and send multi-megabyte payloads or millions of CRDT updates directly over WebSocket, resulting in Denial of Service (DoS) for all connected peers.

### 3.3 Cross-Site Scripting (XSS) & Content Injection Exposure
- **Vulnerability**: User-controlled string fields (room names, sticky note texts, badge titles, custom profile display names) are transmitted as plain text or JSON backups without server-side sanitization.
- **Risk**: While Fabric.js renders text onto canvas via HTML5 2D Context (which does not evaluate HTML/JS tags), exporting data to external formats (e.g. SVG or HTML exports) or importing untrusted JSON backups could present XSS vulnerabilities if rendered in an unescaped DOM context.

### 3.4 Unencrypted Local Transport
- **Vulnerability**: Default configurations use unencrypted WebSocket URIs (`ws://`).
- **Risk**: Data transmitted over unencrypted WebSockets is vulnerable to passive eavesdropping and Man-in-the-Middle (MitM) tampering on untrusted local networks.

---

## 4. Risk Assessment Matrix

| Threat / Vulnerability | Likelihood | Impact | Severity | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Unauthenticated WebSocket Access** | High | High | **CRITICAL** | Unauthorized users can join any room, read contents, or wipe boards. |
| **Server Payload & Rate Limit Bypass** | Medium | High | **HIGH** | Malicious clients bypass client-side limits to send huge payloads (DoS). |
| **Untrusted JSON Import / Injection** | Low | Medium | **MEDIUM** | Malicious JSON backup files could crash client state or inject invalid data. |
| **Unencrypted WebSocket Transport (`ws://`)** | Medium | Medium | **MEDIUM** | Eavesdropping on unencrypted local network traffic. |
| **Memory / Browser Exhaustion via Object Flooding** | Low | Medium | **LOW** | Generating thousands of canvas objects locally leads to browser slowdown. |

---

## 5. Actionable Recommendations & Hardening Strategies

To elevate SyncBoard to production-grade security, the following hardening steps are recommended:

### 5.1 Authentication & Authorization
- **Handshake Validation**: Add JWT or session token verification during the WebSocket HTTP upgrade handshake (`server.on('upgrade')`).
- **Room Access Control**: Implement room-level ACLs (e.g., Read-Only vs. Read-Write permissions) verified before establishing the `y-websocket` connection.

### 5.2 Server-Side Middleware & Rate Limiting
- **Enforce Payload Limits**: Set maximum message size limits on the WebSocket server (e.g. `maxPayload: 5 * 1024 * 1024` bytes on `ws.Server`).
- **Rate-Limiting & IP Throttling**: Throttle WebSocket connection attempts and message delivery rates per client/IP to mitigate DoS and spam attacks.

### 5.3 Input Sanitization & JSON Validation
- **Schema Validation for Imports**: Use JSON schema validators (e.g. `ajv` or `zod`) when processing JSON board backup imports (`handleImportJSON`).
- **Sanitize String Inputs**: Apply sanitization (e.g. `DOMPurify`) before rendering text in non-canvas DOM contexts or exporting SVG/HTML documents.

### 5.4 Transport Security & CORS
- **Enforce WSS (TLS/SSL)**: Use `wss://` in production environments behind a secure reverse proxy (Nginx, Caddy, or Cloudflare).
- **Origin Verification**: Validate the `Origin` header during WebSocket connection establishing to prevent unauthorized Cross-Origin WebSocket hijacking.
