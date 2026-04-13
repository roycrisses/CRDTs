# SyncBoard

SyncBoard is a real-time collaborative whiteboard application built with modern web technologies. It allows multiple users to draw shapes, add text, and collaborate in real-time, even with offline support.

## 🚀 Features

- **Real-time Collaboration**: Seamless synchronization between multiple users using WebSockets.
- **Conflict-free Replicated Data Types (CRDTs)**: Powered by [Yjs](https://yjs.dev/) to ensure data consistency without merge conflicts.
- **Offline Support**: Local persistence using IndexedDB, allowing you to work offline and sync when back online.
- **Interactive Canvas**: High-performance drawing canvas built with [Fabric.js](http://fabricjs.com/).
- **Modern Tech Stack**: React, TypeScript, and Vite for a fast and robust development experience.
- **Collaborative Tools**: Floating toolbar with Rectangle, Circle, Text, Sticky Notes, and Pencil tools.
- **Undo/Redo**: Full history support for your collaborative sessions.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Fabric.js, Lucide React
- **Synchronization**: Yjs, y-websocket, y-indexeddb
- **Backend**: Node.js, WebSockets (`ws`)
- **Build Tool**: Vite

## 📂 Project Structure

```
.
├── syncboard/
│   ├── client/      # React frontend application
│   └── server/      # Node.js WebSocket relay server
└── README.md        # Root documentation
```

## 🏁 Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- npm or yarn

### 1. Start the Server

The server acts as a relay for Yjs updates.

```bash
cd syncboard/server
npm install
node index.js
```
The server will run at `ws://localhost:1234`.

### 2. Start the Client

```bash
cd syncboard/client
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

## 📖 Usage

- **Add Shapes**: Use the floating toolbar at the top to add Rectangles, Circles, Text, or Sticky Notes.
- **Pencil Tool**: Draw freehand directly on the canvas.
- **Move/Resize**: Click and drag any object on the canvas to move it. Use the handles to resize.
- **Edit Text**: Double-click on text elements or sticky notes to edit their content.
- **Delete**: Select an object and press `Delete`/`Backspace` or use the trash icon in the toolbar.
- **Undo/Redo**: Use the undo/redo buttons in the toolbar or standard keyboard shortcuts (`Ctrl+Z` / `Ctrl+Y`).
- **Persistence**: Your work is automatically saved to your browser's IndexedDB.

## 📜 License

ISC
