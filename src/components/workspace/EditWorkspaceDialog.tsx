import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUpdateWorkspace } from "@/hooks/useWorkspaces";
import { useUpdatePanel } from "@/hooks/usePanels";
import { usePanels } from "@/hooks/usePanels";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { SIDEBAR_WIDTH, HEADER_HEIGHT } from "@/hooks/useWebviews";
import type { Panel, Workspace, WidgetId } from "@/types";

const EMOJI_OPTIONS = ["💼", "📊", "🎮", "⚙️", "🎯", "📚", "🚀", "🎨", "📰", "🎵"];

const WIDGET_OPTIONS: { value: WidgetId | ""; label: string }[] = [
  { value: "",              label: "Sin widget" },
  { value: "next-meeting",  label: "Próxima reunión" },
  { value: "scratchpad",    label: "Notas rápidas" },
  { value: "weather",       label: "Clima" },
];

interface SlotState {
  id: string;
  type: "WEB" | "WIDGET";
  url: string;
  widget_id: WidgetId | "";
  overlay_widget_id: WidgetId | "";
  overlay_position: "top" | "bottom";
  overlay_height_pct: number;
  workspace_id: string;
  position: number;
}

function panelToSlot(p: Panel): SlotState {
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

interface Props {
  workspace: Workspace | null;
  /** Si true, abre directamente en el paso de paneles (desde divider long-press) */
  startAtPanels?: boolean;
  onClose: () => void;
}

export function EditWorkspaceDialog({ workspace, startAtPanels = false, onClose }: Props) {
  const open = !!workspace;
  const [step, setStep] = useState<"info" | "panels">(startAtPanels ? "panels" : "info");
  const [name, setName] = useState(workspace?.name ?? "");
  const [icon, setIcon] = useState(workspace?.icon ?? "📁");
  const [slots, setSlots] = useState<SlotState[]>([]);

  const { data: panels = [] } = usePanels(workspace?.id ?? null);
  const updateWorkspace = useUpdateWorkspace();
  const updatePanel = useUpdatePanel();
  const { webviewMap } = useWorkspaceStore();

  // Sync state when workspace or panels change
  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setIcon(workspace.icon ?? "📁");
      setStep(startAtPanels ? "panels" : "info");
    }
  }, [workspace, startAtPanels]);

  useEffect(() => {
    if (panels.length > 0) {
      setSlots(panels.map(panelToSlot));
    }
  }, [panels]);

  function updateSlot(i: number, patch: Partial<SlotState>) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  async function handleSaveInfo() {
    if (!workspace || !name.trim()) return;
    await updateWorkspace.mutateAsync({ id: workspace.id, name: name.trim(), icon });
    setStep("panels");
  }

  async function handleSavePanels() {
    if (!workspace) return;

    for (const slot of slots) {
      const panel: Panel = {
        id: slot.id,
        workspace_id: slot.workspace_id,
        type: slot.type,
        url: slot.type === "WEB" ? (slot.url || undefined) : undefined,
        widget_id: slot.type === "WIDGET" && slot.widget_id ? slot.widget_id : undefined,
        position: slot.position,
        overlay_widget_id:
          slot.type === "WEB" && slot.overlay_widget_id ? slot.overlay_widget_id : undefined,
        overlay_position:
          slot.type === "WEB" && slot.overlay_widget_id ? slot.overlay_position : undefined,
        overlay_height_pct:
          slot.type === "WEB" && slot.overlay_widget_id ? slot.overlay_height_pct : undefined,
      };
      await updatePanel.mutateAsync(panel);
    }

    // Reposicionar WebViews activos para reflejar los nuevos overlays
    const webPanels = slots.filter((s) => s.type === "WEB" && webviewMap[s.id]);
    if (webPanels.length > 0) {
      await invoke("resize_panel_webviews", {
        panels: webPanels.map((s) => ({
          panel_id: s.id,
          position: s.position,
          overlay_position: s.overlay_position && s.overlay_widget_id ? s.overlay_position : null,
          overlay_height_pct: s.overlay_widget_id ? s.overlay_height_pct : null,
        })),
        layout: workspace.layout,
        sidebarWidth: SIDEBAR_WIDTH,
        headerHeight: HEADER_HEIGHT,
      }).catch(console.error);
    }

    handleClose();
  }

  function handleClose() {
    setStep("info");
    onClose();
  }

  if (!workspace) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg" style={{ background: "#1c1e21", border: "1px solid #2a2d31", color: "#e2e4e8" }}>
        {step === "info" ? (
          <>
            <DialogHeader>
              <DialogTitle style={{ color: "#e2e4e8" }}>Editar workspace</DialogTitle>
            </DialogHeader>

            {/* Emoji picker */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6b7280" }}>Icono</label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setIcon(e)}
                    className="text-xl flex items-center justify-center rounded-lg transition-colors"
                    style={{
                      width: "36px", height: "36px",
                      background: icon === e ? "rgba(91,124,246,0.2)" : "rgba(255,255,255,0.04)",
                      border: icon === e ? "1px solid rgba(91,124,246,0.4)" : "1px solid #2a2d31",
                      cursor: "pointer",
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6b7280" }}>Nombre</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveInfo()}
                style={{ background: "#0e0f11", border: "1px solid #2a2d31", color: "#e2e4e8" }}
              />
            </div>

            {/* Layout — solo lectura (cambiar layout requiere reorganizar paneles, Fase 2) */}
            <p className="text-[10px]" style={{ color: "#6b7280" }}>
              Layout: <span style={{ color: "#9ca3af" }}>{workspace.layout}</span> · Para cambiar el layout crea un nuevo workspace.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={handleClose} style={{ color: "#6b7280" }}>Cancelar</Button>
              <Button
                onClick={handleSaveInfo}
                disabled={!name.trim() || updateWorkspace.isPending}
                style={{ background: "#5b7cf6", color: "#fff", border: "none" }}
              >
                Siguiente → Paneles
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle style={{ color: "#e2e4e8" }}>
                {icon} {name} — Configura los paneles
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {slots.map((slot, i) => (
                <div
                  key={slot.id}
                  className="rounded-lg p-3 space-y-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #2a2d31" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono" style={{ color: "#6b7280" }}>
                      Panel {i + 1}
                    </span>
                    <div className="flex rounded overflow-hidden" style={{ border: "1px solid #2a2d31" }}>
                      {(["WEB", "WIDGET"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => updateSlot(i, { type: t })}
                          className="text-[10px] font-semibold px-3 py-1 transition-colors"
                          style={{
                            background: slot.type === t ? "#5b7cf6" : "transparent",
                            color: slot.type === t ? "#fff" : "#6b7280",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {slot.type === "WEB" ? (
                    <>
                      <Input
                        value={slot.url}
                        onChange={(e) => updateSlot(i, { url: e.target.value })}
                        placeholder="https://example.com"
                        style={{ background: "#0e0f11", border: "1px solid #2a2d31", color: "#e2e4e8", fontSize: "12px" }}
                      />
                      <details>
                        <summary className="text-[10px] cursor-pointer select-none" style={{ color: "#6b7280" }}>
                          Widget overlay (opcional)
                        </summary>
                        <div className="mt-2 space-y-2 pl-2">
                          <select
                            value={slot.overlay_widget_id}
                            onChange={(e) => updateSlot(i, { overlay_widget_id: e.target.value as WidgetId | "" })}
                            className="w-full rounded text-[11px] px-2 py-1"
                            style={{ background: "#0e0f11", border: "1px solid #2a2d31", color: "#e2e4e8" }}
                          >
                            {WIDGET_OPTIONS.map((w) => (
                              <option key={w.value} value={w.value}>{w.label}</option>
                            ))}
                          </select>
                          {slot.overlay_widget_id && (
                            <>
                              <div className="flex gap-2">
                                {(["top", "bottom"] as const).map((pos) => (
                                  <button
                                    key={pos}
                                    onClick={() => updateSlot(i, { overlay_position: pos })}
                                    className="flex-1 text-[10px] py-1 rounded transition-colors"
                                    style={{
                                      background: slot.overlay_position === pos ? "rgba(91,124,246,0.2)" : "rgba(255,255,255,0.04)",
                                      border: slot.overlay_position === pos ? "1px solid rgba(91,124,246,0.4)" : "1px solid #2a2d31",
                                      color: slot.overlay_position === pos ? "#5b7cf6" : "#6b7280",
                                      cursor: "pointer",
                                    }}
                                  >
                                    {pos === "top" ? "▲ Arriba" : "▼ Abajo"}
                                  </button>
                                ))}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px]" style={{ color: "#6b7280" }}>Altura:</span>
                                <input
                                  type="range"
                                  min={10} max={40} step={1}
                                  value={slot.overlay_height_pct}
                                  onChange={(e) => updateSlot(i, { overlay_height_pct: Number(e.target.value) })}
                                  className="flex-1"
                                />
                                <span className="text-[10px] font-mono w-8 text-right" style={{ color: "#5b7cf6" }}>
                                  {slot.overlay_height_pct}%
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </details>
                    </>
                  ) : (
                    <select
                      value={slot.widget_id}
                      onChange={(e) => updateSlot(i, { widget_id: e.target.value as WidgetId | "" })}
                      className="w-full rounded text-[11px] px-2 py-1"
                      style={{ background: "#0e0f11", border: "1px solid #2a2d31", color: "#e2e4e8" }}
                    >
                      <option value="">Selecciona widget</option>
                      <option value="scratchpad">Notas rápidas</option>
                      <option value="next-meeting">Próxima reunión</option>
                      <option value="weather">Clima</option>
                    </select>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {!startAtPanels && (
                <Button variant="ghost" onClick={() => setStep("info")} style={{ color: "#6b7280" }}>← Atrás</Button>
              )}
              <Button variant="ghost" onClick={handleClose} style={{ color: "#6b7280" }}>Cancelar</Button>
              <Button
                onClick={handleSavePanels}
                disabled={updatePanel.isPending}
                style={{ background: "#5b7cf6", color: "#fff", border: "none" }}
              >
                Guardar cambios
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
