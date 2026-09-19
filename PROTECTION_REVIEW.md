# SyncBoard Comprehensive Protection & Security Review

## Executive Summary

SyncBoard is a real-time collaborative whiteboard application built with React, Fabric.js, Yjs (CRDTs), and `y-websocket`. This document presents a comprehensive security, privacy, and protection audit of the SyncBoard architecture, identifying structural limitations, potential attack vectors, client-side safety bounds, and recommended remediation strategies.

---

## 1. Threat Model & Architecture Overview

SyncBoard consists of two primary tiers:
1. **Frontend Client (`syncboard/client`):** A React single-page application utilizing Fabric.js for 2D canvas manipulation and rendering, Yjs for local state binding, and `y-websocket` for multi-client synchronization.
2. **Relay Server (`syncboard/server`):** A lightweight Node.js server powered by `ws` and `y-websocket/bin/utils`.

### Attack Vectors & Threat Actors
- **Unauthenticated Peers:** Malicious or rogue clients connecting directly to the WebSocket relay server.
- **Client-Side Malicious Payloads:** Tampered CRDT state or invalid canvas object properties sent over WebSockets.
- **Browser Resource Exhaustion (DoS):** Overloaded base64 image strings, excessive shape creation, or unthrottled cursor events causing client canvas lag or browser tab crashes.
- **Cross-Site WebSocket Hijacking (CSWSH):** Malicious third-party web pages initiating unauthorized WebSocket connections to local/hosted WebSocket endpoints.

---

## 2. Detailed Protection & Security Assessment

### 2.1 WebSocket Server Security & Protocol Protections (`syncboard/server/index.js`)

#### A. Authentication & Authorization Limitations
- **Current State:** The server initializes `ws.Server` and directly forwards incoming connection requests to `setupWSConnection(conn, req)`.
- **Finding:** There is no authentication handshake, JSON Web Token (JWT), or session token check upon connection. Any client capable of reaching `ws://<host>:1234` can join any room name (`syncboard-main` or arbitrary room strings) and read or modify room contents.
- **Risk Level:** **HIGH**
- **Impact:** Unauthorized data exposure, unauthorized manipulation or deletion of whiteboard content across active rooms.

#### B. Origin Validation & CSWSH
- **Current State:** No origin header (`req.headers.origin`) checks exist in `server/index.js`.
- **Finding:** A user visiting an attacker-controlled website could have their browser silently connect to `ws://localhost:1234` or a public SyncBoard relay server on their behalf (Cross-Site WebSocket Hijacking).
- **Risk Level:** **HIGH**
- **Impact:** Attackers can exfiltrate collaborative whiteboard state or inject malicious shapes/data into active sessions.

#### C. Server Rate Limiting & DoS Resistance
- **Current State:** The WebSocket server does not enforce connection limits per IP or message rate limits per socket.
- **Finding:** An attacker can flood the relay server with thousands of concurrent WebSocket connections or high-frequency updates, causing memory spikes or server crash.
- **Risk Level:** **MEDIUM**

---

### 2.2 CRDT & Real-Time Synchronization Protection (`syncboard/client/src/CanvasApp.tsx`)

#### A. Unvalidated CRDT Updates
- **Current State:** The Yjs shared map (`ydoc.getMap('elements')`) accepts any key-value pairs of type `ElementData`.
- **Finding:** Because `y-websocket` relays binary Yjs updates without inspecting the payload on the server, a compromised client can send non-conforming or corrupted object shapes directly into the CRDT.
- **Client Defense Measures:**
  - `CanvasApp.tsx` contains type guards and null-safety logic when consuming updates (`upsertFabricObject`).
  - `fabric.Image.fromURL` contains explicit `if (!img) return;` null-checks to prevent browser crashes when handling corrupted or invalid base64 image strings.

#### B. Client Payload Limits (Images & Backups)
- **Current State:**
  - File uploads in `Toolbar.tsx` validate MIME types (`file.type.startsWith('image/')`) and enforce a maximum payload limit (`MAX_FILE_SIZE = 3MB`).
  - JSON backup import (`onImportJSON`) parses JSON safely with a `try/catch` block and checks required properties (`el.id`, `el.type`, `el.position`) before inserting objects into Yjs.
- **Finding:** Client-side checks protect standard UI users, but direct CRDT injection via modified client code can bypass client-side file size restrictions.

#### C. IndexedDB Local Storage Constraints
- **Current State:** State is persisted locally via `IndexeddbPersistence('syncboard-v3', ydoc)`.
- **Finding:** Persisting oversized CRDT logs could exceed browser IndexedDB quotas (~50MB to hundreds of MBs depending on browser).

---

### 2.3 User Profile & Output Sanitization

#### A. Input Validation
- **Room Name Editing:** Enforces `maxLength={50}` (`ROOM_NAME_MAX_LENGTH`) on client input controls and truncates whitespace (`.trim().slice(0, 50)`).
- **Display Name:** Enforces `maxLength={24}` in `TopBar.tsx`.
- **Finding:** Proper truncation and length limits prevent UI overflows.

#### B. XSS & Rendering Security
- **Canvas Rendering:** Fabric.js renders shapes, text, and sticky notes onto an HTML5 `<canvas>` element (rasterized 2D context), eliminating standard DOM-based Cross-Site Scripting (XSS) risks for canvas elements.
- **React UI Overlay:** React DOM handles user inputs (display name, room name) using JSX string interpolation (`{localUser.name}`), preventing DOM XSS.

---

## 3. Vulnerability & Risk Summary Matrix

| Domain | Limitation / Finding | Risk Severity | Current Protection | Recommended Action |
| :--- | :--- | :--- | :--- | :--- |
| **WebSocket Relay** | No connection authentication or authorization | **HIGH** | None (Open Relay) | Implement JWT/Token authentication in `setupWSConnection` |
| **WebSocket Relay** | Missing Origin header validation (CSWSH) | **HIGH** | None | Reject connections where `origin` does not match allowed domains |
| **Relay DDoS** | No rate limiting per socket/IP | **MEDIUM** | None | Implement `express-rate-limit` / `ws` rate limiting middleware |
| **Client Memory** | Base64 image payload accumulation in Y.Doc | **MEDIUM** | 3MB UI upload limit & null checks in `CanvasApp.tsx` | Transition image persistence to object storage (S3/Cloudinary) |
| **Data Integrity** | Unvalidated CRDT updates relayed by server | **MEDIUM** | Client-side validation in `CanvasApp.tsx` | Implement server-side Yjs Y.Doc payload validation |
| **Local Storage** | IndexedDB storage growth | **LOW** | Local persistent DB clearing capability | Add quota warning or periodic cleanup |

---

## 4. Recommended Security & Architecture Roadmap

### Short-Term Recommendations
1. **Origin Verification on Server:**
   Add `origin` validation to `syncboard/server/index.js` to mitigate CSWSH:
   ```js
   wss.on('connection', (conn, req) => {
     const origin = req.headers.origin;
     if (process.env.NODE_ENV === 'production' && !isAllowedOrigin(origin)) {
       conn.close(1008, 'Origin not allowed');
       return;
     }
     setupWSConnection(conn, req);
   });
   ```
2. **WebSocket Rate Limiting:**
   Integrate rate-limiting middleware on the server to prevent socket flooding.

### Long-Term Architecture Enhancements
1. **Authenticated Room Tokens:**
   Pass signed JWT tokens in WebSocket connection parameters (`ws://host:1234?token=...`) to restrict room access to authorized users.
2. **External Media Storage for Images:**
   Replace inline base64 Data URL storage in Yjs maps with external object storage (e.g. AWS S3, Cloudflare R2), storing only secure HTTPS URLs in `ElementData`.
3. **Server-Side CRDT Validation:**
   Run headless Yjs validation on the relay server to reject malformed CRDT transactions before broadcasting them to peers.

---

## 5. Audit Log & Verification

- **Codebase Build Status:** `npm run build` completed successfully with zero TypeScript or Vite bundle errors.
- **Code Style & Syntax:** `npm run lint` completed cleanly across all client components.
- **Runtime Integrity:** Real-time Yjs CRDT state updates, null-safe image handling, and UI constraints verified operational.
