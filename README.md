# Stride

**A multi-panel desktop workspace for focused work.**
Open Gmail, Calendar, GitHub, and your daily apps side-by-side — no tabs, no browser clutter.

![Stride Screenshot](./docs/screenshot.png)

[![Version](https://img.shields.io/badge/version-0.1.0-7C6AF7?style=flat-square)](https://github.com/your-org/stride/releases)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D4?style=flat-square&logo=windows)](https://github.com/your-org/stride/releases)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](./LICENSE)
[![Built with Tauri](https://img.shields.io/badge/built_with-Tauri_2-FFC131?style=flat-square&logo=tauri)](https://tauri.app)
[![Built with React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)

> **Status:** Phase 2 in progress — Windows only.

---

## What is Stride?

Stride is a desktop shell that organizes web apps into configurable **Workspaces** with real, native WebView2 panels — not iframes, not browser tabs.

Each panel runs a full WebView2 instance with a **shared session**: sign in to Google once and every panel (Gmail, Calendar, Drive, Meet) picks it up automatically.

Panels can also host **integrated widgets** — lightweight tools like a scratchpad that dock inside the panel area without floating over content.

---

## Download

Pre-built installers are available on the [Releases page](https://github.com/bramuchile/stride/releases).

| Installer | Format |
|-----------|--------|
| [`Stride_0.1.3_x64-setup.exe`](https://github.com/bramuchile/stride/releases) | NSIS installer |
| [`Stride_0.1.3_x64.msi`](https://github.com/bramuchile/stride/releases) | MSI package |

**Requirements:** Windows 10/11 (x64). [WebView2 runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) is bundled with the installer.

---

## Features

**Panels & Layouts**
- **Native multi-panel layout** — 2-column, 3-column, and 2×2 grid layouts
- **Shared session** — cookies and localStorage shared across all panels via a single WebView2 profile; sign in to Google once, all panels pick it up
- **Per-panel address bar** — navigate or search within any panel
- **Drag-to-resize** — drag panel separators to adjust widths; sizes persist across sessions
- **Deferred loading** — WebViews are created once and shown/hidden on workspace switch (never recreated)

**Widgets**
- **Notes widget** — per-panel persistent notes with markdown rendering (headings, bullets, checkboxes, code, links), view/edit toggle, auto-save (500ms debounce), version history (last 5), pin a note above the editor, word count, collapsible
- **Weather widget** — current conditions with dynamic color theming
- **Widget overlays** — widgets dock above or below the WebView area (not floating), with configurable height

**Workspaces**
- **4 preloaded workspaces** — ready to use on first launch, fully reconfigurable
- **Create & edit workspaces** — choose name, emoji icon, layout, and configure each panel's URL or widget
- **Keyboard navigation** — `Ctrl+1…9` to jump to any workspace, `Ctrl+Tab` to cycle

**Shell**
- **Custom titlebar** — Windows 11-style controls (minimize/maximize/close), update notification banner
- **Slim sidebar** — 52px, active workspace indicator (accent pill + glow), hover tooltips
- **Panel header** — site favicon, connection status dot, reload and widget controls

**WebView2 reliability**
- Standard Chrome user agent — fixes WhatsApp Web, Google Meet, and other sites that reject non-browser UAs
- External popups redirect to the system browser instead of opening a new WebView
- Permission handler for camera, microphone, geolocation, and notifications

**System**
- **Auto-update** — background update check on launch; banner in titlebar with one-click install
- **Error reporting** — "Copy error" button formats diagnostics for GitHub Issues

---

## Included Workspaces

| Workspace | Layout | Panels |
|-----------|--------|--------|
| Trabajo 💼 | 3-col | WhatsApp Web · ChatGPT · YouTube — with Weather overlay (top) and Notes overlay (bottom) |
| Finanzas 📊 | 2-col | Yahoo Finance · TradingView |
| Social 🎮 | 3-col | WhatsApp Web · X · Instagram |
| Dev ⚙️ | 3-col | GitHub · GitHub · Vercel |

These are seeds for first launch — workspaces are fully configurable.

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

### Done
- [x] Multi-panel layouts (2-col, 3-col, 2×2)
- [x] Shared WebView2 session (single login, all panels)
- [x] SQLite persistence (workspaces, panels, notes, history)
- [x] Deferred WebView loading (create once, show/hide)
- [x] Drag-to-resize panels with persisted widths
- [x] Widget overlay architecture (top/bottom dock, configurable height)
- [x] Notes widget — markdown, history, pin, auto-save, word count
- [x] Weather widget
- [x] Custom titlebar (Windows 11 controls, drag region, update banner)
- [x] Sidebar with workspace switcher
- [x] Create & edit workspaces dialog
- [x] Keyboard shortcuts (Ctrl+1…9, Ctrl+Tab)
- [x] WebView2 hardening (user agent, popup redirect, permission handler)
- [x] Auto-update via GitHub Releases
- [x] Error boundary with formatted diagnostics

### Next
- [ ] Empty panel screen (new-tab style with quick-access tiles)
- [ ] Next Meeting widget — Google Calendar API integration
- [ ] Export / import workspaces as JSON

### Phase 3
- [ ] Focus mode (distraction filter based on EasyList)
- [ ] Additional widgets: Focus Timer, Daily Briefing, Asset Price, Service Status
- [ ] Cloud sync (Pro plan)
- [ ] macOS + Linux support

---

## Contributing

Stride is open source. If you find a bug, use the **"Copy error"** button on the error screen and paste the output into a [new issue](../../issues).

Pull requests are welcome. For significant changes, open an issue first to discuss the approach.

---

## License

[MIT](./LICENSE)
