import { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { createPortal } from "react-dom";
import { X, RotateCcw, Github, Info, Database, Palette, AlertTriangle } from "lucide-react";
import { getDb } from "@/lib/db";
import { seedIfNeeded } from "@/lib/seed";

interface Props {
  open: boolean;
  onClose: () => void;
}

async function resetDatabase(): Promise<void> {
  const db = await getDb();
  // Borrar en orden para respetar las dependencias
  await db.execute("DELETE FROM notes_history");
  await db.execute("DELETE FROM notes");
  await db.execute("DELETE FROM panels");
  await db.execute("DELETE FROM workspaces");
  await db.execute("DELETE FROM settings");
  // Sembrar antes del reload para que los datos estén disponibles inmediatamente
  await seedIfNeeded();
  window.location.reload();
}

// ── Sección genérica ──────────────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 7,
        marginBottom: 10,
        paddingBottom: 8,
        borderBottom: "1px solid var(--border)",
      }}>
        <span style={{ color: "var(--text3)", display: "flex" }}>{icon}</span>
        <span style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: 9, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.14em",
          color: "var(--text3)",
        }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

// ── Fila de opción deshabilitada ─────────────────────────────────────────────
function OptionRow({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 0",
      borderBottom: "1px solid rgba(46,43,62,0.4)",
      opacity: 0.5,
    }}>
      <span style={{ fontSize: 11, color: "var(--text2)", fontFamily: "'Instrument Sans', sans-serif" }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "'Geist Mono', monospace" }}>
          {value}
        </span>
        {badge && (
          <span style={{
            fontSize: 8, fontFamily: "'Geist Mono', monospace",
            color: "var(--accent2)",
            background: "var(--accent-dim)",
            border: "1px solid rgba(124,106,247,0.2)",
            borderRadius: 4, padding: "1px 5px",
            letterSpacing: "0.06em",
          }}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function SettingsDrawer({ open, onClose }: Props) {
  const [resetStep, setResetStep] = useState<"idle" | "confirm" | "loading">("idle");
  // mounted se activa solo cuando open=true por primera vez — evita render en el DOM al arrancar
  const [mounted, setMounted] = useState(false);
  const [appVersion, setAppVersion] = useState<string>("...");

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    getVersion().then(setAppVersion);
  }, []);

  function handleClose() {
    setResetStep("idle");
    onClose();
  }

  async function handleReset() {
    setResetStep("loading");
    try {
      await resetDatabase();
    } catch {
      setResetStep("idle");
    }
  }

  const iconStyle = { width: 12, height: 12 };

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop — cubre toda la ventana */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(8,7,15,0.55)",
          backdropFilter: "blur(2px)",
          zIndex: 9000,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.2s ease",
        }}
      />

      {/* Drawer — parte desde el borde izquierdo de la ventana */}
      <div
        style={{
          position: "fixed",
          left: 0, top: 0,
          width: 332,
          height: "100vh",
          zIndex: 9001,
          background: "var(--base-deep)",
          borderRight: "1px solid var(--border)",
          boxShadow: "4px 0 32px rgba(0,0,0,0.5), 1px 0 0 var(--border2)",
          display: "flex", flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.22s cubic-bezier(0.16,1,0.3,1)",
          overflow: "hidden",
        }}
      >
        {/* Línea degradada acento en el borde derecho */}
        <div style={{
          position: "absolute", top: 0, right: 0, bottom: 0, width: 1,
          background: "linear-gradient(to bottom, transparent, rgba(124,106,247,0.2), transparent)",
          pointerEvents: "none",
        }} />

        {/* Header */}
        <div style={{
          height: 48, display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "var(--accent)",
              boxShadow: "0 0 6px var(--accent)",
            }} />
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: "var(--text)",
              fontFamily: "'Instrument Sans', sans-serif",
            }}>
              Configuración
            </span>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: 24, height: 24,
              borderRadius: 5, border: "none",
              background: "transparent", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text3)", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--elevated)";
              (e.currentTarget as HTMLElement).style.color = "var(--text2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--text3)";
            }}
          >
            <X style={iconStyle} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "20px 16px",
          scrollbarWidth: "thin",
          scrollbarColor: "var(--border2) transparent",
        }}>

          {/* ── General ── */}
          <Section title="General" icon={<Info style={iconStyle} />}>
            <OptionRow label="Idioma" value="Español" badge="Fase 2" />
            <OptionRow label="Arranque automático" value="Desactivado" badge="Fase 2" />
            <OptionRow label="Actualización automática" value="Activada" />
          </Section>

          {/* ── Apariencia ── */}
          <Section title="Apariencia" icon={<Palette style={iconStyle} />}>
            <OptionRow label="Tema" value="Oscuro" />
            <OptionRow label="Fuente de UI" value="Instrument Sans" badge="Fase 2" />
            <OptionRow label="Densidad" value="Compacta" badge="Fase 2" />
          </Section>

          {/* ── Datos ── */}
          <Section title="Datos" icon={<Database style={iconStyle} />}>
            <OptionRow label="Exportar datos" value="" badge="Fase 2" />

            {/* Restablecer */}
            <div style={{ paddingTop: 10 }}>
              {resetStep === "idle" && (
                <button
                  onClick={() => setResetStep("confirm")}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 7,
                    border: "1px solid rgba(248,113,113,0.2)",
                    background: "rgba(248,113,113,0.04)",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 8,
                    color: "var(--red)",
                    fontSize: 11,
                    fontFamily: "'Instrument Sans', sans-serif",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.09)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(248,113,113,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.04)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(248,113,113,0.2)";
                  }}
                >
                  <RotateCcw style={{ width: 13, height: 13 }} />
                  Restablecer aplicación
                </button>
              )}

              {resetStep === "confirm" && (
                <div style={{
                  borderRadius: 8,
                  border: "1px solid rgba(248,113,113,0.3)",
                  background: "rgba(248,113,113,0.06)",
                  padding: "12px 14px",
                  display: "flex", flexDirection: "column", gap: 10,
                }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <AlertTriangle style={{ width: 14, height: 14, color: "var(--red)", flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", fontFamily: "'Instrument Sans', sans-serif", marginBottom: 3 }}>
                        ¿Restablecer todo?
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "'Instrument Sans', sans-serif", lineHeight: 1.5 }}>
                        Se borrarán todos los workspaces, paneles y notas. La app volverá al estado inicial con los workspaces de ejemplo.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={handleReset}
                      style={{
                        flex: 1, padding: "7px 0",
                        borderRadius: 6,
                        border: "1px solid rgba(248,113,113,0.4)",
                        background: "rgba(248,113,113,0.12)",
                        color: "var(--red)",
                        fontSize: 11, fontWeight: 600,
                        fontFamily: "'Instrument Sans', sans-serif",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.2)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.12)";
                      }}
                    >
                      Sí, restablecer
                    </button>
                    <button
                      onClick={() => setResetStep("idle")}
                      style={{
                        flex: 1, padding: "7px 0",
                        borderRadius: 6,
                        border: "1px solid var(--border2)",
                        background: "transparent",
                        color: "var(--text3)",
                        fontSize: 11,
                        fontFamily: "'Instrument Sans', sans-serif",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "var(--elevated)";
                        (e.currentTarget as HTMLElement).style.color = "var(--text2)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                        (e.currentTarget as HTMLElement).style.color = "var(--text3)";
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {resetStep === "loading" && (
                <div style={{
                  padding: "10px 12px",
                  borderRadius: 7,
                  border: "1px solid var(--border)",
                  background: "var(--elevated)",
                  fontSize: 11, color: "var(--text3)",
                  fontFamily: "'Geist Mono', monospace",
                  textAlign: "center",
                }}>
                  restableciendo...
                </div>
              )}
            </div>
          </Section>

          {/* ── Acerca de ── */}
          <Section title="Acerca de" icon={<Info style={iconStyle} />}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: "1px solid rgba(46,43,62,0.4)",
            }}>
              <span style={{ fontSize: 11, color: "var(--text2)", fontFamily: "'Instrument Sans', sans-serif" }}>
                Versión
              </span>
              <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "'Geist Mono', monospace" }}>
                {appVersion}
              </span>
            </div>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 0",
            }}>
              <span style={{ fontSize: 11, color: "var(--text2)", fontFamily: "'Instrument Sans', sans-serif" }}>
                GitHub
              </span>
              <button
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "transparent", border: "none",
                  fontSize: 10, color: "var(--accent2)",
                  fontFamily: "'Geist Mono', monospace",
                  cursor: "pointer",
                  textDecoration: "underline dotted",
                  padding: 0,
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--accent2)"; }}
              >
                <Github style={{ width: 11, height: 11 }} />
                stride-app
              </button>
            </div>
          </Section>

        </div>

        {/* Footer */}
        <div style={{
          padding: "10px 16px",
          borderTop: "1px solid var(--border)",
          flexShrink: 0,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <div style={{
            width: 3, height: 3, borderRadius: "50%",
            background: "var(--text4)", flexShrink: 0,
          }} />
          <span style={{
            fontSize: 8.5, color: "var(--text4)",
            fontFamily: "'Geist Mono', monospace",
          }}>
            stride · open source · MIT
          </span>
        </div>
      </div>
    </>,
    document.body
  );
}
