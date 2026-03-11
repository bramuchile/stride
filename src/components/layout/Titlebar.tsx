import { getCurrentWindow } from "@tauri-apps/api/window";
import { relaunch } from "@tauri-apps/plugin-process";
import type { Update } from "@tauri-apps/plugin-updater";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { formatError } from "@/hooks/useErrorHandler";
import type { AppError } from "@/types";
import { ErrorDisplay } from "@/components/error/ErrorDisplay";
import { useState, useEffect } from "react";
import strideIcon from "@/assets/stride-icon.svg";

const win = getCurrentWindow();

export function Titlebar() {
  const { activeWorkspaceId } = useWorkspaceStore();
  const { data: workspaces = [] } = useWorkspaces();
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const [isMaximized, setIsMaximized] = useState(false);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<AppError | null>(null);

  useEffect(() => {
    win.isMaximized().then(setIsMaximized);
    const unlisten = win.onResized(() => {
      win.isMaximized().then(setIsMaximized);
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  useEffect(() => {
    const handler = (e: WindowEventMap["stride:update-available"]) => {
      setPendingUpdate(e.detail.update);
      setUpdateVersion(e.detail.version);
    };
    window.addEventListener("stride:update-available", handler);
    return () => window.removeEventListener("stride:update-available", handler);
  }, []);

  const handleInstall = async () => {
    if (!pendingUpdate) {
      setInstallError(await formatError(new Error("No hay actualización pendiente"), "handleInstall"));
      return;
    }
    setInstalling(true);
    try {
      await pendingUpdate.downloadAndInstall();
      await relaunch();
    } catch (e) {
      setInstallError(await formatError(e, "downloadAndInstall"));
      setInstalling(false);
    }
  };

  return (
    <div
      className="flex-shrink-0 flex items-center select-none"
      style={{
        height: 30,
        background: "var(--base-deep)",
        borderBottom: "1px solid var(--border)",
        position: "relative",
        zIndex: 10,
      }}
      data-tauri-drag-region
    >
      {/* CENTER: Logo + stride + workspace — absolutamente centrado, sin bloquear el drag region */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        <img
          src={strideIcon}
          width={16}
          height={16}
          style={{ borderRadius: 3, flexShrink: 0 }}
          draggable={false}
        />
        <span style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: 10, color: "var(--text3)", letterSpacing: "0.06em",
        }}>
          stride
        </span>
        {activeWorkspace && (
          <>
            <span style={{ color: "var(--text3)", fontSize: 10, fontFamily: "'Geist Mono', monospace" }}>/</span>
            <span style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: 10, color: "var(--text2)",
              background: "var(--elevated)",
              border: "1px solid var(--border)",
              borderRadius: 4, padding: "1px 7px",
              letterSpacing: "0.04em",
            }}>
              {activeWorkspace.name}
            </span>
          </>
        )}
      </div>

      {/* SPACER: ocupa todo el ancho disponible y actúa como drag region */}
      <div style={{ flex: 1 }} data-tauri-drag-region />

      {/* UPDATE BANNER: visible cuando hay una nueva versión disponible */}
      {updateVersion && (
        <div style={{
          position: "absolute", right: 46 * 3 + 8, top: "50%",
          transform: "translateY(-50%)",
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(124,106,247,0.12)",
          border: "1px solid rgba(124,106,247,0.35)",
          borderRadius: 4, padding: "2px 8px",
          pointerEvents: "auto", zIndex: 20,
        }}>
          <span style={{
            fontFamily: "'Geist Mono', monospace", fontSize: 9,
            color: "var(--accent)", letterSpacing: "0.04em", whiteSpace: "nowrap",
          }}>
            v{updateVersion} disponible
          </span>
          <button onClick={handleInstall} disabled={installing} style={{
            background: "var(--accent)", border: "none", borderRadius: 3,
            padding: "1px 7px", cursor: installing ? "default" : "pointer",
            fontFamily: "'Geist Mono', monospace", fontSize: 9, color: "#fff",
            opacity: installing ? 0.6 : 1, fontWeight: 600, letterSpacing: "0.04em",
          }}>
            {installing ? "..." : "Instalar"}
          </button>
          {installError && (
            <ErrorDisplay error={installError} onRetry={() => setInstallError(null)} />
          )}
        </div>
      )}

      {/* RIGHT: Controles de ventana estilo Windows */}
      <div style={{ display: "flex", height: "100%", flexShrink: 0 }}>

        {/* Minimizar */}
        <button
          onClick={() => win.minimize()}
          style={{
            width: 46, height: "100%",
            background: "transparent", border: "none",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text2)",
            transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "var(--elevated)";
            e.currentTarget.style.color = "var(--text)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text2)";
          }}
          title="Minimizar"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <rect x="0" y="4.5" width="10" height="1" fill="currentColor"/>
          </svg>
        </button>

        {/* Maximizar / Restaurar */}
        <button
          onClick={() => win.toggleMaximize()}
          style={{
            width: 46, height: "100%",
            background: "transparent", border: "none",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text2)",
            transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "var(--elevated)";
            e.currentTarget.style.color = "var(--text)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text2)";
          }}
          title={isMaximized ? "Restaurar" : "Maximizar"}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="2" y="0" width="8" height="8" rx="0.5"
                stroke="currentColor" strokeWidth="1" fill="none"/>
              <rect x="0" y="2" width="8" height="8" rx="0.5"
                stroke="currentColor" strokeWidth="1" fill="none"
                style={{ fill: "var(--base-deep)" }}/>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="0.5" y="0.5" width="9" height="9" rx="0.5"
                stroke="currentColor" strokeWidth="1" fill="none"/>
            </svg>
          )}
        </button>

        {/* Cerrar */}
        <button
          onClick={() => win.close()}
          style={{
            width: 46, height: "100%",
            background: "transparent", border: "none",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text2)",
            transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "#E81123";
            e.currentTarget.style.color = "#ffffff";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text2)";
          }}
          title="Cerrar"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <line x1="0" y1="0" x2="10" y2="10"
              stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="10" y1="0" x2="0" y2="10"
              stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
