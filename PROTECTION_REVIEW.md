# SyncBoard Protection & Security Review

**Date:** September 15, 2026
**Target System:** SyncBoard Collaborative Whiteboard Application
**Components Assessed:** Server Relay (`syncboard/server/index.js`), Client Application (`syncboard/client/src/*`), Yjs CRDT Synchronization, WebSocket Communication Protocol.

---

## Executive Summary

SyncBoard is a real-time collaborative whiteboard built on React, Fabric.js, and Yjs CRDTs with a Node.js WebSocket relay server. This protection review evaluates the security posture, threat vectors, structural protections, and systemic limitations of the application.

Overall, SyncBoard has implemented client-side controls (e.g., input string length limits, base64 image file size caps, error boundaries) to prevent accidental application crashes and excessive memory consumption. However, the backend server operates as an unauthenticated, unvalidated broadcast relay (`y-websocket`), introducing critical security vulnerabilities under untrusted multi-tenant or production environments.

---

## System Architecture & Security Boundary Overview

```
 [ Client Browser A ] <---- WebSocket (ws://localhost:1234) ----> [ Node.js Relay Server ]
 [ Client Browser B ] <-----------------------------------------> (y-websocket / ws)
```

1. **Client Tier (`syncboard/client`)**:
   - Fabric.js canvas renderer for interactive drawing, shapes, and media.
   - Yjs CRDT engine managing `yElements` (Map) and `yRoomName` (Text).
   - Local IndexedDB persistence (`y-indexeddb`) for offline offline capability.
2. **Server Tier (`syncboard/server`)**:
   - Minimalist Node.js HTTP + WebSocket server (`index.js`).
   - Delegates room state synchronization and awareness management directly to `y-websocket/bin/utils`.

---

## Vulnerability & Protection Analysis

### 1. Authentication & Access Control (Severity: HIGH)
- **Current Finding**: The WebSocket server accepts connections on port `1234` without authentication or room-level token verification. Anyone with network access can connect to any room ID (`ws://<host>:1234/<room-id>`).
- **Impact**: Unauthorized access to real-time whiteboard canvas data, unauthenticated user spoofing, and data exfiltration.
- **Risk Assessment**: **High** in exposed or public networks.

### 2. Payload & Input Validation (Severity: MEDIUM)
- **Current Protection**:
  - `TopBar.tsx` enforces `ROOM_NAME_MAX_LENGTH` (50 characters) and trims whitespace on room name edits.
  - `Toolbar.tsx` restricts file uploads to `image/*` MIME types and enforces a maximum file size limit of 3MB (`MAX_FILE_SIZE`).
  - `CanvasApp.tsx` wraps `fabric.Image.fromURL` in null checks to prevent rendering corrupt image data.
- **Limitation**: Client-side validation can be bypassed by a malicious actor sending raw Yjs updates over the WebSocket connection.
- **Impact**: Malicious payloads could theoretically inject oversized string payloads into `ElementData` directly via Yjs binary protocols.

### 3. Denial of Service (DoS) & Resource Exhaustion (Severity: HIGH)
- **Current Finding**:
  - Lack of rate-limiting on WebSocket message frames in `syncboard/server/index.js`.
  - Lack of server-side state maximum size constraints or CRDT document element counts.
- **Impact**: A single malicious client can flood the server with high-frequency element creations/updates, degrading performance for all connected peers or crashing server process memory.
- **Risk Assessment**: **High** under malicious multi-tenant conditions.

### 4. Cross-Site Scripting (XSS) & Content Injection (Severity: LOW - MEDIUM)
- **Current Protection**:
  - Fabric.js renders text strings onto HTML5 canvas surfaces using native 2D canvas drawing APIs (`fillText`/`strokeText`), which inherently prevents DOM-based XSS execution from element content or stamps.
  - React JSX escaping is automatically applied to UI components.
- **Residual Risk**: Base64 data URLs for user images (`data:image/...`) are rendered via Fabric image objects. Malicious SVG inputs or invalid image formats are safely caught by standard browser image decoding error handlers.

### 5. Transport & Data Encryption (Severity: MEDIUM)
- **Current Finding**: WebSocket server runs over unencrypted `ws://` protocol on port 1234.
- **Impact**: Communication between clients and the relay server is susceptible to eavesdropping and Man-In-The-Middle (MITM) attacks if deployed across untrusted networks.
- **Risk Assessment**: **Medium** (Required upgrade to `wss://` TLS protocol in production).

---

## Vulnerability Risk Matrix

| Risk ID | Threat Vector / Issue | Severity | Likelihood | Current Mitigation | Recommended Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Unauthenticated WebSocket connection | **High** | High | None | Implement JWT / Token auth on WS handshake |
| **SEC-02** | Unencrypted WS Transport (`ws://`) | **Medium** | High | None (Local dev default) | Deploy behind HTTPS/WSS proxy or TLS |
| **SEC-03** | Lack of Server-Side CRDT Rate Limiting | **High** | Medium | None | Implement frame rate limiting on server |
| **SEC-04** | Client File Upload Payload Overload | **Low** | Low | Client-side 3MB & image type check | Enforce server-side binary payload limits |
| **SEC-05** | UI Overflow / Text Bombing | **Low** | Low | String length caps in `TopBar.tsx` | Retain client caps; sanitize CRDT strings |

---

## Actionable Security Hardening Recommendations

1. **Implement Server Authentication Handshake**:
   Update `syncboard/server/index.js` to validate an auth token (e.g., JWT in query parameters or headers) during the WebSocket connection upgrade step (`wss.on('connection')`).

2. **Add Server-Level Message Rate Limiting**:
   Wrap WebSocket connections with a sliding window token bucket or frame limiter to drop connection spamming beyond reasonable update thresholds (e.g., max 100 messages/sec per client).

3. **Deploy TLS/SSL (`wss://`) for Production**:
   Enforce Secure WebSockets (`wss://`) in production environments via reverse proxies (e.g., NGINX, Caddy, or Cloudflare).

4. **Sanitize & Validate CRDT Updates Server-Side**:
   If multi-tenant isolation is required, validate Yjs document updates server-side before broadcasting to other connected peers.

---

## Conclusion

SyncBoard exhibits clean, resilient client-side architecture with proactive UX validation and crash-prevention safeguards. By addressing the server-side authentication, rate limiting, and transport security gaps detailed above, SyncBoard will achieve enterprise-grade protection for real-time collaborative whiteboarding.
