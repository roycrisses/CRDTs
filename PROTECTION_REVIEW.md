# SyncBoard Security & Protection Review

## Overview
SyncBoard is a real-time collaborative whiteboard application built with React, Fabric.js, Yjs (CRDT), and a Node.js WebSocket relay server. This document details the security posture, structural safeguards, risk assessments, and recommendations for protecting the SyncBoard application.

---

## 1. Network & Architecture Security

### WebSocket Communication & Relay Server
- **Current State:** The Yjs WebSocket server (`syncboard/server/index.js`) uses `y-websocket/bin/utils` to sync CRDT updates across connected clients over port `1234`.
- **Observations & Vulnerabilities:**
  - **Authentication / Authorization:** The WebSocket endpoint is currently unauthenticated. Any client connecting to `ws://localhost:1234` can read and write to the shared Yjs document room (`syncboard-main`).
  - **Transport Security:** Default connections use unencrypted WS (`ws://`). Production deployment requires TLS encryption (`wss://`) to prevent eavesdropping and MITM attacks.
  - **Rate Limiting & Connection Throttling:** The server lacks connection rate-limiting, IP throttling, and message size limits, rendering it susceptible to Denial of Service (DoS) attacks via rapid socket creation or oversized Yjs binary messages.

### Local Persistence (IndexedDB)
- **Current State:** Client-side offline persistence uses `y-indexeddb` (`syncboard-v3`).
- **Observations:**
  - Board data stored locally in browser IndexedDB is unencrypted. Local physical or XSS access to the browser origin grants access to stored board states.

---

## 2. Input Validation & Data Handling

### File Uploads (Image Upload Tool)
- **Safeguards Implemented:**
  - **File Type Validation:** Checked in `Toolbar.tsx` using `file.type.startsWith('image/')`.
  - **Payload Size Limits:** `MAX_FILE_SIZE` enforced at 3MB to prevent memory exhaustion and excessive WebSocket payload sizes.
  - **Rendering Protection:** Base64 image strings rendered via Fabric.js (`fabric.Image.fromURL`) include null-checks and `crossOrigin: 'anonymous'` attributes to mitigate tainted canvas contexts and render crashes from malformed data strings.

### Room Name & Text Input Sanitization
- **Safeguards Implemented:**
  - **Length Limits:** Room name editing (`TopBar.tsx`) enforces a 50-character limit (`maxLength={50}`).
  - **DOM Injection:** React handles string rendering for canvas text and UI overlays natively, protecting against XSS via standard HTML injection.
  - **Import JSON Validation:** The board import handler (`handleImportJSON` in `CanvasApp.tsx`) validates JSON format and verifies object structure before applying updates to the Yjs map.

---

## 3. Client Protection & Error Recovery

### React 19 & Fabric.js Integration
- **Safeguards Implemented:**
  - **DOM Container Isolation:** `<canvas ref={canvasRef} />` is wrapped in a dedicated `div` container to prevent DOM node mismatch errors (`insertBefore`) during React reconciliation when Fabric.js manipulates container elements.
  - **Ref & Lifecycle Safety:** Cleanup routines in `CanvasApp.tsx` explicitly set `fabricRef.current = null`, unobserve Yjs maps/texts, and unbind awareness listeners to prevent memory leaks and `clearRect` null errors during StrictMode remounts or hot-reloading.
  - **Render Decoupling:** Overlay positioning (`PropertyMenu`, remote cursor selections) is decoupled from direct ref access during render cycles, adhering to React concurrency rules.

---

## 4. Protection & Security Recommendations

1. **Implement WebSocket Authentication:**
   - Integrate token-based authentication (e.g., JWT) in the WebSocket upgrade handshake.
2. **Add Server-Side Payload & Connection Rate Limiting:**
   - Enforce maximum message payload sizes on `ws` connection handlers and restrict client connections per IP.
3. **CRDT Schema Validation:**
   - Implement server-side or provider-level CRDT update validation to prevent malicious clients from inserting invalid or oversized Yjs map keys.
4. **Content Security Policy (CSP):**
   - Apply CSP headers restricting WebSocket origins (`connect-src`) and script sources (`script-src`).
