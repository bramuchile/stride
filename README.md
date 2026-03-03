# Stride

**A multi-panel desktop workspace for focused work.**
Open Gmail, Calendar, GitHub, and your daily apps side-by-side — no tabs, no browser clutter.

![Stride Screenshot](./docs/screenshot.png)

[![Version](https://img.shields.io/badge/version-0.1.0-7C6AF7?style=flat-square)](https://github.com/your-org/stride/releases)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D4?style=flat-square&logo=windows)](https://github.com/your-org/stride/releases)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](./LICENSE)
[![Built with Tauri](https://img.shields.io/badge/built_with-Tauri_2-FFC131?style=flat-square&logo=tauri)](https://tauri.app)
[![Built with React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)

> **Status:** Phase 1 (MVP) complete — Windows only.

---

## What is Stride?

Stride is a desktop shell that organizes web apps into configurable **Workspaces** with real, native WebView2 panels — not iframes, not browser tabs.

Each panel runs a full WebView2 instance with a **shared session**: sign in to Google once and every panel (Gmail, Calendar, Drive, Meet) picks it up automatically.

Panels can also host **integrated widgets** — lightweight tools like a scratchpad that dock inside the panel area without floating over content.

---

## Features

- **Native multi-panel layout** — 2-column, 3-column, and 2×2 grid layouts
- **Shared session** — cookies and localStorage shared across all panels via a single WebView2 profile
- **Per-panel address bar** — click to navigate or search within any panel
- **Integrated widgets** — widgets reduce the webview area and live structurally inside the panel
- **Scratchpad widget** — persistent notes, per panel, across sessions
- **Slim sidebar** — 52px, workspace switching with keyboard shortcuts
- **Deferred loading** — WebViews are created once and shown/hidden on workspace switch (never recreated)
- **Auto-update** — built-in updater via Tauri updater plugin
- **Error reporting** — "Copy error" button formats diagnostics for GitHub Issues

---

## Included Workspaces

| Workspace | Layout | Panels |
|-----------|--------|--------|
| Work      | 2-col  | Gmail · Google Calendar |
| Personal  | 2-col  | YouTube · Scratchpad |
| Dev       | 3-col  | GitHub · localhost:3000 · Vercel |

These are seeds for first launch — workspaces are fully configurable.

---

## Download

Pre-built installers are available on the [Releases page](https://github.com/your-org/stride/releases).

| Installer | Format |
|-----------|--------|
| `Stride_0.1.0_x64-setup.exe` | NSIS installer |
| `Stride_0.1.0_x64.msi` | MSI package |

**Requirements:** Windows 10/11 (x64). [WebView2 runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) is bundled with the installer.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop shell | Tauri 2 + Rust |
| WebView engine | WebView2 (Windows) |
| Frontend | React 19 + TypeScript + Vite |
| UI components | shadcn/ui + Tailwind CSS v4 |
| State | Zustand |
| Data | TanStack Query + SQLite (tauri-plugin-sql) |

---

## Building from Source

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20
- [Rust](https://rustup.rs/) (stable toolchain)
- [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) — Microsoft C++ Build Tools + WebView2 runtime

### Development

```bash
npm install
npm run tauri dev
```

On first run, SQLite migrations execute and the default workspaces are seeded. The database is stored at `%APPDATA%\stride\stride.db`.

### Production Build

```bash
npm run tauri build
```

Installer artifacts are output to `src-tauri/target/release/bundle/`.

---

## Project Structure

```
stride/
├── src/
│   ├── App.tsx                          # Root: QueryClient + shortcuts + seed
│   ├── types/index.ts                   # Workspace, Panel, LayoutType
│   ├── store/useWorkspaceStore.ts       # Zustand: activeWorkspaceId + webviewMap
│   ├── lib/
│   │   ├── db.ts                        # SQLite singleton + migrations
│   │   └── seed.ts                      # First-launch seeding
│   ├── hooks/
│   │   ├── useWorkspaces.ts             # Workspace CRUD (TanStack Query)
│   │   ├── usePanels.ts                 # Panels per workspace
│   │   ├── useWebviews.ts               # WebView2 lifecycle (create/show/hide/resize)
│   │   └── useKeyboardShortcuts.ts      # Ctrl+1..9, Ctrl+Tab
│   └── components/
│       ├── layout/                      # AppShell, PanelGrid, PanelSlot
│       ├── sidebar/                     # Sidebar, WorkspaceList, WorkspaceItem
│       ├── panels/                      # WebPanel, WidgetPanel, PanelHeader, AddressBar
│       ├── widgets/                     # Scratchpad, Notes, and future widgets
│       └── error/                       # ErrorBoundary + ErrorDisplay
└── src-tauri/
    └── src/
        ├── lib.rs                       # Plugin registration + command setup
        └── commands/webview.rs          # create/resize/show/hide/navigate WebViews
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+1` … `Ctrl+9` | Switch to workspace N |
| `Ctrl+Tab` | Next workspace |
| `Ctrl+Shift+Tab` | Previous workspace |

---

## Roadmap

### Phase 2 — In Progress
- Visual workspace editor (drag panels, change URLs, reorder)
- Custom layouts
- Calendar widget (Google Calendar API)
- Notes widget redesign
- Export / import workspaces as JSON

### Phase 3
- Focus mode (distraction filter based on EasyList)
- Additional widgets: Focus Timer, Daily Briefing, Asset Price, Service Status
- Cloud sync (Pro plan)
- macOS + Linux support

---

## Contributing

Stride is open source. If you find a bug, use the **"Copy error"** button on the error screen and paste the output into a [new issue](../../issues).

Pull requests are welcome. For significant changes, open an issue first to discuss the approach.

---

## License

[MIT](./LICENSE)
