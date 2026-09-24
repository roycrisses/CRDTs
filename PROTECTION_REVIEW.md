# SyncBoard Security & Protection Review

## Executive Summary

This document presents a comprehensive security and protection review of **SyncBoard**, a real-time collaborative whiteboard application built with React, Fabric.js, Yjs CRDT, and a Node.js WebSocket relay server.

The review evaluates the application across structural boundaries, network transport layer, client-side input sanitization, payload handling, local persistence, and real-time state synchronization.

---

## 1. System Architecture & Topology

SyncBoard utilizes a decoupled client-server architecture designed for high-concurrency, low-latency collaborative vector editing:

* **Client Layer**: React + TypeScript application with a Fabric.js object model rendered on an HTML5 `<canvas>`. Shared state is managed locally via Yjs (`Y.Doc`, `Y.Map`, `Y.Text`) and persisted locally using `IndexeddbPersistence`.
* **Network / Transport Layer**: Yjs WebSockets (`WebsocketProvider` connecting to `ws://localhost:1234`).
* **Server Layer**: Node.js HTTP/WebSocket relay server (`syncboard/server/index.js`) powered by `y-websocket/bin/utils`. The server serves as a stateless CRDT binary update distributor and awareness broadcast engine across connected clients.

---

## 2. Comprehensive Security & Protection Vector Analysis

### 2.1 WebSocket Transport & Relay Server
* **Authentication & Authorization**:
  * *Finding*: The WebSocket relay server accepts incoming WebSocket connections on port `1234` without authentication tokens, session cookies, or API keys.
  * *Impact*: Any client that can reach `ws://localhost:1234` can subscribe to any room name, read real-time CRDT updates, alter canvas objects, or broadcast arbitrary cursor awareness events.
  * *Current Status*: Unauthenticated relay (suitable for local development/private networks). Production deployments require an authentication proxy or token verification during the WebSocket HTTP upgrade handshakes.

* **Transport Encryption**:
  * *Finding*: Default transport uses unencrypted `ws://` connections.
  * *Impact*: Traffic can be intercepted or altered on public/untrusted networks.
  * *Current Status*: Recommendation is to enforce `wss://` with TLS in production configurations.

* **Rate Limiting & DoS Protection**:
  * *Finding*: The server lacks per-IP connection limits or message rate throttling.
  * *Impact*: A rogue client could spam Yjs updates or awareness changes, consuming CPU and bandwidth on all connected clients.

### 2.2 CRDT Sync & Data Validation
* **Binary Update Distribution**:
  * *Finding*: The relay server broadcasts opaque Yjs binary updates directly without inspecting or validating element attributes server-side.
  * *Impact*: Malicious clients could construct malformed CRDT objects.
  * *Mitigation*: The client application implements strict null-safety and runtime type checking during Yjs object deserialization and Fabric.js canvas updates (`upsertFabricObject`), preventing client runtime crashes.

* **Payload & File Upload Limits**:
  * *Finding*: The client supports image uploads converted to Base64 strings embedded in the Yjs map.
  * *Mitigation*: Client-side image upload validation in `Toolbar.tsx`:
    1. Enforces strict MIME type check (`file.type.startsWith('image/')`).
    2. Enforces maximum file size limit (`MAX_FILE_SIZE = 3MB`).
    3. Null-safe image creation in `CanvasApp.tsx` via `fabric.Image.fromURL` (`if (!img) return;`).

### 2.3 Client-Side Input Handling & Sanitization
* **Canvas XSS Isolation**:
  * *Finding*: Vector elements (rectangles, text, sticky notes, frames) are drawn onto HTML5 `<canvas>` via Fabric.js `IText` and geometric paths.
  * *Protection*: Fabric.js canvas rendering does not execute script tags or interpret HTML markup. Text inputs are rendered as canvas glyphs, naturally neutralizing classic DOM-based Cross-Site Scripting (XSS) vectors.

* **Room Name & Input Field Constraints**:
  * *Mitigation*: Room name input in `TopBar.tsx` enforces `maxLength={50}` and input validation on blur/submit, preventing UI overflow and excessive storage consumption in `ydoc.getText('roomName')`.

* **JSON Board Backup Import/Export**:
  * *Finding*: `handleImportJSON` reads backup files via `FileReader` and `JSON.parse`.
  * *Protection*: Validates `Array.isArray(elements)` and checks required property structures (`id`, `type`, `position`).
  * *Recommendation*: Enforce maximum file size limit (e.g., 5MB) on imported JSON files before reading into memory to prevent browser freeze on gigantic files.

### 2.4 Offline Persistence & Awareness
* **IndexedDB Isolation**:
  * *Protection*: Local persistence (`y-indexeddb`) is restricted to the client's same-origin browser context.
* **Awareness Protocol Safety**:
  * *Protection*: Remote user cursor positions and selection bounds are sanitized and mapped to local screen coordinates without accessing DOM elements or dangerous evaluation functions.

---

## 3. Risk Assessment Matrix

| Vulnerability / Risk | Severity | Attack Vector | Mitigation / Status |
| :--- | :--- | :--- | :--- |
| **Unauthenticated WebSocket Relay** | High | Room URL discovery / unauthorized connection | Unauthenticated by design for local dev; needs WSS + JWT token auth in prod. |
| **Lack of Server Payload Throttling** | Medium | Mass update spam via WebSocket | Add server-side rate-limiting middleware or maximum message size limits. |
| **Oversized Image Payloads** | Medium | Base64 allocation causing memory bloat | **Mitigated**: Client enforces 3MB max file size and image-only MIME types. |
| **Corrupted Image Crash** | Low | Invalid image Data URL | **Mitigated**: Null check added in `fabric.Image.fromURL` callback. |
| **DOM XSS Injection** | Low | Script injection in text objects | **Mitigated**: Fabric.js renders directly to canvas context as vector graphics. |
| **Room Name UI Overflow** | Low | Extremely long string payload | **Mitigated**: Client enforces `maxLength={50}` in `TopBar.tsx`. |

---

## 4. Production Hardening Roadmap & Recommendations

1. **Authentication Gateway**: Implement HTTP upgrade authentication in `syncboard/server/index.js` using JSON Web Tokens (JWT) or session cookies before calling `setupWSConnection`.
2. **TLS / WSS Protocol**: Configure reverse proxy (Nginx / Caddy) or native Node.js TLS certificates to enforce `wss://` in production.
3. **Server Message Size Limit**: Set `maxPayload` on the `ws.Server` instance (e.g., 5MB) to drop oversized WebSocket frames.
4. **JSON Import File Size Check**: Add `file.size` check in `handleImportJSON` prior to calling `FileReader.readAsText()`.
5. **CRDT Schema Validator**: Implement a server-side Yjs observer or validation step if strict access control / schema enforcement per element type is required.

---
*Protection Review Completed: September 2026*
