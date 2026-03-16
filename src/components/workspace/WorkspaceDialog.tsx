import { useState, useEffect } from "react";
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

const EMOJI_OPTIONS = ["💼", "📊", "🎮", "⚙️", "🎯", "📚", "🚀", "🎨", "📰", "🎵", "🏠", "📝", "💡", "📈", "🔥"];

const WIDGET_GRID: { id: WidgetId | ""; label: string; icon: string }[] = [
  { id: "scratchpad",   label: "Notas",    icon: "📝" },
  { id: "next-meeting", label: "Reunión",  icon: "📅" },
  { id: "weather",      label: "Clima",    icon: "🌤" },
  { id: "",             label: "Sin widget", icon: "✕" },
];

const LAYOUT_OPTIONS = [
  {
    value: "1col" as LayoutType,
    label: "Simple",
    description: "1 panel",
    slotCount: 1,
    preview: (active: boolean) => (
      <svg width="44" height="30" viewBox="0 0 44 30">
        <rect x="2" y="2" width="40" height="26" rx="3"
          fill={active ? "rgba(124,106,247,0.3)" : "rgba(255,255,255,0.06)"}
          stroke={active ? "rgba(124,106,247,0.6)" : "rgba(255,255,255,0.1)"}
          strokeWidth="1"
        />
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

// --- ActionButtons (componente compartido) ---

interface ActionButtonsProps {
  onBack?: () => void;
  onCancel: () => void;
  onPrimary: () => void;
  primaryLabel: string;
  primaryDisabled?: boolean;
  isPending?: boolean;
  showArrow?: boolean;
}

function ActionButtons({ onBack, onCancel, onPrimary, primaryLabel, primaryDisabled, isPending, showArrow }: ActionButtonsProps) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            padding: "7px 14px", borderRadius: 8,
            background: "transparent",
            border: "1px solid var(--border2)",
            color: "var(--text3)", fontSize: 12, cursor: "pointer",
          }}
        >
          ← Atrás
        </button>
      )}
      <div style={{ flex: 1 }} />
      <button
        onClick={onCancel}
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
        onClick={onPrimary}
        disabled={primaryDisabled || isPending}
        style={{
          padding: "7px 16px", borderRadius: 8,
          background: primaryDisabled ? "var(--border2)" : "var(--accent)",
          border: "none",
          color: "#fff", fontSize: 12, fontWeight: 600,
          cursor: (primaryDisabled || isPending) ? "default" : "pointer",
          transition: "all 0.15s",
          display: "flex", alignItems: "center", gap: 6,
          opacity: isPending ? 0.6 : 1,
        }}
      >
        {primaryLabel}
        {showArrow && <span style={{ fontSize: 14 }}>→</span>}
      </button>
    </div>
  );
}

// --- WorkspaceDialog ---

export function WorkspaceDialog({ open, workspace, startAtPanels, onClose }: Props) {
  const isEditing = !!workspace;

  const [step, setStep] = useState<"info" | "panels">("info");
  const [stepDirection, setStepDirection] = useState<"forward" | "back">("forward");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");
  const [layout, setLayout] = useState<LayoutType>("2col");
  const [slots, setSlots] = useState<Slot[]>(defaultSlots(2));
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    const initialLayout = workspace?.layout ?? "2col";
    setStep(startAtPanels ? "panels" : "info");
    setStepDirection("forward");
    setName(workspace?.name ?? "");
    setIcon(workspace?.icon ?? "📁");
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

  function handleLayoutChange(newLayout: LayoutType) {
    const opt = LAYOUT_OPTIONS.find(l => l.value === newLayout)!;
    setLayout(newLayout);
    if (!isEditing) {
      setSlots(defaultSlots(opt.slotCount));
    } else {
      // En edición: adaptar slots al nuevo conteo sin perder los existentes
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

  function updateSlot(i: number, patch: Partial<Slot>) {
    setSlots(prev => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  async function handleNextStep() {
    if (!name.trim()) return;
    if (layout === "dynamic") {
      await handleSaveDynamic();
      return;
    }
    if (isEditing) {
      await updateWorkspaceMutation.mutateAsync({
        id: workspace!.id,
        name: name.trim(),
        icon,
        layout,
      });
    }
    setStepDirection("forward");
    setStep("panels");
  }

  async function handleSaveDynamic() {
    const newId = isEditing ? workspace!.id : `ws-${Date.now()}`;
    if (isEditing) {
      await updateWorkspaceMutation.mutateAsync({ id: newId, name: name.trim(), icon, layout });
    } else {
      await createWorkspaceMutation.mutateAsync({ id: newId, name: name.trim(), layout, icon });
    }
    const initialDynLayout: DynamicLayout = { columns: [{ width_frac: 1, panels: [] }] };
    await saveDynamicLayout(newId, initialDynLayout);
    if (!isEditing) setActiveWorkspace(newId);
    handleClose();
  }

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

    // Destruir WebViews y eliminar de DB los paneles que ya no están en el nuevo layout
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
      // Forzar re-fetch para que React no muestre paneles fantasma
      await queryClient.invalidateQueries({ queryKey: ["panels", wsId] });
    }

    // Actualizar workspace con el nuevo layout
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
    setStep("info");
    setStepDirection("forward");
    setName("");
    setIcon("📁");
    setLayout("2col");
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

  // Step pills — solo mostrar step 2 si el layout no es dynamic
  const steps = isDynamic
    ? [{ key: "info", label: "Info" }]
    : [{ key: "info", label: "Info" }, { key: "panels", label: "Paneles" }];

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
        {/* Header del modal */}
        <div style={{
          padding: "20px 24px 16px",
          display: "flex", alignItems: "center",
          borderBottom: "1px solid var(--border)",
          position: "relative",
        }}>
          {/* Step pills centrados */}
          <div style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)",
            display: "flex", alignItems: "center", gap: 0,
          }}>
            {steps.map((s, i) => {
              const isDone = steps.indexOf({ key: step, label: "" } as typeof steps[0]) === -1
                ? step === "panels" && s.key === "info"
                : false;
              const isActive = step === s.key;
              const isCompleted = !isActive && step === "panels" && s.key === "info";
              return (
                <div key={s.key} style={{ display: "flex", alignItems: "center" }}>
                  {i > 0 && (
                    <div style={{
                      width: 32, height: 1,
                      background: isCompleted ? "var(--accent)" : "var(--border)",
                      transition: "background 0.3s",
                    }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700,
                      background: isCompleted
                        ? "var(--accent)"
                        : isActive
                          ? "rgba(124,106,247,0.15)"
                          : "var(--border)",
                      border: isActive
                        ? "1.5px solid var(--accent)"
                        : isCompleted
                          ? "1.5px solid var(--accent)"
                          : "1.5px solid var(--border2)",
                      color: isCompleted || isActive ? "var(--accent2)" : "var(--text3)",
                      transition: "all 0.3s",
                    }}>
                      {isCompleted ? "✓" : i + 1}
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 600, letterSpacing: "0.06em",
                      color: isActive ? "var(--text)" : "var(--text3)",
                      textTransform: "uppercase",
                      transition: "color 0.3s",
                    }}>
                      {s.label}
                    </span>
                  </div>
                </div>
              );
              void isDone;
            })}
          </div>

          {/* Título izquierda */}
          <span style={{ fontSize: 12, color: "var(--text3)" }}>
            {isEditing ? "Editar workspace" : "Nuevo workspace"}
          </span>

          {/* Cerrar derecha */}
          <button
            onClick={handleClose}
            style={{
              marginLeft: "auto",
              width: 24, height: 24,
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 6,
              background: "transparent",
              border: "none",
              color: "var(--text3)",
              fontSize: 14,
              cursor: "pointer",
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
          <div key={step} className={stepDirection === "forward" ? "step-enter-right" : "step-enter-left"}>
            {step === "info" ? (
              <StepInfo
                name={name} setName={setName}
                icon={icon} setIcon={setIcon}
                layout={layout} onLayoutChange={handleLayoutChange}
                onNext={handleNextStep}
                onClose={handleClose}
                isPending={isPending || updateWorkspaceMutation.isPending}
                isEditing={isEditing}
                isDynamic={isDynamic}
                workspace={workspace ?? null}
                confirmDelete={confirmDelete}
                setConfirmDelete={setConfirmDelete}
                onDelete={handleDelete}
                deleteIsPending={deleteWorkspaceMutation.isPending}
              />
            ) : (
              <StepPanels
                slots={slots}
                onUpdateSlot={updateSlot}
                onSave={handleSave}
                onBack={() => {
                  setStepDirection("back");
                  setStep("info");
                }}
                onClose={handleClose}
                isPending={isPending}
                isEditing={isEditing}
                startAtPanels={!!startAtPanels}
                isDynamic={isDynamic}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- StepInfo ---

interface StepInfoProps {
  name: string;
  setName: (v: string) => void;
  icon: string;
  setIcon: (v: string) => void;
  layout: LayoutType;
  onLayoutChange: (l: LayoutType) => void;
  onNext: () => void;
  onClose: () => void;
  isPending: boolean;
  isEditing: boolean;
  isDynamic: boolean;
  workspace: Workspace | null;
  confirmDelete: boolean;
  setConfirmDelete: (v: boolean) => void;
  onDelete: () => void;
  deleteIsPending: boolean;
}

function StepInfo({
  name, setName, icon, setIcon, layout, onLayoutChange,
  onNext, onClose, isPending, isEditing, isDynamic, workspace,
  confirmDelete, setConfirmDelete, onDelete, deleteIsPending,
}: StepInfoProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Selector de icono — grid 5 cols */}
      <div>
        <label style={{
          display: "block", marginBottom: 8,
          fontSize: 10, fontWeight: 700,
          color: "var(--text3)", letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}>
          Icono
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
          {EMOJI_OPTIONS.map(e => (
            <button
              key={e}
              onClick={() => setIcon(e)}
              style={{
                height: 36,
                fontSize: 18,
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 8,
                background: icon === e ? "rgba(124,106,247,0.15)" : "rgba(255,255,255,0.04)",
                border: icon === e ? "1px solid rgba(124,106,247,0.5)" : "1px solid var(--border)",
                cursor: "pointer",
                transform: icon === e ? "scale(1.1)" : "scale(1)",
                transition: "all 0.15s",
              }}
            >
              {e}
            </button>
          ))}
          <input
            type="text"
            value={!EMOJI_OPTIONS.includes(icon) ? icon : ""}
            onChange={e => setIcon(e.target.value)}
            placeholder="✏️"
            style={{
              height: 36,
              fontSize: 18, textAlign: "center",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Nombre con hint "Enter ↵" */}
      <div>
        <label style={{
          display: "block", marginBottom: 8,
          fontSize: 10, fontWeight: 700,
          color: "var(--text3)", letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}>
          Nombre
        </label>
        <div style={{ position: "relative" }}>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && name.trim() && onNext()}
            placeholder="Mi workspace"
            style={{
              width: "100%",
              background: "var(--surface)",
              border: "1px solid var(--border2)",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 13,
              color: "var(--text)",
              outline: "none",
              transition: "border-color 0.15s",
              boxSizing: "border-box",
            }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--border2)"}
          />
          <span style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            fontSize: 9, color: "var(--text4)", pointerEvents: "none",
            opacity: name.trim() ? 1 : 0, transition: "opacity 0.15s",
            fontFamily: "'Geist Mono', monospace",
          }}>
            Enter ↵
          </span>
        </div>
      </div>

      {/* Selector de layout — grid 5 cols */}
      <div>
        <label style={{
          display: "block", marginBottom: 8,
          fontSize: 10, fontWeight: 700,
          color: "var(--text3)", letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}>
          Layout
        </label>
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

      {/* Zona de peligro — solo en modo edición */}
      {isEditing && (
        <div style={{ marginTop: 4, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
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
              <p style={{
                fontSize: 12, color: "#fca5a5",
                margin: "0 0 10px 0",
              }}>
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

      <ActionButtons
        onCancel={onClose}
        onPrimary={onNext}
        primaryLabel={isDynamic ? (isEditing ? "Guardar" : "Crear workspace") : "Configurar paneles"}
        primaryDisabled={!name.trim()}
        isPending={isPending}
        showArrow={!isDynamic}
      />
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
      {/* Header del slot */}
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
        {/* Toggle WEB / WIDGET */}
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

      {/* Body del slot */}
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
          // Widget selector — grid 2×2
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

// --- StepPanels ---

interface StepPanelsProps {
  slots: Slot[];
  onUpdateSlot: (i: number, patch: Partial<Slot>) => void;
  onSave: () => void;
  onBack: () => void;
  onClose: () => void;
  isPending: boolean;
  isEditing: boolean;
  startAtPanels: boolean;
  isDynamic: boolean;
}

function StepPanels({
  slots, onUpdateSlot, onSave, onBack, onClose, isPending, isEditing, startAtPanels, isDynamic,
}: StepPanelsProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {isDynamic ? (
        // Mensaje especial para layout libre
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

      <ActionButtons
        onBack={!startAtPanels ? onBack : undefined}
        onCancel={onClose}
        onPrimary={onSave}
        primaryLabel={isEditing ? "Guardar cambios" : "Crear workspace"}
        isPending={isPending}
      />
    </div>
  );
}
