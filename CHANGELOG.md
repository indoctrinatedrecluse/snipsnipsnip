# Changelog

All notable changes to **SnippetVault** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-16

### Added

- **CodeMirror 6 Editor Core Upgrade**:
  - Replaced legacy overlaid `<textarea>` with a high-performance CodeMirror 6 editor engine.
  - Features real syntax highlighting, code folding gutters, bracket matching, smart indent, and soft line wrapping.
  - Integrated cursor position indicator (`Ln X, Col Y`) and live character/word/line counters.
  - Integrated keyboard shortcuts: Go-to-line dialog (`Ctrl+G`), zoom in/out font sizing (`Ctrl+=` / `Ctrl+-`), and tab indentation.
  - Seamless One Dark and GitHub Light theme compartment switching.

- **Top-Tier Syntax Highlighting (55+ Languages)**:
  - Comprehensive grammar support across CodeMirror 6 and Shiki engines:
    - **Web & Frontend**: TypeScript (`.ts`, `.tsx`), JavaScript (`.js`, `.jsx`), HTML, CSS, SCSS, Less, Astro, Svelte, Vue, MDX.
    - **Systems & Native**: Rust (`.rs`), Go (`.go`), C (`.c`, `.h`), C++ (`.cpp`), Zig (`.zig`), Swift (`.swift`).
    - **Mobile**: Dart / Flutter (`.dart`), Kotlin (`.kt`), Swift.
    - **Backend & Functional**: Python (`.py`), Java, C# (`.cs`), PHP, Ruby (`.rb`), Elixir (`.ex`), Erlang (`.erl`), Scala, Clojure (`.clj`), Haskell (`.hs`), OCaml (`.ml`), F# (`.fs`).
    - **Data & Schemas**: SQL (`.sql`), GraphQL (`.gql`), Protocol Buffers (`.proto`), Prisma (`.prisma`), Solidity (`.sol`), Julia, R.
    - **DevOps & Config**: Dockerfile, CMake (`CMakeLists.txt`), Makefile, Nginx config, Terraform / HCL (`.tf`), YAML (`.yaml`), TOML (`.toml`), JSON, XML, INI / `.env`.
  - Lazy on-demand chunk loading keeps initial bundle footprint ultralight while supporting over 140 CodeMirror language packages.

- **Smart Language Auto-Detection**:
  - Exact and extension-based filename detection (e.g. `Dockerfile`, `Makefile`, `App.tsx`, `schema.prisma`, `main.dart`, `query.sql`).
  - Code content heuristics inspecting shebangs (`#!/usr/bin/env python3`, `#!/bin/bash`, `#!/usr/bin/env node`), SQL statements, and Go/Rust/C starter patterns.
  - Automatic detection wired into New Snippet creation and Spotlight quick capture.

- **Desktop Spotlight & Quick-Capture HUD (`Ctrl+K`)**:
  - Fast keyboard-driven Spotlight modal to fuzzy-search active snippets and copy code instantly without context switching.
  - Clipboard Quick-Capture (`Ctrl+Shift+V`): Reads current clipboard text, auto-detects programming language, and creates a tagged snippet in one keypress.
  - Native Windows system tray integration with focus restore and background lifecycle management.

- **Dynamic Snippet Templates & Variables**:
  - Template placeholder parser supporting `{{variable}}`, `{{var:default}}`, and `${1:default}` syntax.
  - Built-in dynamic auto-tokens: `{{date}}`, `{{time}}`, `{{datetime}}`, `{{uuid}}`, and `{{clipboard}}`.
  - Interactive Template Fill dialog with live substitution preview and one-click copy.

- **Hierarchical Collections & Folders**:
  - Organize snippets into custom collections and categories.
  - Sidebar management with collection counters, folder creation, renaming, and deletion.
  - Quick folder assignment via snippet details toolbar and dialogs.

- **Safe Sync & Soft-Delete Trash**:
  - Soft deletion workflow preserving deleted snippets in a dedicated Trash view with one-click restore and permanent purge options.
  - Automatic conflict resolution saving local unsynced edits into `(Conflict backup)` snippets before pulling remote Google Drive revisions.

- **IDE Snippet Export & GitHub Gist Integration**:
  - Export snippets directly to VS Code `.code-snippets` format for native editor tab-completion.
  - Publish snippets to GitHub Gists as public or secret gists.
  - Import snippets directly from GitHub Gist IDs or URLs.

- **Official Brand Identity & Vector App Icon**:
  - Custom vector logo featuring a deep slate rounded squircle with a light-blue snippet bracket monogram (`< / >`).
  - Integrated into Windows installer setup, application executable, native system tray, in-app brand bar, About modal, and web favicons.

- **Windows Release Pipeline (`.github/workflows/release.yml`)**:
  - Multi-artifact Windows distribution pipeline targeting x64 architectures.
  - Automatically packages and publishes:
    1. NSIS Windows Setup Installer (`.exe`)
    2. Standalone Windows Executable (`.exe`)
    3. Windows Portable ZIP Archive (`.zip`)

### Changed

- Bumped project version to `v1.0.0` across `package.json`, `Cargo.toml`, `tauri.conf.json`, and app metadata.
- Reconfigured release workflow to automatically publish non-draft releases with bundled portable assets on version tag pushes.

### Fixed

- Resolved shortcut conflict with `Ctrl+Shift+C` copying in snippet view.
- Fixed search highlighter string slicing bug causing corruption on overlapping match ranges.
- Prevented CodeMirror cursor jumping and selection resets during external document updates.
