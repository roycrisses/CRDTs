# SyncBoard - Security and Protection Review

## Executive Summary

SyncBoard is a real-time collaborative whiteboard application built with React, Fabric.js, Yjs (CRDTs), and `y-websocket`. This document presents a security, protection, and architectural review of the SyncBoard application. It analyzes the security posture of both the client application (`syncboard/client`) and the WebSocket relay server (`syncboard/server`), highlights existing safeguards, identifies structural limitations, and outlines actionable hardening recommendations.

---

## System Architecture Overview

SyncBoard consists of two main components:

1. **Client Application (`syncboard/client`)**:
   - **Frameworks**: React 19, Fabric.js 5.x, Yjs, `y-websocket`, `y-indexeddb`, TailwindCSS, Lucide icons.
   - **Data Synchronization**: Uses Yjs Conflict-Free Replicated Data Types (`Y.Doc`, `Y.Map`, `Y.Text`) bound to Fabric.js canvas objects and UI components.
   - **Persistence**: Hybrid offline-first architecture leveraging `IndexeddbPersistence` (`syncboard-v3`) for client-side local caching and `WebsocketProvider` for peer-to-peer real-time updates.

2. **Relay Server (`syncboard/server`)**:
   - **Runtime**: Node.js HTTP & `ws` server using `y-websocket/bin/utils`.
   - **Functionality**: Minimalistic, stateless WebSocket relay server broadcasting Yjs sync protocol updates and awareness states across connected clients in room namespaces (`syncboard-main`).

---

## Detailed Security Assessment

### 1. Server-Side & WebSocket Relay Security

#### A. Authentication & Authorization
- **Current Posture**: The server (`syncboard/server/index.js`) accepts any incoming WebSocket connection on `ws://localhost:1234` without authentication tokens (e.g., JWT, OAuth) or room-level access keys.
- **Risk**: Any user capable of reaching port 1234 can join any active room namespace, read whiteboard state, publish changes, or wipe room elements.
- **Impact**: High (Unauthorized Access / Data Leakage / Malicious Overwrite).

#### B. Origin & Cross-Site WebSocket Hijacking (CSWSH)
- **Current Posture**: The `wss.on('connection')` listener does not validate the `Origin` request header.
- **Risk**: A malicious website visited by a SyncBoard user could initiate cross-origin WebSocket connections to `ws://localhost:1234` and perform unauthorized reads/writes.
- **Impact**: Medium-High (Cross-Site Manipulation).

#### C. Transport Security
- **Current Posture**: Default transport uses unencrypted `ws://` connections.
- **Risk**: Traffic (including canvas content and text notes) sent over unencrypted WebSockets is vulnerable to eavesdropping and Man-in-the-Middle (MitM) inspection on untrusted networks.
- **Impact**: Medium (Eavesdropping on plain HTTP networks).

#### D. Denial of Service (DoS) & Payload Size Limits
- **Current Posture**: The WebSocket server passes Yjs messages without server-enforced rate limits or payload size caps.
- **Risk**: A malicious or faulty client could flood the relay server with high-frequency awareness updates or large CRDT binary blobs, causing server memory exhaustion or client canvas slowdowns.
- **Impact**: Medium (Service Availability).

---

### 2. Client-Side Protection & Safeguards

SyncBoard incorporates multiple client-side protection controls designed to prevent UI crashes, memory leaks, and oversized storage payloads:

#### A. File Upload Validation & Size Caps
- **Implementation**: In `syncboard/client/src/components/Toolbar.tsx`, uploaded image files are validated prior to reading:
  ```ts
  if (!file.type.startsWith('image/')) {
    alert('Please select a valid image file.');
    return;
  }
  if (file.size > MAX_FILE_SIZE) { // 3MB limit
    alert('Image size exceeds 3MB limit.');
    return;
  }
  ```
- **Benefit**: Prevents non-image binary uploads and protects WebSocket bandwidth and client memory from excessively large image base64 strings.

#### B. Base64 Image Safe Rendering
- **Implementation**: In `syncboard/client/src/CanvasApp.tsx`, image rendering via `fabric.Image.fromURL` includes null-safety checks inside the callback:
  ```ts
  fabric.Image.fromURL(data.imageUrl, (img) => {
    if (!img) return; // Null-safety check prevents canvas crashes
    ...
  });
  ```
- **Benefit**: Guards against browser crashes or unhandled exceptions when processing corrupted or malformed base64 image strings received over Yjs CRDT state.

#### C. Room Name Input Capping
- **Implementation**: Enforced via `ROOM_NAME_MAX_LENGTH = 50` in `syncboard/client/src/constants.ts` and validated in `TopBar.tsx`:
  ```ts
  const handleSaveRoomName = () => {
    const trimmed = tempRoomName.trim().slice(0, ROOM_NAME_MAX_LENGTH);
    ...
  };
  ```
- **Benefit**: Protects UI layout integrity and prevents database/CRDT payload corruption from arbitrarily long string inputs.

#### D. Content & Script Injection Protection
- **Implementation**: Canvas elements (IText, Sticky Notes, Badges, Frames) rely on Fabric.js text rendering primitives, which write to an HTML5 `<canvas>` context using standard canvas drawing APIs (`fillText`).
- **Benefit**: Standard HTML XSS vector tags (e.g., `<script>`, `<img src=x onerror=...>`) are rendered purely as plain text strings on canvas, preventing script execution in user browsers.

---

### 3. Local Storage & Persistence Safeguards

- **IndexedDB Isolation**: SyncBoard uses `y-indexeddb` to persist whiteboard state locally (`syncboard-v3`).
- **Considerations**: Data stored in browser IndexedDB is scoped to the origin. Storing sensitive whiteboard contents locally is secure against cross-origin scripts under standard Browser Same-Origin Policy (SOP), though physical access to the browser profile permits data inspection.

---

## Protection & Security Hardening Roadmap

To elevate SyncBoard to enterprise-grade security standards, the following improvements are recommended:

| Area | Current State | Target Recommendation |
| :--- | :--- | :--- |
| **Transport Protocol** | Unencrypted `ws://` | Upgrade to TLS-encrypted `wss://` with SSL certificates. |
| **WebSocket Auth** | Unauthenticated | Implement token authentication (JWT/Session) passed during WebSocket connection handshake (`ws://server?token=...`). |
| **Origin Checking** | Unchecked | Enforce strict Origin header checking in `syncboard/server/index.js` against allowed domain whitelists. |
| **Rate Limiting** | None | Introduce server-side connection and message rate limiting (e.g., using `ws` rate-limiter middleware). |
| **Document Authorization** | Public access | Implement room-level permissions (Read / Write / Admin roles). |
| **Content Security Policy** | Default Vite dev setup | Configure CSP headers (`connect-src`, `img-src`, `script-src`) in production HTTP headers. |

---

## Conclusion

SyncBoard's current implementation demonstrates robust client-side payload constraints, memory protection, and input handling. Adopting the recommendations outlined in the hardening roadmap—specifically WebSocket token authentication, origin validation, and TLS transport—will complete its defense-in-depth architecture.
