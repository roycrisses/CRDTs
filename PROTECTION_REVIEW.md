# SyncBoard Security & Protection Review

## Executive Summary

SyncBoard is a real-time collaborative whiteboard application built with React, Vite, Fabric.js, Yjs (CRDTs), and WebSocket synchronization (`y-websocket`). This document presents a comprehensive security and protection review of the SyncBoard application architecture, server configuration, client-side data handling, and network communication protocols.

The review identifies current security safeguards, exposes structural vulnerabilities, evaluates potential threat vectors, and outlines concrete mitigation strategies to harden the system against malicious exploitation, data corruption, and Denial-of-Service (DoS) attacks.

---

## Architecture & System Overview

```
[ Web Browser Client ] <---> ( WebSocket / ws://1234 ) <---> [ SyncBoard Server ]
  • Fabric.js Canvas                                            • Node.js + Http
  • Yjs Doc & Awareness                                         • y-websocket Relay
  • IndexedDB Persistence                                       • Room Management
```

- **Client Tier:** React 19 + TypeScript SPA running Fabric.js for vector canvas manipulation and Yjs for CRDT-based state consensus.
- **Server Tier:** Node.js WebSocket relay server utilizing `y-websocket/bin/utils` (`setupWSConnection`) to broadcast binary update vectors between connected clients.
- **Persistence Tier:** Client-side local storage via `y-indexeddb` (`IndexeddbPersistence`), with no server-side database persistence currently implemented.

---

## Current Security Controls & Safeguards

SyncBoard incorporates several client-side safeguards designed to preserve UI stability and maintain client memory integrity:

1. **Client-Side File Upload Size Constraint:**
   - Image uploads via `Toolbar.tsx` enforce a `MAX_FILE_SIZE` limit of 3MB (`3 * 1024 * 1024` bytes) and validate image MIME type (`file.type.startsWith('image/')`) before encoding to Base64 data URLs.
2. **Room Name & Profile Display Constraints:**
   - Room name modifications in `TopBar.tsx` and `constants.ts` enforce `ROOM_NAME_MAX_LENGTH = 50` characters.
   - User display names in `TopBar.tsx` are limited to 24 characters (`maxLength={24}`).
3. **Robust Rendering & Null-Safety Wrappers:**
   - Fabric image loading via `fabric.Image.fromURL` in `CanvasApp.tsx` includes explicit `null` callback checks to prevent canvas corruption from malformed or failed image loads.
   - StrictMode / React DOM cleanup routines explicitly dispose of Fabric canvas instances (`fabricCanvas.dispose()`) and unhook Yjs observers (`yElements.unobserve`, `awareness.off`) upon unmounting to eliminate context leaks.
4. **Isolated DOM Container Structure:**
   - Canvas mount points are encapsulated in dedicated wrapper `div` elements to prevent React 19 DOM reconciliation errors caused by Fabric inserting `.canvas-container` wrapper elements into the DOM tree.

---

## Detailed Threat Model & Vulnerability Analysis

### 1. Unauthenticated WebSocket Relay Server (High Severity)
- **Vulnerability:** `syncboard/server/index.js` accepts all incoming WebSocket connection requests on `ws://localhost:1234` without authentication tokens (e.g., JWT, session cookies), authorization checks, or CORS origin validation.
- **Impact:** Any malicious actor or rogue script can establish a WebSocket connection to `syncboard-main` or arbitrary room namespaces, inspect broadcasted binary CRDT updates, and corrupt canvas documents across active sessions.

### 2. Unvalidated CRDT State & Structural Injection (High Severity)
- **Vulnerability:** The server blindly relays all Yjs binary update vectors across connected clients without schema or payload validation.
- **Impact:** A compromised or malicious client can emit custom Yjs updates containing arbitrary payload types, giant arrays, or unhandled field types, causing client browsers to freeze or crash during Fabric.js object instantiation in `upsertFabricObject`.

### 3. Missing WebSocket Rate Limiting & DoS Vulnerability (High Severity)
- **Vulnerability:** Neither the HTTP server nor the WebSocket server enforces request rate limits or message size boundaries.
- **Impact:** An attacker can flood the WebSocket server with high-frequency awareness signals or rapid element mutations, exhausting server CPU/network bandwidth and causing browser tab crashes across all connected participants.

### 4. Awareness State & Identity Spoofing (Medium Severity)
- **Vulnerability:** User identity (`localUser`: `{ name, color }`) is managed client-side and synced via Yjs Awareness without cryptographic verification.
- **Impact:** Clients can impersonate other users, change display names to match session moderators, or broadcast spoofed cursor coordinates (`remoteSelections` / `laserPoints`) to confuse or disrupt participants.

### 5. Client-Side Backup File Validation (Medium Severity)
- **Vulnerability:** The JSON import feature (`handleImportJSON` in `CanvasApp.tsx`) uses `JSON.parse` and checks basic array/id properties, but does not strictly validate element styles, nested properties, or SVG path string bounds.
- **Impact:** Importing a malformed or malicious JSON backup file could cause runtime exceptions or crash the canvas rendering loop.

---

## Security Risk Matrix

| Threat Vector | Risk Level | Likelihood | Impact | Current Mitigation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Unauthenticated WS Access | **High** | High | High | None | **Remediation Required** |
| Unvalidated CRDT Injection | **High** | Medium | High | Partial (Client null-checks) | **Remediation Required** |
| WebSocket DoS / Flooding | **High** | High | High | None | **Remediation Required** |
| User Profile Spoofing | **Medium** | Medium | Medium | Client Name/Color selection | **Planned Feature** |
| Malicious JSON Backup Import | **Medium** | Low | Medium | Type & structure check | **Mitigated / Monitored** |
| Base64 Image Payload Bloat | **Low** | Low | Low | 3MB Client-side limit | **Mitigated** |

---

## Recommended Hardening Roadmap & Implementation Guidance

### Phase 1: Server Authentication & CORS Control
Implement token-based authentication on the WebSocket server connection handshake and validate request origin headers:

```javascript
// Example Server Enhancement for syncboard/server/index.js
const url = require('url');

wss.on('connection', (conn, req) => {
  const parsedUrl = url.parse(req.url, true);
  const token = parsedUrl.query.token;

  // Validate token (e.g., JWT verification)
  if (!isValidToken(token)) {
    conn.close(1008, 'Unauthorized access token');
    return;
  }

  setupWSConnection(conn, req);
});
```

### Phase 2: Rate Limiting & Message Size Boundaries
Incorporate `ws` client message limits and rate limiting wrappers (e.g., `ws-rate-limit` or custom token-bucket counters) to drop connections exceeding threshold frequencies.

### Phase 3: Schema Validation for Import/Export
Enhance JSON import parser with Zod or TypeScript schema validators before pushing imported elements into the Yjs `yElements` map.

---

## Conclusion

SyncBoard's frontend architecture provides good user input constraints and DOM isolation. However, hardening the server tier with WebSocket authentication, CORS restriction, and rate limiting is essential before exposing the application to public production environments.
