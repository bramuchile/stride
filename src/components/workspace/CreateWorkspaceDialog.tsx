import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateWorkspace } from "@/hooks/useWorkspaces";
import { useCreatePanel } from "@/hooks/usePanels";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { LayoutType, Panel, WidgetId } from "@/types";

const EMOJI_OPTIONS = ["💼", "📊", "🎮", "⚙️", "🎯", "📚", "🚀", "🎨", "📰", "🎵"];

const LAYOUT_OPTIONS: { value: LayoutType; label: string; icon: string; slots: number }[] = [
  { value: "2col", label: "2 Columnas", icon: "▐▌", slots: 2 },
  { value: "3col", label: "3 Columnas", icon: "▐║▌", slots: 3 },
  { value: "2x2",  label: "2×2 Grid",   icon: "▚▌", slots: 4 },
];

const WIDGET_OPTIONS: { value: WidgetId | ""; label: string }[] = [
  { value: "",              label: "Sin widget" },
  { value: "next-meeting",  label: "Próxima reunión" },
  { value: "scratchpad",    label: "Notas rápidas" },
];

interface SlotConfig {
  type: "WEB" | "WIDGET";
  url: string;
  widget_id: WidgetId | "";
  overlay_widget_id: WidgetId | "";
  overlay_position: "top" | "bottom";
  overlay_height_pct: number;
}

function defaultSlots(count: number): SlotConfig[] {
  return Array.from({ length: count }, () => ({
    type: "WEB",
    url: "",
    widget_id: "",
    overlay_widget_id: "",
    overlay_position: "top",
    overlay_height_pct: 20,
  }));
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateWorkspaceDialog({ open, onClose }: Props) {
  const [step, setStep] = useState<"create" | "configure">("create");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");
  const [layout, setLayout] = useState<LayoutType>("2col");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotConfig[]>(defaultSlots(2));

  const createWorkspace = useCreateWorkspace();
  const createPanel = useCreatePanel();
  const { setActiveWorkspace } = useWorkspaceStore();

  function handleLayoutChange(l: LayoutType, slotCount: number) {
    setLayout(l);
    setSlots(defaultSlots(slotCount));
  }

  function updateSlot(i: number, patch: Partial<SlotConfig>) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  async function handleCreate() {
    if (!name.trim()) return;
    const id = `ws-${Date.now()}`;
    await createWorkspace.mutateAsync({ id, name: name.trim(), layout, icon });
    setWorkspaceId(id);
    setStep("configure");
  }

  async function handleSave() {
    if (!workspaceId) return;

    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const panel: Panel = {
        id: `p-${workspaceId}-${i}`,
        workspace_id: workspaceId,
        type: s.type,
        url: s.type === "WEB" ? (s.url || undefined) : undefined,
        widget_id: s.type === "WIDGET" && s.widget_id ? s.widget_id : undefined,
        position: i,
        overlay_widget_id:
          s.type === "WEB" && s.overlay_widget_id ? s.overlay_widget_id : undefined,
        overlay_position:
          s.type === "WEB" && s.overlay_widget_id ? s.overlay_position : undefined,
        overlay_height_pct:
          s.type === "WEB" && s.overlay_widget_id ? s.overlay_height_pct : undefined,
      };
      await createPanel.mutateAsync(panel);
    }

    setActiveWorkspace(workspaceId);
    handleClose();
  }

  function handleClose() {
    setStep("create");
    setName("");
    setIcon("📁");
    setLayout("2col");
    setWorkspaceId(null);
    setSlots(defaultSlots(2));
    onClose();
  }

  const layoutOption = LAYOUT_OPTIONS.find((l) => l.value === layout)!;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg" style={{ background: "#1c1e21", border: "1px solid #2a2d31", color: "#e2e4e8" }}>
        {step === "create" ? (
          <>
            <DialogHeader>
              <DialogTitle style={{ color: "#e2e4e8" }}>Nuevo workspace</DialogTitle>
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
                <input
                  type="text"
                  value={!EMOJI_OPTIONS.includes(icon) ? icon : ""}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="✏️"
                  className="text-xl text-center rounded-lg"
                  style={{
                    width: "36px", height: "36px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid #2a2d31",
                    color: "#e2e4e8",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6b7280" }}>Nombre</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mi workspace"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                style={{ background: "#0e0f11", border: "1px solid #2a2d31", color: "#e2e4e8" }}
              />
            </div>

            {/* Layout */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6b7280" }}>Layout</label>
              <div className="flex gap-2">
                {LAYOUT_OPTIONS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => handleLayoutChange(l.value, l.slots)}
                    className="flex-1 flex flex-col items-center gap-1 rounded-lg py-3 transition-colors"
                    style={{
                      background: layout === l.value ? "rgba(91,124,246,0.15)" : "rgba(255,255,255,0.04)",
                      border: layout === l.value ? "1px solid rgba(91,124,246,0.4)" : "1px solid #2a2d31",
                      cursor: "pointer",
                      color: layout === l.value ? "#5b7cf6" : "#6b7280",
                    }}
                  >
                    <span className="font-mono text-lg">{l.icon}</span>
                    <span className="text-[10px] font-medium">{l.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={handleClose} style={{ color: "#6b7280" }}>Cancelar</Button>
              <Button
                onClick={handleCreate}
                disabled={!name.trim() || createWorkspace.isPending}
                style={{ background: "#5b7cf6", color: "#fff", border: "none" }}
              >
                Crear →
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
                  key={i}
                  className="rounded-lg p-3 space-y-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #2a2d31" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono" style={{ color: "#6b7280" }}>
                      Panel {i + 1} / {layoutOption.icon}
                    </span>
                    {/* Type toggle */}
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

                      {/* Overlay config */}
                      <details className="group">
                        <summary
                          className="text-[10px] cursor-pointer select-none"
                          style={{ color: "#6b7280" }}
                        >
                          Widget overlay (opcional)
                        </summary>
                        <div className="mt-2 space-y-2 pl-2">
                          {/* Widget picker */}
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
                              {/* Position */}
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

                              {/* Height */}
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
                    </select>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={handleClose} style={{ color: "#6b7280" }}>Cancelar</Button>
              <Button
                onClick={handleSave}
                disabled={createPanel.isPending}
                style={{ background: "#5b7cf6", color: "#fff", border: "none" }}
              >
                Guardar workspace
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
