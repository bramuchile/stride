import { useState } from "react";
import { useCreateWorkspace } from "@/hooks/useWorkspaces";
import { useCreatePanel } from "@/hooks/usePanels";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { getDb, saveDynamicLayout } from "@/lib/db";
import { instantiateTemplate } from "@/lib/layoutTemplates";
import { ICON_OPTIONS, LAYOUT_OPTIONS } from "@/lib/workspaceConstants";
import type { LayoutTemplate } from "@/types";

interface OnboardingFlowProps {
  onComplete: () => void;
}

const NAME_CHIPS = ["Work", "Personal", "Design", "Dev", "Research"];

function StepDots({ current }: { current: number }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 24 }}>
      {[0, 1].map((i) => (
        <div
          key={i}
          style={{
            width: 6, height: 6, borderRadius: "50%",
            background: i === current ? "var(--accent)" : "var(--border2)",
            transition: "background 0.2s",
          }}
        />
      ))}
    </div>
  );
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [wsName, setWsName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("Monitor");
  const [selectedTemplate, setSelectedTemplate] = useState<LayoutTemplate>("free");
  const [loading, setLoading] = useState(false);

  const createWorkspaceMutation = useCreateWorkspace();
  const createPanel = useCreatePanel();
  const { setActiveWorkspace } = useWorkspaceStore();

  async function handleComplete() {
    if (!wsName.trim()) return;
    setLoading(true);
    try {
      const db = await getDb();
      const newId = `ws-${Date.now()}`;

      await createWorkspaceMutation.mutateAsync({
        id: newId,
        name: wsName.trim(),
        layout: "dynamic",
        icon: selectedIcon,
      });

      const dynLayout = instantiateTemplate(selectedTemplate);
      const allPanelIds = dynLayout.columns.flatMap((col) => col.panels.map((p) => p.panel_id));

      for (let i = 0; i < allPanelIds.length; i++) {
        await createPanel.mutateAsync({
          id: allPanelIds[i],
          workspace_id: newId,
          type: "WEB",
          url: undefined,
          widget_id: undefined,
          position: i,
        });
      }

      await saveDynamicLayout(newId, dynLayout);
      await db.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)",
        ["onboarding_v1", "done"]
      );
      setActiveWorkspace(newId);
      onComplete();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "var(--base-deep)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <style>{`
        @keyframes onb-fade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        key={step}
        style={{
          width: "100%", maxWidth: 480,
          padding: "40px 32px",
          animation: "onb-fade 0.35s ease forwards",
          display: "flex", flexDirection: "column",
          alignItems: step === 0 ? "center" : "flex-start",
          textAlign: step === 0 ? "center" : "left",
        }}
      >

        {/* ── Step 0: Bienvenida ── */}
        {step === 0 && (
          <>
            <div style={{
              width: 64, height: 64,
              background: "var(--surface)",
              borderRadius: 16,
              border: "1px solid rgba(124,106,247,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <circle cx="18" cy="18" r="14" stroke="#7C6AF7" strokeWidth="1.5" fill="none" opacity="0.35"/>
                <circle cx="18" cy="18" r="8.5" stroke="#7C6AF7" strokeWidth="1.5" fill="none" opacity="0.6"/>
                <circle cx="18" cy="18" r="3.5" fill="#7C6AF7"/>
              </svg>
            </div>

            <div style={{ fontSize: 24, fontWeight: 500, color: "var(--text)" }}>
              Bienvenido a Stride
            </div>
            <div style={{ fontSize: 14, color: "var(--text3)", marginTop: 8 }}>
              Tu espacio de trabajo, sin límites.
            </div>

            <button
              onClick={() => setStep(1)}
              style={{
                marginTop: 32,
                background: "var(--accent)", color: "#fff",
                padding: "10px 32px", borderRadius: 8,
                fontSize: 13, fontWeight: 500,
                border: "none", cursor: "pointer",
              }}
            >
              Comenzar
            </button>
          </>
        )}

        {/* ── Step 1: Nombre e icono ── */}
        {step === 1 && (
          <>
            <StepDots current={0} />

            <div style={{ fontSize: 18, fontWeight: 500, color: "var(--text)", width: "100%" }}>
              ¿Cómo lo llamas?
            </div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 6, marginBottom: 20 }}>
              Dale un nombre a tu primer workspace.
            </div>

            {/* Input nombre */}
            <input
              value={wsName}
              onChange={(e) => setWsName(e.target.value)}
              placeholder="Mi espacio de trabajo"
              maxLength={32}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              style={{
                width: "100%", maxWidth: 320, boxSizing: "border-box",
                background: "var(--surface)",
                border: "1px solid var(--border2)",
                borderRadius: 8, padding: "10px 14px",
                fontSize: 14, color: "var(--text)", outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border2)"; }}
              onKeyDown={(e) => { if (e.key === "Enter" && wsName.trim()) setStep(2); }}
            />

            {/* Chips de nombre rápido */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, maxWidth: 320 }}>
              {NAME_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => setWsName(chip)}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 20, fontSize: 12,
                    color: "var(--text3)", padding: "5px 12px",
                    cursor: "pointer", transition: "border-color 0.15s, color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(124,106,247,0.4)";
                    e.currentTarget.style.color = "var(--accent2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--text3)";
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Selector de icono */}
            <div style={{ marginTop: 20, width: "100%" }}>
              <label style={{
                display: "block", marginBottom: 8,
                fontSize: 10, fontWeight: 700,
                color: "var(--text3)", letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}>
                Icono
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, maxWidth: 320 }}>
                {ICON_OPTIONS.map(({ name: iconName, Icon }) => {
                  const isSelected = selectedIcon === iconName;
                  return (
                    <button
                      key={iconName}
                      onClick={() => setSelectedIcon(iconName)}
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
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = "rgba(124,106,247,0.1)";
                          e.currentTarget.style.color = "var(--accent2)";
                        }
                      }}
                      onMouseLeave={(e) => {
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

            {/* Botones */}
            <div style={{ display: "flex", gap: 8, marginTop: 28 }}>
              <button
                onClick={() => setStep(0)}
                style={{
                  padding: "8px 20px", borderRadius: 8,
                  background: "transparent",
                  border: "1px solid var(--border2)",
                  color: "var(--text3)", fontSize: 12, cursor: "pointer",
                }}
              >
                Atrás
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!wsName.trim()}
                style={{
                  padding: "8px 20px", borderRadius: 8,
                  background: wsName.trim() ? "var(--accent)" : "var(--border2)",
                  border: "none",
                  color: "#fff", fontSize: 12, fontWeight: 600,
                  cursor: wsName.trim() ? "pointer" : "default",
                  transition: "background 0.15s",
                }}
              >
                Siguiente
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: Layout ── */}
        {step === 2 && (
          <>
            <StepDots current={1} />

            <div style={{ fontSize: 18, fontWeight: 500, color: "var(--text)", width: "100%" }}>
              Elige tu layout
            </div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 6, marginBottom: 20 }}>
              Define cómo se organiza tu espacio.
            </div>

            {/* Grid 2×2 de layouts */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
              gap: 8, maxWidth: 360, width: "100%",
            }}>
              {LAYOUT_OPTIONS.map((opt) => {
                const isActive = selectedTemplate === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedTemplate(opt.value)}
                    style={{
                      position: "relative",
                      display: "flex", flexDirection: "column",
                      alignItems: "center", gap: 6,
                      padding: "10px 6px",
                      borderRadius: 10,
                      background: isActive ? "rgba(124,106,247,0.1)" : "rgba(255,255,255,0.03)",
                      border: isActive
                        ? "1px solid rgba(124,106,247,0.4)"
                        : "1px solid var(--border)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      transform: isActive ? "translateY(-1px)" : "none",
                      boxShadow: isActive ? "0 4px 12px rgba(124,106,247,0.2)" : "none",
                    }}
                  >
                    {opt.value === "free" && (
                      <span style={{
                        position: "absolute", top: -8, right: -6,
                        background: "var(--accent)", color: "#fff",
                        fontSize: 9, padding: "2px 7px",
                        borderRadius: 20,
                      }}>
                        Recomendado
                      </span>
                    )}
                    {opt.preview(isActive)}
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      color: isActive ? "var(--accent)" : "var(--text2)",
                    }}>
                      {opt.label}
                    </span>
                    <span style={{ fontSize: 9, color: "var(--text3)", textAlign: "center" }}>
                      {opt.description}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Botones */}
            <div style={{ display: "flex", gap: 8, marginTop: 28 }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  padding: "8px 20px", borderRadius: 8,
                  background: "transparent",
                  border: "1px solid var(--border2)",
                  color: "var(--text3)", fontSize: 12, cursor: "pointer",
                }}
              >
                Atrás
              </button>
              <button
                onClick={handleComplete}
                disabled={loading}
                style={{
                  padding: "8px 20px", borderRadius: 8,
                  background: "var(--accent)",
                  border: "none",
                  color: "#fff", fontSize: 12, fontWeight: 600,
                  cursor: loading ? "default" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {loading ? "Creando…" : "Entrar a Stride"}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
