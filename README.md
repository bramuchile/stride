# Stride

Centro de control multipanel para productividad diaria. Abre Gmail, Calendar, GitHub y tus apps favoritas en una sola ventana, sin pestañas, sin distracciones.

> **Estado:** Fase 1 (MVP) completa — Windows únicamente.

---

## ¿Qué es Stride?

Stride te permite organizar tus aplicaciones web en **Workspaces** con layouts configurables (2 columnas, 3 columnas, cuadrícula 2×2). Cada panel muestra un WebView real con sesión compartida: **inicia sesión en Google una sola vez** y todos los paneles (Gmail, Calendar, Drive…) la usan automáticamente.

### Workspaces incluidos

| Workspace | Layout | Paneles |
|-----------|--------|---------|
| Trabajo   | 2 col  | Gmail · Google Calendar |
| Personal  | 2 col  | YouTube · Scratchpad |
| Dev       | 3 col  | GitHub · localhost:3000 · Vercel |

---

## Características

- **Multipanel real** — WebView2 nativo, no iframes
- **Sesión unificada** — cookies y localStorage compartidos entre todos los paneles
- **Barra de direcciones por panel** — haz clic en el dominio o en la lupa para navegar
- **Sidebar slim** — 52 px con iniciales de workspace y tooltips
- **Scratchpad** — bloc de notas persistente entre sesiones
- **Atajos de teclado** — `Ctrl+1`/`2`/`3` para cambiar workspace, `Ctrl+Tab` para ciclar
- **Carga diferida** — los WebViews se crean una vez y se muestran/ocultan al cambiar workspace
- **Auto-update** — actualizaciones automáticas vía Tauri updater
- **Reporte de errores** — botón "Copiar error" formateado listo para pegar en GitHub Issues

---

## Stack

| Capa | Tecnología |
|------|------------|
| Desktop | Tauri 2 + Rust |
| WebView | WebView2 (Windows) |
| Frontend | React 19 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS v4 |
| Estado | Zustand |
| Datos | TanStack Query + SQLite (tauri-plugin-sql) |

---

## Requisitos previos

- [Node.js](https://nodejs.org/) ≥ 20
- [Rust](https://rustup.rs/) (stable)
- [Tauri prerequisites para Windows](https://v2.tauri.app/start/prerequisites/) — Microsoft C++ Build Tools + WebView2

---

## Desarrollo

```bash
# Instalar dependencias JS
npm install

# Arrancar en modo desarrollo (abre la ventana Tauri con hot-reload)
npm run tauri dev
```

La primera vez que arranques se ejecuta la migración SQLite y el seeding de los 3 workspaces de ejemplo. La base de datos se guarda en `%APPDATA%\stride\stride.db`.

---

## Build

```bash
# Generar instalador (.msi y .nsis)
npm run tauri build
```

El instalador queda en `src-tauri/target/release/bundle/`.

---

## Estructura del proyecto

```
stride/
├── src/
│   ├── App.tsx                          # Root: QueryClient + shortcuts + seed
│   ├── types/index.ts                   # Workspace, Panel, LayoutType
│   ├── store/useWorkspaceStore.ts       # Zustand: activeWorkspaceId + webviewMap
│   ├── lib/
│   │   ├── db.ts                        # Singleton SQLite + migraciones
│   │   └── seed.ts                      # Seeding en primer arranque
│   ├── hooks/
│   │   ├── useWorkspaces.ts             # CRUD workspaces (TanStack Query)
│   │   ├── usePanels.ts                 # Panels por workspace
│   │   ├── useWebviews.ts               # Ciclo de vida WebView2 (create/show/hide/resize)
│   │   └── useKeyboardShortcuts.ts      # Ctrl+1..9, Ctrl+Tab
│   └── components/
│       ├── layout/                      # AppShell, PanelGrid, PanelSlot
│       ├── sidebar/                     # Sidebar slim, WorkspaceList, WorkspaceItem
│       ├── panels/                      # WebPanel, WidgetPanel, PanelHeader, AddressBar
│       ├── widgets/scratchpad/          # ScratchpadWidget + useScratchpad
│       └── error/                       # ErrorBoundary + ErrorDisplay
└── src-tauri/
    └── src/
        ├── lib.rs                       # Plugins + registro de comandos
        └── commands/webview.rs          # create/destroy/resize/show/hide/navigate WebViews
```

---

## Atajos de teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl+1` … `Ctrl+9` | Cambiar al workspace N |
| `Ctrl+Tab` | Workspace siguiente |
| `Ctrl+Shift+Tab` | Workspace anterior |

---

## Roadmap

### Fase 2 (próxima)
- Editor visual de Workspaces (arrastrar paneles, cambiar URLs)
- Layouts custom
- Perfiles múltiples (Trabajo / Personal)
- Calendar Widget con Google Calendar API
- Exportar / importar Workspaces en JSON
- Más widgets: Focus Timer, Daily Briefing, Habit Tracker

### Fase 3
- Modo Focus (filtro de distracciones basado en EasyList)
- Asset Price Widget
- Service Status Widget
- Sync en la nube (Plan Pro)

---

## Contribuir

El proyecto es open source. Si encuentras un bug, usa el botón **"Copiar error"** que aparece en la pantalla de error y pega el contenido en un [nuevo issue](../../issues).

---

## Licencia

MIT
