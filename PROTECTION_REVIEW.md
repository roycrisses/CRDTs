# SyncBoard Security & Protection Review

## Executive Summary
This document presents a security and protection review of **SyncBoard**, a real-time collaborative whiteboard application built with React, Fabric.js, Yjs (CRDT), and Node.js (`y-websocket`).

---

## 1. Architecture Overview
SyncBoard uses a client-server hybrid architecture for real-time collaboration:
* **Server**: A lightweight Node.js server (`syncboard/server/index.js`) utilizing `ws` and `y-websocket` utilities to relay binary Yjs CRDT updates between clients connected to workspace rooms.
* **Client**: A React application (`syncboard/client/src/CanvasApp.tsx`) backed by Fabric.js for 2D visual rendering and Yjs for distributed CRDT state synchronization. Persistence is handled locally via IndexedDB (`y-indexeddb`).

---

## 2. Existing Protections

### 2.1 Client-Side Payload & Input Constraints
* **Room & User Profile Truncation**: Room name inputs enforce a 50-character limit (`ROOM_NAME_MAX_LENGTH = 50`) both in HTML input attributes (`maxLength={50}`) and string sanitization handlers (`.slice(0, 50)`). User display names are capped at 24 characters.
* **Image Upload Guardrails**: File uploads via the `Toolbar` component validate image MIME types and restrict maximum file sizes to **3MB**, preventing client memory exhaustion and WebSocket bandwidth spikes.
* **Null-Safety Error Handling**: Handlers such as `fabric.Image.fromURL` check for null image references before canvas object creation to prevent client crashes caused by malformed image payloads.

### 2.2 XSS & Content Security
* **Canvas-Based Rendering**: Canvas objects (text notes, shapes, sticky notes) render content using Fabric.js 2D Canvas context methods rather than HTML DOM injection (`dangerouslySetInnerHTML`), mitigating standard DOM-based Cross-Site Scripting (XSS).
* **React DOM Escaping**: All React DOM overlays (e.g., cursor tags, user profile badges, status indicators) rely on standard JSX string escaping.

### 2.3 Resource Cleanup & Lifecycle Safety
* **Event Listener & Memory Cleanup**: `CanvasApp.tsx` systematically unbinds Yjs observers (`yElements.unobserve`, `yRoomName.unobserve`), awareness listeners (`awareness.off`), WebSocket/IndexedDB providers (`wsProvider.destroy()`, `dbProvider.destroy()`), and disposes the Fabric.js canvas (`fabricCanvas.dispose()`).
* **Ref Nullification**: `fabricRef.current = null` is set explicitly on unmount to prevent stale re-renders or runtime `clearRect` errors during hot module replacement (HMR) or React StrictMode cycles.

---

## 3. Security Vulnerabilities & Limitations

### 3.1 Server-Side Authentication & Authorization
* **Unauthenticated Relay**: The WebSocket relay server on port `1234` accepts connections from any client without authentication, tokens, or session validation.
* **Room Access Control**: Room names are unauthenticated namespace strings. Any client that connects with a room name can view, mutate, or clear all collaborative elements in that room.

### 3.2 Unvalidated Server-Side CRDT Payload Relay
* **Blind Relay**: The server acts as a pass-through relay using `setupWSConnection`. It does not parse, inspect, or validate Yjs updates on the server.
* **Malicious Payload Amplification**: A modified or malicious client could bypass front-end input limits (e.g., sending massive text strings or millions of synthetic elements) and broadcast them to all room participants.

### 3.3 Connection Rate Limiting & Denial of Service (DoS)
* **WebSocket Flooding**: The server lacks rate limiting on WebSocket connections and incoming messages per second.
* **Origin Checking**: The server does not check `Origin` HTTP headers during the WebSocket handshake, leaving it vulnerable to unauthorized cross-origin connections if deployed publicly.

---

## 4. Actionable Recommendations

1. **Implement WebSocket Authentication & Room Authorization**:
   - Integrate JWT or session token verification into the WebSocket handshake (`wss.on('connection')`).
   - Restrict room access to authorized users based on database access control lists (ACLs).

2. **Server-Side Validation & Payload Caps**:
   - Implement message size thresholds at the WebSocket server layer (e.g., enforcing `maxPayload` option in `ws` server configuration).
   - Periodically inspect Yjs state size on the server or enforce per-room memory caps.

3. **Origin Restriction & Rate Limiting**:
   - Verify `req.headers.origin` against an allowed domain whitelist during WebSocket upgrades.
   - Apply rate-limiting middleware (e.g., limiting new WebSocket connections and message throughput per IP).

4. **HTTPS / WSS Transport Security**:
   - Secure WebSocket traffic in production using TLS (`wss://`) to prevent man-in-the-middle (MitM) eavesdropping and tampering.
