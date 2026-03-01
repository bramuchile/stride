import { getCurrentWindow } from "@tauri-apps/api/window";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useWorkspaces } from "@/hooks/useWorkspaces";

const win = getCurrentWindow();

export function Titlebar() {
  const { activeWorkspaceId } = useWorkspaceStore();
  const { data: workspaces = [] } = useWorkspaces();
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  return (
    <div
      className="flex-shrink-0 flex items-center select-none"
      style={{
        height: "30px",
        background: "var(--base-deep)",
        borderBottom: "1px solid var(--border)",
        position: "relative",
        zIndex: 10,
        padding: "0 14px",
      }}
      data-tauri-drag-region
    >
      {/* macOS-style window controls */}
      <div className="flex items-center gap-[7px]" style={{ zIndex: 1, flexShrink: 0 }}>
        <button
          onClick={() => win.close()}
          style={{
            width: 12, height: 12, borderRadius: "50%",
            background: "#FF5F57", border: "none", cursor: "pointer",
            boxShadow: "0 0 6px rgba(255,95,87,0.4)",
            flexShrink: 0,
          }}
          title="Cerrar"
        />
        <button
          onClick={() => win.minimize()}
          style={{
            width: 12, height: 12, borderRadius: "50%",
            background: "#FEBC2E", border: "none", cursor: "pointer",
            boxShadow: "0 0 6px rgba(254,188,46,0.3)",
            flexShrink: 0,
          }}
          title="Minimizar"
        />
        <button
          onClick={() => win.toggleMaximize()}
          style={{
            width: 12, height: 12, borderRadius: "50%",
            background: "#28C840", border: "none", cursor: "pointer",
            boxShadow: "0 0 6px rgba(40,200,64,0.3)",
            flexShrink: 0,
          }}
          title="Maximizar"
        />
      </div>

      {/* Center: logo + "stride" + workspace pill */}
      <div
        style={{
          position: "absolute", left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: "8px",
          pointerEvents: "none",
        }}
        data-tauri-drag-region
      >
        <div
          style={{
            width: 16, height: 16,
            background: "linear-gradient(135deg, var(--accent), var(--accent2))",
            borderRadius: 4,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 700, color: "#fff",
            flexShrink: 0,
          }}
        >
          S
        </div>
        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: 10, color: "var(--text3)", letterSpacing: "0.06em",
          }}
        >
          stride
        </span>
        {activeWorkspace && (
          <span
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: 10, color: "var(--text2)",
              background: "var(--elevated)",
              border: "1px solid var(--border)",
              borderRadius: 4, padding: "1px 7px",
              letterSpacing: "0.04em",
            }}
          >
            {activeWorkspace.name}
          </span>
        )}
      </div>
    </div>
  );
}
