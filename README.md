# SnippetVault 📌

> A modern, **privacy-focused**, cloud-synchronized **code snippet manager** for developers who want a frictionless way to save, organize, and access their snippets across devices.

[![Status](https://img.shields.io/badge/status-in%20development-yellow)](#roadmap)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178c6)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-38bdf8)](https://tailwindcss.com/)
[![Shiki](https://img.shields.io/badge/Shiki-4-9f7bea)](https://shiki.style/)
[![License](https://img.shields.io/badge/license-MIT-blue)](#license)

SnippetVault is built for **speed** — search, highlight, and copy in milliseconds. By treating **Google Drive as the source of truth**, the application remains lightweight, user-owned, and incredibly easy to deploy.

---

## ✨ Core Features

| | Feature | Description |
|---|---|---|
| 🟢 | **Offline-First** | Instant access to snippets without an internet connection, powered by IndexedDB. |
| 🎨 | **Beautiful Highlighting** | Shiki provides professional-grade syntax highlighting for hundreds of languages out of the box — no custom rules, no LLMs. |
| ☁️ | **Cloud Synchronization** | Your entire library syncs to your Google Drive account, available wherever you sign in. |
| 🖥️ | **Modern Interface** | A clean, distraction-free UI built with Shadcn UI, optimized for high-speed snippet management. |
| 🚫 | **Zero Backend Hassle** | A serverless application: client-side authentication and direct Google Drive API integration. |

---

## 🚀 Tech Stack

| Technology | Role |
|---|---|
| [React](https://react.dev/) + [Vite](https://vitejs.dev/) | Lightning-fast frontend framework and build tool |
| [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/) | Utility-first styling and accessible, modular components |
| [Shiki](https://shiki.style/) | Theme-aware syntax highlighting built on VS Code grammars |
| [Zustand](https://zustand-demo.pmnd.rs/) | Simple, performant global state management |
| [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) | Offline-first local storage for instant snippet access |
| [Google Drive API](https://developers.google.com/drive/api) | Seamless, secure cloud persistence of your snippet library |
| [Tauri](https://tauri.app/) | Lightweight desktop shell (uses the OS's own WebView2 on Windows) |

---

## 🛠 Project Philosophy

SnippetVault solves the problem of **fragmented code storage**. By keeping everything client-side and treating Google Drive as the source of truth:

- **You own your data** — no third-party servers, no vendor lock-in.
- **The app stays lightweight** — no backend to deploy or maintain.
- **Everything is fast** — search, highlight, and copy within milliseconds.

---

## 📦 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+ recommended) — npm ships with it.

### Quick Start (Windows PowerShell)

```powershell
.\setup.ps1    # Installs any missing project dependencies
.\run.ps1      # Builds and runs a working copy at http://localhost:4173
```

### Manual Setup

```bash
npm install    # install dependencies
npm run dev    # start the Vite dev server
```

### Other Scripts

| Command | Description |
|---|---|
| `npm run build` | Type-check and produce an optimized production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Run the Vitest test suite |
| `npm run tauri:dev` | Run the desktop app in development (Vite + WebView2) |
| `npm run tauri:build` | Build the standalone desktop app (exe + NSIS installer in `src-tauri/target/release/`) |

### ☁️ Enabling Google Drive Sync

Snippets are always stored locally (IndexedDB, offline-first). Drive sync is
opt-in and uses the narrow `drive.appdata` scope — the app only reads and
writes its own hidden app folder in your Drive, never your personal files.

1. Create an OAuth client id at <https://console.cloud.google.com/apis/credentials>
   (Application type: **Web application**).
2. Add `http://localhost:5173` to **Authorized JavaScript origins**.
3. Enable the **Google Drive API** for your project.
4. Copy `.env.example` to `.env` and set `VITE_GOOGLE_CLIENT_ID`.
5. Restart the app — you'll see a **Sync** control in the sidebar.

> Until configured, the app works fully offline with a "sync not configured"
> indicator in the sidebar.

---

## 📁 Project Structure

```
├── setup.ps1 / run.ps1   # Dependency installer & build-and-run scripts
├── index.html
├── vite.config.ts
├── src/
│   ├── components/
│   │   ├── ui/           # Shadcn UI primitives
│   │   ├── editor/       # Code editor & highlighted output
│   │   ├── layout/       # App shell, sidebar, toolbar, sync status
│   │   └── snippets/     # Snippet list, detail & dialogs
│   ├── hooks/            # Debounced highlighting, hotkeys, persistence, sync
│   ├── lib/              # highlight.ts, db.ts (IndexedDB), sync.ts, gdrive-auth.ts
│   ├── stores/           # Zustand stores (snippets, settings, sync)
│   └── types/            # Shared TypeScript models
```

---

## 🗺 Roadmap

- [x] **Phase 0** — Project scaffolding, styling system, scripts & docs
- [x] **Phase 1** — Frontend & editor (snippet list, search, editing, copy)
- [x] **Phase 2** — Highlighting engine (Shiki) & storage (IndexedDB + Google Drive sync)

**Planned next:**
- Tags editing, snippet import/export, and conflict-resolution refinements
- Desktop packaging — the app runs in a Tauri shell (using the OS's own
  WebView2 on Windows); polish the installer and add auto-updates

---

## 📄 License

MIT © SnippetVault contributors

---

*Built with a focus on performance and aesthetic.*
