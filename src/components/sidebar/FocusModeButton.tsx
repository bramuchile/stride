import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Shield } from "lucide-react";
import { getDb } from "@/lib/db";
import { useSidebarTooltip } from "@/hooks/useSidebarTooltip";

export function FocusModeButton() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Leer estado persistido en SQLite y sincronizar con el AtomicBool de Rust
    getDb()
      .then((db) =>
        db.select<{ value: string }[]>(
          "SELECT value FROM settings WHERE key = 'focus_mode_enabled'"
        )
      )
      .then((rows) => {
        // Si no hay registro, el default es true (Modo Focus activo)
        const val = rows.length > 0 ? rows[0].value === "1" : true;
        setEnabled(val);
        // Sincronizar Rust — importante si el arranque usó default=true pero DB dice false
        return invoke("set_focus_mode", { enabled: val });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next); // optimistic update
    try {
      await invoke("set_focus_mode", { enabled: next });
      const db = await getDb();
      await db.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('focus_mode_enabled', ?)",
        [next ? "1" : "0"]
      );
    } catch (e) {
      console.error("[FocusModeButton] Error toggling:", e);
      setEnabled(!next); // revertir en caso de error
    }
  };

  const tooltipHint = enabled ? "activo" : "inactivo";
  const { showTooltip, hideTooltip } = useSidebarTooltip("Modo Focus", tooltipHint);

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="relative flex items-center justify-center transition-all flex-shrink-0"
      style={{
        width: "32px",
        height: "32px",
        borderRadius: "9px",
        background: enabled ? "var(--accent-dim)" : "transparent",
        border: `1px solid ${enabled ? "rgba(124,106,247,0.25)" : "var(--border)"}`,
        cursor: loading ? "default" : "pointer",
        color: enabled ? "var(--accent2)" : "var(--text3)",
        opacity: loading ? 0.5 : 1,
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        if (loading) return;
        const el = e.currentTarget as HTMLElement;
        if (!enabled) {
          el.style.background = "var(--elevated)";
          el.style.color = "var(--text2)";
        } else {
          el.style.background = "rgba(124,106,247,0.14)";
        }
        showTooltip(e);
      }}
      onMouseLeave={(e) => {
        if (loading) return;
        const el = e.currentTarget as HTMLElement;
        el.style.background = enabled ? "var(--accent-dim)" : "transparent";
        el.style.color = enabled ? "var(--accent2)" : "var(--text3)";
        hideTooltip();
      }}
    >
      <Shield size={15} />
      {/* Dot de estado */}
      <span
        style={{
          position: "absolute",
          bottom: "4px",
          right: "4px",
          width: "5px",
          height: "5px",
          borderRadius: "50%",
          background: enabled ? "var(--accent)" : "var(--text4)",
          boxShadow: enabled ? "0 0 5px var(--accent)" : "none",
          transition: "all 0.2s ease",
        }}
      />
    </button>
  );
}
