import { useState, useEffect, useRef } from "react";
import {
  Monitor, Code2, Globe, LayoutDashboard, Bookmark, Zap,
  Music, Mail, Camera, BarChart2, Terminal, Cpu,
  type LucideIcon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import {
  useCreateWorkspace,
  useUpdateWorkspace,
  useDeleteWorkspace,
  useWorkspaces,
} from "@/hooks/useWorkspaces";
import { useCreatePanel, useUpdatePanel, usePanels } from "@/hooks/usePanels";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { SIDEBAR_WIDTH, HEADER_HEIGHT } from "@/hooks/useWebviews";
import { getDb, saveDynamicLayout } from "@/lib/db";
import type { LayoutType, Panel, Workspace, WidgetId, DynamicLayout } from "@/types";

// --- Tipos locales ---

interface Slot {
  id?: string;
  type: "WEB" | "WIDGET";
  url: string;
  widget_id: WidgetId | "";
  overlay_widget_id: WidgetId | "";
  overlay_position: "top" | "bottom";
  overlay_height_pct: number;
  workspace_id?: string;
  position: number;
}

// --- Constantes ---

const WIDGET_GRID: { id: WidgetId | ""; label: string; icon: string }[] = [
  { id: "scratchpad",   label: "Notas",    icon: "📝" },
  { id: "next-meeting", label: "Reunión",  icon: "📅" },
  { id: "weather",      label: "Clima",    icon: "🌤" },
  { id: "",             label: "Sin widget", icon: "✕" },
];

const ICON_OPTIONS: { name: string; Icon: LucideIcon }[] = [
  { name: "Monitor",         Icon: Monitor },
  { name: "Code2",           Icon: Code2 },
  { name: "Globe",           Icon: Globe },
  { name: "LayoutDashboard", Icon: LayoutDashboard },
  { name: "Bookmark",        Icon: Bookmark },
  { name: "Zap",             Icon: Zap },
  { name: "Music",           Icon: Music },
  { name: "Mail",            Icon: Mail },
  { name: "Camera",          Icon: Camera },
  { name: "BarChart2",       Icon: BarChart2 },
  { name: "Terminal",        Icon: Terminal },
  { name: "Cpu",             Icon: Cpu },
];

const AUTO_NAMES: Partial<Record<LayoutType, string>> = {
  "2col":    "Workspace dividido",
  "3col":    "Workspace triple",
  "2x2":     "Workspace grid",
  "dynamic": "Layout libre",
};

const LAYOUT_OPTIONS = [
  {
    value: "dynamic" as LayoutType,
    label: "Libre",
    description: "columnas + filas",
    slotCount: 1,
    preview: (active: boolean) => (
      <svg width="44" height="30" viewBox="0 0 44 30">
        <rect x="2" y="2" width="16" height="11" rx="2"
          fill={active ? "rgba(124,106,247,0.3)" : "rgba(255,255,255,0.06)"}
          stroke={active ? "rgba(124,106,247,0.6)" : "rgba(255,255,255,0.1)"}
          strokeWidth="1"
        />
        <rect x="2" y="17" width="16" height="11" rx="2"
          fill={active ? "rgba(124,106,247,0.2)" : "rgba(255,255,255,0.04)"}
          stroke={active ? "rgba(124,106,247,0.6)" : "rgba(255,255,255,0.1)"}
          strokeWidth="1"
        />
        <rect x="26" y="2" width="16" height="26" rx="2"
          fill={active ? "rgba(124,106,247,0.15)" : "rgba(255,255,255,0.04)"}
          stroke={active ? "rgba(124,106,247,0.6)" : "rgba(255,255,255,0.1)"}
          strokeWidth="1"
        />
        <text x="34" y="19" fontSize="8" fill={active ? "rgba(124,106,247,0.9)" : "rgba(255,255,255,0.3)"} textAnchor="middle">+</text>
      </svg>
    ),
  },
  {
    value: "2col" as LayoutType,
    label: "Dividido",
    description: "2 paneles",
    slotCount: 2,
    preview: (active: boolean) => (
      <svg width="44" height="30" viewBox="0 0 44 30">
        <rect x="2" y="2" width="18" height="26" rx="3"
          fill={active ? "rgba(124,106,247,0.3)" : "rgba(255,255,255,0.06)"}
          stroke={active ? "rgba(124,106,247,0.6)" : "rgba(255,255,255,0.1)"}
          strokeWidth="1"
        />
        <rect x="24" y="2" width="18" height="26" rx="3"
          fill={active ? "rgba(124,106,247,0.2)" : "rgba(255,255,255,0.04)"}
          stroke={active ? "rgba(124,106,247,0.6)" : "rgba(255,255,255,0.1)"}
          strokeWidth="1"
        />
      </svg>
    ),
  },
  {
    value: "3col" as LayoutType,
    label: "Triple",
    description: "3 paneles",
    slotCount: 3,
    preview: (active: boolean) => (
      <svg width="44" height="30" viewBox="0 0 44 30">
        {[0, 1, 2].map(i => (
          <rect key={i}
            x={2 + i * 14} y="2" width="10" height="26" rx="2"
            fill={active ? `rgba(124,106,247,${0.3 - i * 0.08})` : "rgba(255,255,255,0.06)"}
            stroke={active ? "rgba(124,106,247,0.6)" : "rgba(255,255,255,0.1)"}
            strokeWidth="1"
          />
        ))}
      </svg>
    ),
  },
  {
    value: "2x2" as LayoutType,
    label: "Grid",
    description: "4 paneles",
    slotCount: 4,
    preview: (active: boolean) => (
      <svg width="44" height="30" viewBox="0 0 44 30">
        {([[2, 2], [24, 2], [2, 17], [24, 17]] as [number, number][]).map(([x, y], i) => (
          <rect key={i}
            x={x} y={y} width="18" height="11" rx="2"
            fill={active ? `rgba(124,106,247,${0.3 - i * 0.05})` : "rgba(255,255,255,0.06)"}
            stroke={active ? "rgba(124,106,247,0.6)" : "rgba(255,255,255,0.1)"}
            strokeWidth="1"
          />
        ))}
      </svg>
    ),
  },
];

// --- Helpers ---

function defaultSlots(count: number): Slot[] {
  return Array.from({ length: count }, (_, i) => ({
    type: "WEB",
    url: "",
    widget_id: "",
    overlay_widget_id: "",
    overlay_position: "top",
    overlay_height_pct: 20,
    position: i,
  }));
}

function panelToSlot(p: Panel): Slot {
  return {
    id: p.id,
    type: p.type,
    url: p.url ?? "",
    widget_id: (p.widget_id ?? "") as WidgetId | "",
    overlay_widget_id: (p.overlay_widget_id ?? "") as WidgetId | "",
    overlay_position: p.overlay_position ?? "top",
    overlay_height_pct: p.overlay_height_pct ?? 20,
    workspace_id: p.workspace_id,
    position: p.position,
  };
}

// --- Props ---

interface Props {
  open: boolean;
  workspace?: Workspace | null;
  startAtPanels?: boolean;
  onClose: () => void;
}

// --- Etiqueta de sección ---

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: "block", marginBottom: 8,
      fontSize: 10, fontWeight: 700,
      color: "var(--text3)", letterSpacing: "0.08em",
      textTransform: "uppercase",
    }}>
      {children}
    </label>
  );
}

// --- WorkspaceDialog ---

export function WorkspaceDialog({ open, workspace, startAtPanels, onClose }: Props) {
  const isEditing = !!workspace;

  const [showPanelConfig, setShowPanelConfig] = useState(false);
  const [nameEditing, setNameEditing] = useState(false);
  const [nameAutoGenerated, setNameAutoGenerated] = useState(true);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Monitor");
  const [layout, setLayout] = useState<LayoutType>("dynamic");
  const [slots, setSlots] = useState<Slot[]>(defaultSlots(2));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const createWorkspaceMutation = useCreateWorkspace();
  const updateWorkspaceMutation = useUpdateWorkspace();
  const deleteWorkspaceMutation = useDeleteWorkspace();
  const createPanel = useCreatePanel();
  const updatePanel = useUpdatePanel();

  const { data: existingPanels = [] } = usePanels(isEditing ? workspace!.id : null);
  const { data: workspaces = [] } = useWorkspaces();
  const { webviewMap, activeWorkspaceId, setActiveWorkspace, unregisterWebview } =
    useWorkspaceStore();

  useEffect(() => {
    if (!open) return;
    const initialLayout = workspace?.layout ?? "dynamic";
    setShowPanelConfig(startAtPanels ?? false);
    setNameEditing(false);
    setNameAutoGenerated(!isEditing);
    setName(isEditing ? (workspace!.name ?? "") : (AUTO_NAMES[initialLayout] ?? "Mi workspace"));
    setIcon(isEditing ? (workspace!.icon ?? "Monitor") : "Monitor");
    setLayout(initialLayout);
    setConfirmDelete(false);
    if (!isEditing) {
      const opt = LAYOUT_OPTIONS.find(l => l.value === initialLayout);
      setSlots(defaultSlots(opt?.slotCount ?? 2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (isEditing && existingPanels.length > 0) {
      setSlots(existingPanels.map(panelToSlot));
    }
  }, [isEditing, existingPanels]);

  // Foco automático al entrar en edición de nombre
  useEffect(() => {
    if (nameEditing) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [nameEditing]);

  function handleLayoutChange(newLayout: LayoutType) {
    const opt = LAYOUT_OPTIONS.find(l => l.value === newLayout)!;
    setLayout(newLayout);
    if (nameAutoGenerated) {
      setName(AUTO_NAMES[newLayout] ?? "Mi workspace");
    }
    if (!isEditing) {
      setSlots(defaultSlots(opt.slotCount));
    } else {
      const newCount = opt.slotCount;
      setSlots(prev => {
        if (newCount > prev.length) {
          const extra = Array.from({ length: newCount - prev.length }, (_, i) => ({
            type: "WEB" as const,
            url: "",
            widget_id: "" as WidgetId | "",
            overlay_widget_id: "" as WidgetId | "",
            overlay_position: "top" as const,
            overlay_height_pct: 20,
            position: prev.length + i,
          }));
          return [...prev, ...extra].slice(0, newCount);
        }
        return prev.slice(0, newCount);
      });
    }
  }

  function confirmNameEdit() {
    setNameEditing(false);
    if (name.trim()) setNameAutoGenerated(false);
  }

  function updateSlot(i: number, patch: Partial<Slot>) {
    setSlots(prev => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  // Crear workspace rápido con paneles vacíos (flujo principal)
  async function handleCreate() {
    if (!name.trim()) return;
    if (layout === "dynamic") {
      await handleSaveDynamic();
      return;
    }
    const newId = `ws-${Date.now()}`;
    await createWorkspaceMutation.mutateAsync({ id: newId, name: name.trim(), layout, icon });
    for (let i = 0; i < slots.length; i++) {
      await createPanel.mutateAsync({
        id: crypto.randomUUID(),
        workspace_id: newId,
        type: "WEB",
        url: undefined,
        widget_id: undefined,
        position: i,
      });
    }
    setActiveWorkspace(newId);
    handleClose();
  }

  // Guardar solo metadata en edit mode (sin panel config)
  async function handleSaveInfo() {
    if (!name.trim() || !workspace) return;
    await updateWorkspaceMutation.mutateAsync({
      id: workspace.id,
      name: name.trim(),
      icon,
      layout,
    });
    handleClose();
  }

  async function handleSaveDynamic() {
    const newId = isEditing ? workspace!.id : `ws-${Date.now()}`;
    if (isEditing) {
      await updateWorkspaceMutation.mutateAsync({ id: newId, name: name.trim(), icon, layout });
    } else {
      await createWorkspaceMutation.mutateAsync({ id: newId, name: name.trim(), layout, icon });
    }
    // Crear un panel WEB vacío para que la primera columna no quede vacía
    if (!isEditing) {
      const panelId = crypto.randomUUID();
      await createPanel.mutateAsync({
        id: panelId,
        workspace_id: newId,
        type: "WEB",
        url: undefined,
        widget_id: undefined,
        position: 0,
      });
      const initialDynLayout: DynamicLayout = {
        columns: [{ width_frac: 1, panels: [{ panel_id: panelId, height_frac: 1 }] }],
      };
      await saveDynamicLayout(newId, initialDynLayout);
      setActiveWorkspace(newId);
    } else {
      const initialDynLayout: DynamicLayout = { columns: [{ width_frac: 1, panels: [] }] };
      await saveDynamicLayout(newId, initialDynLayout);
    }
    handleClose();
  }

  // Guardar con panel config (flujo avanzado)
  async function handleSave() {
    if (!isEditing) {
      const newId = `ws-${Date.now()}`;
      await createWorkspaceMutation.mutateAsync({ id: newId, name: name.trim(), layout, icon });
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        const panel: Panel = {
          id: crypto.randomUUID(),
          workspace_id: newId,
          type: s.type,
          url: s.type === "WEB" ? (s.url || undefined) : undefined,
          widget_id: s.type === "WIDGET" && s.widget_id ? s.widget_id : undefined,
          position: i,
          overlay_widget_id: s.type === "WEB" && s.overlay_widget_id ? s.overlay_widget_id : undefined,
          overlay_position: s.type === "WEB" && s.overlay_widget_id ? s.overlay_position : undefined,
          overlay_height_pct: s.type === "WEB" && s.overlay_widget_id ? s.overlay_height_pct : undefined,
        };
        await createPanel.mutateAsync(panel);
      }
      setActiveWorkspace(newId);
      handleClose();
      return;
    }

    const wsId = workspace!.id;
    const existingIds = new Set(existingPanels.map(p => p.id));

    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const panel: Panel = {
        id: s.id ?? crypto.randomUUID(),
        workspace_id: wsId,
        type: s.type,
        url: s.type === "WEB" ? (s.url || undefined) : undefined,
        widget_id: s.type === "WIDGET" && s.widget_id ? s.widget_id : undefined,
        position: i,
        overlay_widget_id: s.type === "WEB" && s.overlay_widget_id ? s.overlay_widget_id : undefined,
        overlay_position: s.type === "WEB" && s.overlay_widget_id ? s.overlay_position : undefined,
        overlay_height_pct: s.type === "WEB" && s.overlay_widget_id ? s.overlay_height_pct : undefined,
      };
      if (s.id && existingIds.has(s.id)) {
        await updatePanel.mutateAsync(panel);
      } else {
        await createPanel.mutateAsync(panel);
      }
    }

    const newIds = new Set(slots.map(s => s.id).filter(Boolean));
    const db = await getDb();
    for (const ep of existingPanels) {
      if (!newIds.has(ep.id)) {
        if (webviewMap[ep.id]) {
          await invoke("destroy_panel_webview", { panelId: ep.id }).catch(console.error);
          unregisterWebview(ep.id);
        }
        await db.execute("DELETE FROM panels WHERE id = $1", [ep.id]);
      }
      await queryClient.invalidateQueries({ queryKey: ["panels", wsId] });
    }

    await updateWorkspaceMutation.mutateAsync({ id: wsId, name: name.trim(), icon, layout });

    const webPanels = slots.filter(s => s.type === "WEB" && s.id && webviewMap[s.id]);
    if (webPanels.length > 0) {
      await invoke("resize_panel_webviews", {
        panels: webPanels.map((s, i) => ({
          panel_id: s.id!,
          position: i,
          overlay_position: s.overlay_position && s.overlay_widget_id ? s.overlay_position : null,
          overlay_height_pct: s.overlay_widget_id ? s.overlay_height_pct : null,
        })),
        layout,
        sidebarWidth: SIDEBAR_WIDTH,
        headerHeight: HEADER_HEIGHT,
      }).catch(console.error);
    }

    handleClose();
  }

  async function handleDelete() {
    if (!workspace) return;
    for (const slot of slots) {
      if (slot.id && webviewMap[slot.id]) {
        await invoke("destroy_panel_webview", { panelId: slot.id }).catch(console.error);
        unregisterWebview(slot.id);
      }
    }
    await deleteWorkspaceMutation.mutateAsync(workspace.id);
    if (activeWorkspaceId === workspace.id) {
      const remaining = workspaces.filter(ws => ws.id !== workspace.id);
      if (remaining.length > 0) setActiveWorkspace(remaining[0].id);
    }
    handleClose();
  }

  function handleClose() {
    setShowPanelConfig(false);
    setNameEditing(false);
    setNameAutoGenerated(true);
    setName("");
    setIcon("Monitor");
    setLayout("dynamic");
    setConfirmDelete(false);
    setSlots(defaultSlots(2));
    onClose();
  }

  const isPending =
    createWorkspaceMutation.isPending ||
    updateWorkspaceMutation.isPending ||
    createPanel.isPending ||
    updatePanel.isPending;

  const isDynamic = layout === "dynamic";

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={e => e.target === e.currentTarget && handleClose()}
    >
      <div style={{
        width: 480,
        background: "var(--base-deep)",
        border: "1px solid var(--border2)",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
        }}>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>
            {isEditing ? "Editar workspace" : "Nuevo workspace"}
          </span>
          <button
            onClick={handleClose}
            style={{
              width: 24, height: 24,
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 6,
              background: "transparent", border: "none",
              color: "var(--text3)", fontSize: 14, cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              e.currentTarget.style.color = "var(--text)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text3)";
            }}
          >
            ×
          </button>
        </div>

        {/* Contenido animado */}
        <div style={{ padding: "16px 24px 24px", overflow: "hidden" }}>
          <div
            key={showPanelConfig ? "panels" : "info"}
            className={showPanelConfig ? "step-enter-right" : "step-enter-left"}
          >
            {showPanelConfig ? (
              <PanelConfigView
                slots={slots}
                onUpdateSlot={updateSlot}
                onSave={handleSave}
                onBack={() => setShowPanelConfig(false)}
                onClose={handleClose}
                isPending={isPending}
                isEditing={isEditing}
                isDynamic={isDynamic}
              />
            ) : (
              <MainView
                icon={icon} setIcon={setIcon}
                layout={layout} onLayoutChange={handleLayoutChange}
                name={name} setName={setName}
                nameEditing={nameEditing}
                nameInputRef={nameInputRef}
                onStartNameEdit={() => setNameEditing(true)}
                onConfirmNameEdit={confirmNameEdit}
                isDynamic={isDynamic}
                isEditing={isEditing}
                workspace={workspace ?? null}
                confirmDelete={confirmDelete}
                setConfirmDelete={setConfirmDelete}
                onDelete={handleDelete}
                deleteIsPending={deleteWorkspaceMutation.isPending}
                onClose={handleClose}
                onConfigureUrls={() => setShowPanelConfig(true)}
                onCreate={isEditing ? handleSaveInfo : handleCreate}
                isPending={isPending}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MainView (vista principal de 1 paso) ---

interface MainViewProps {
  icon: string;
  setIcon: (v: string) => void;
  layout: LayoutType;
  onLayoutChange: (l: LayoutType) => void;
  name: string;
  setName: (v: string) => void;
  nameEditing: boolean;
  nameInputRef: React.RefObject<HTMLInputElement | null>;
  onStartNameEdit: () => void;
  onConfirmNameEdit: () => void;
  isDynamic: boolean;
  isEditing: boolean;
  workspace: Workspace | null;
  confirmDelete: boolean;
  setConfirmDelete: (v: boolean) => void;
  onDelete: () => void;
  deleteIsPending: boolean;
  onClose: () => void;
  onConfigureUrls: () => void;
  onCreate: () => void;
  isPending: boolean;
}

function MainView({
  icon, setIcon, layout, onLayoutChange,
  name, setName, nameEditing, nameInputRef,
  onStartNameEdit, onConfirmNameEdit,
  isDynamic, isEditing, workspace,
  confirmDelete, setConfirmDelete, onDelete, deleteIsPending,
  onClose, onConfigureUrls, onCreate, isPending,
}: MainViewProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Selector de icono — Lucide icons, grid 6 cols */}
      <div>
        <SectionLabel>Icono</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
          {ICON_OPTIONS.map(({ name: iconName, Icon }) => {
            const isSelected = icon === iconName;
            return (
              <button
                key={iconName}
                onClick={() => setIcon(iconName)}
                title={iconName}
                style={{
                  height: 40,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 8,
                  background: isSelected ? "rgba(124,106,247,0.15)" : "rgba(255,255,255,0.04)",
                  border: isSelected
                    ? "1px solid rgba(124,106,247,0.5)"
                    : "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer",
                  color: isSelected ? "var(--accent)" : "var(--text3)",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "rgba(124,106,247,0.1)";
                    e.currentTarget.style.color = "var(--accent2)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.color = "var(--text3)";
                  }
                }}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Selector de layout */}
      <div>
        <SectionLabel>Layout</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
          {LAYOUT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onLayoutChange(opt.value)}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 6,
                padding: "10px 6px",
                borderRadius: 10,
                background: layout === opt.value
                  ? "rgba(124,106,247,0.1)"
                  : "rgba(255,255,255,0.03)",
                border: layout === opt.value
                  ? "1px solid rgba(124,106,247,0.4)"
                  : "1px solid var(--border)",
                cursor: "pointer",
                transition: "all 0.15s",
                transform: layout === opt.value ? "translateY(-1px)" : "none",
                boxShadow: layout === opt.value
                  ? "0 4px 12px rgba(124,106,247,0.2)"
                  : "none",
              }}
            >
              {opt.preview(layout === opt.value)}
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: layout === opt.value ? "var(--accent)" : "var(--text2)",
              }}>
                {opt.label}
              </span>
              <span style={{ fontSize: 9, color: "var(--text3)" }}>
                {opt.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Nombre — pill editable */}
      <div>
        <SectionLabel>Nombre</SectionLabel>
        {nameEditing ? (
          <input
            ref={nameInputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onConfirmNameEdit()}
            onBlur={onConfirmNameEdit}
            placeholder="Mi workspace"
            style={{
              width: "100%",
              background: "var(--surface)",
              border: "1px solid var(--accent)",
              borderRadius: 8,
              padding: "7px 12px",
              fontSize: 13,
              color: "var(--text)",
              outline: "none",
              boxSizing: "border-box",
              boxShadow: "0 0 0 3px rgba(124,106,247,0.12)",
            }}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              display: "inline-flex", alignItems: "center",
              padding: "4px 12px",
              background: "rgba(124,106,247,0.08)",
              border: "1px solid rgba(124,106,247,0.2)",
              borderRadius: 20,
              fontSize: 13, fontWeight: 500,
              color: "var(--text)",
            }}>
              {name || "Sin nombre"}
            </span>
            <button
              onClick={onStartNameEdit}
              style={{
                fontSize: 11, color: "var(--text3)",
                background: "none", border: "none",
                cursor: "pointer", padding: 0,
                transition: "color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--accent2)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text3)"}
            >
              editar
            </button>
          </div>
        )}
      </div>

      {/* Zona de peligro — solo en modo edición */}
      {isEditing && (
        <div style={{ paddingTop: 4, borderTop: "1px solid var(--border)" }}>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text3)"}
              style={{
                fontSize: 11, color: "var(--text3)",
                background: "none", border: "none",
                cursor: "pointer", padding: 0,
                transition: "color 0.15s",
              }}
            >
              Eliminar workspace…
            </button>
          ) : (
            <div style={{
              padding: "12px 14px", borderRadius: 8,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
            }}>
              <p style={{ fontSize: 12, color: "#fca5a5", margin: "0 0 10px 0" }}>
                ¿Eliminar «{workspace?.name}»? Esta acción no se puede deshacer.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    flex: 1, fontSize: 11, padding: "5px 0",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid var(--border2)",
                    borderRadius: 6, cursor: "pointer",
                    color: "var(--text3)",
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={onDelete}
                  disabled={deleteIsPending}
                  style={{
                    flex: 1, fontSize: 11, padding: "5px 0",
                    background: "#ef4444", color: "#fff",
                    border: "none", borderRadius: 6,
                    cursor: deleteIsPending ? "default" : "pointer",
                    fontWeight: 600,
                    opacity: deleteIsPending ? 0.6 : 1,
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botones */}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <div style={{ flex: 1 }} />
        <button
          onClick={onClose}
          style={{
            padding: "7px 16px", borderRadius: 8,
            background: "transparent",
            border: "1px solid var(--border2)",
            color: "var(--text3)", fontSize: 12, cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        {/* Configurar URLs — solo para layouts estáticos */}
        {!isDynamic && (
          <button
            onClick={onConfigureUrls}
            style={{
              padding: "7px 14px", borderRadius: 8,
              background: "transparent",
              border: "1px solid rgba(124,106,247,0.4)",
              color: "var(--accent2)", fontSize: 12, cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(124,106,247,0.08)";
              e.currentTarget.style.borderColor = "rgba(124,106,247,0.6)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(124,106,247,0.4)";
            }}
          >
            Configurar URLs →
          </button>
        )}
        <button
          onClick={onCreate}
          disabled={!name.trim() || isPending}
          style={{
            padding: "7px 16px", borderRadius: 8,
            background: !name.trim() ? "var(--border2)" : "var(--accent)",
            border: "none",
            color: "#fff", fontSize: 12, fontWeight: 600,
            cursor: (!name.trim() || isPending) ? "default" : "pointer",
            transition: "all 0.15s",
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isEditing ? "Guardar" : "Crear"}
        </button>
      </div>
    </div>
  );
}

// --- PanelConfigView (vista avanzada de URLs — ex StepPanels) ---

interface PanelConfigViewProps {
  slots: Slot[];
  onUpdateSlot: (i: number, patch: Partial<Slot>) => void;
  onSave: () => void;
  onBack: () => void;
  onClose: () => void;
  isPending: boolean;
  isEditing: boolean;
  isDynamic: boolean;
}

function PanelConfigView({
  slots, onUpdateSlot, onSave, onBack, onClose, isPending, isEditing, isDynamic,
}: PanelConfigViewProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Back link */}
      <button
        onClick={onBack}
        style={{
          alignSelf: "flex-start",
          marginBottom: 16,
          fontSize: 11, color: "var(--text3)",
          background: "none", border: "none",
          cursor: "pointer", padding: 0,
          transition: "color 0.15s",
          display: "flex", alignItems: "center", gap: 4,
        }}
        onMouseEnter={e => e.currentTarget.style.color = "var(--accent2)"}
        onMouseLeave={e => e.currentTarget.style.color = "var(--text3)"}
      >
        ← Configuración básica
      </button>

      {isDynamic ? (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 12,
          padding: "16px",
          background: "rgba(124,106,247,0.06)",
          border: "1px solid rgba(124,106,247,0.2)",
          borderRadius: 10,
          marginBottom: 16,
        }}>
          <span style={{ fontSize: 20 }}>🆓</span>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
              Layout libre
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text3)" }}>
              Añade paneles directamente desde el canvas usando el botón + en cada columna.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ maxHeight: "50vh", overflowY: "auto", paddingRight: 2 }}>
          {slots.map((slot, i) => (
            <SlotCard key={slot.id ?? i} slot={slot} index={i} onUpdateSlot={onUpdateSlot} />
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <div style={{ flex: 1 }} />
        <button
          onClick={onClose}
          style={{
            padding: "7px 16px", borderRadius: 8,
            background: "transparent",
            border: "1px solid var(--border2)",
            color: "var(--text3)", fontSize: 12, cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={isPending}
          style={{
            padding: "7px 16px", borderRadius: 8,
            background: "var(--accent)", border: "none",
            color: "#fff", fontSize: 12, fontWeight: 600,
            cursor: isPending ? "default" : "pointer",
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isEditing ? "Guardar cambios" : "Crear workspace"}
        </button>
      </div>
    </div>
  );
}

// --- SlotCard ---

interface SlotCardProps {
  slot: Slot;
  index: number;
  onUpdateSlot: (i: number, patch: Partial<Slot>) => void;
}

function SlotCard({ slot, index: i, onUpdateSlot }: SlotCardProps) {
  return (
    <div style={{
      borderRadius: 10,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      overflow: "hidden",
      marginBottom: 8,
    }}>
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        borderBottom: "1px solid var(--border)",
        background: "rgba(255,255,255,0.02)",
      }}>
        <span style={{
          fontSize: 10, fontFamily: "'Geist Mono', monospace",
          color: "var(--text3)", letterSpacing: "0.06em",
        }}>
          PANEL {i + 1}
        </span>
        <div style={{
          display: "flex",
          background: "var(--base-deep)",
          borderRadius: 6, padding: 2,
          border: "1px solid var(--border)",
        }}>
          {(["WEB", "WIDGET"] as const).map(t => (
            <button
              key={t}
              onClick={() => onUpdateSlot(i, { type: t })}
              style={{
                padding: "2px 10px", borderRadius: 4,
                background: slot.type === t ? "var(--accent)" : "transparent",
                border: "none",
                color: slot.type === t ? "#fff" : "var(--text3)",
                fontSize: 10, fontWeight: 600,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "10px 12px" }}>
        {slot.type === "WEB" ? (
          <>
            <input
              value={slot.url}
              onChange={e => onUpdateSlot(i, { url: e.target.value })}
              placeholder="https://"
              style={{
                width: "100%",
                background: "var(--base-deep)",
                border: "1px solid var(--border2)",
                borderRadius: 6, padding: "6px 10px",
                fontSize: 11, color: "var(--text)",
                outline: "none",
                fontFamily: "'Geist Mono', monospace",
                boxSizing: "border-box",
              }}
              onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--border2)"}
            />
            <details style={{ marginTop: 8 }}>
              <summary style={{
                fontSize: 10, cursor: "pointer",
                color: "var(--text3)", userSelect: "none",
              }}>
                Widget overlay (opcional)
              </summary>
              <div style={{ marginTop: 8, paddingLeft: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                <select
                  value={slot.overlay_widget_id}
                  onChange={e => onUpdateSlot(i, { overlay_widget_id: e.target.value as WidgetId | "" })}
                  style={{
                    width: "100%", borderRadius: 4,
                    fontSize: 11, padding: "4px 8px",
                    background: "var(--base-deep)",
                    border: "1px solid var(--border2)",
                    color: "var(--text)",
                  }}
                >
                  <option value="">Sin widget</option>
                  <option value="next-meeting">Próxima reunión</option>
                  <option value="scratchpad">Notas rápidas</option>
                  <option value="weather">Clima</option>
                </select>
                {slot.overlay_widget_id && (
                  <>
                    <div style={{ display: "flex", gap: 6 }}>
                      {(["top", "bottom"] as const).map(pos => (
                        <button
                          key={pos}
                          onClick={() => onUpdateSlot(i, { overlay_position: pos })}
                          style={{
                            flex: 1, fontSize: 10, padding: "3px 0",
                            borderRadius: 4,
                            background: slot.overlay_position === pos
                              ? "rgba(124,106,247,0.2)" : "rgba(255,255,255,0.04)",
                            border: slot.overlay_position === pos
                              ? "1px solid rgba(124,106,247,0.4)" : "1px solid var(--border)",
                            color: slot.overlay_position === pos ? "var(--accent)" : "var(--text3)",
                            cursor: "pointer",
                          }}
                        >
                          {pos === "top" ? "▲ Arriba" : "▼ Abajo"}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: "var(--text3)" }}>Altura:</span>
                      <input
                        type="range" min={10} max={40} step={1}
                        value={slot.overlay_height_pct}
                        onChange={e => onUpdateSlot(i, { overlay_height_pct: Number(e.target.value) })}
                        style={{ flex: 1 }}
                      />
                      <span style={{
                        fontSize: 10, fontFamily: "'Geist Mono', monospace",
                        width: 28, textAlign: "right", color: "var(--accent)",
                      }}>
                        {slot.overlay_height_pct}%
                      </span>
                    </div>
                  </>
                )}
              </div>
            </details>
          </>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
            {WIDGET_GRID.map(w => (
              <button
                key={w.id}
                onClick={() => onUpdateSlot(i, { widget_id: w.id })}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", borderRadius: 8,
                  background: slot.widget_id === w.id
                    ? "rgba(124,106,247,0.12)" : "rgba(255,255,255,0.03)",
                  border: slot.widget_id === w.id
                    ? "1px solid rgba(124,106,247,0.4)" : "1px solid var(--border)",
                  color: slot.widget_id === w.id ? "var(--text)" : "var(--text3)",
                  fontSize: 11, cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 16 }}>{w.icon}</span>
                <span style={{ fontWeight: slot.widget_id === w.id ? 600 : 400 }}>{w.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
