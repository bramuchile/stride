import { Settings, User } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import strideIcon from "@/assets/stride-icon.svg";
import { WorkspaceList } from "./WorkspaceList";
import { FocusModeButton } from "./FocusModeButton";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useSidebarTooltip } from "@/hooks/useSidebarTooltip";
import { useGoogleAccount } from "@/hooks/useGoogleAccount";
import type { Workspace } from "@/types";

interface Props {
  workspaces: Workspace[];
  onAddWorkspace: () => void;
  onEditWorkspace: (ws: Workspace) => void;
  onOpenSettings: () => void;
}

function LogoButton() {
  const { showTooltip, hideTooltip } = useSidebarTooltip("Stride");
  return (
    <img
      src={strideIcon}
      width={32}
      height={32}
      className="mb-[14px] flex-shrink-0 cursor-default select-none"
      style={{ borderRadius: "9px" }}
      draggable={false}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    />
  );
}

function AddWorkspaceButton({ onClick }: { onClick: () => void }) {
  const { showTooltip, hideTooltip } = useSidebarTooltip("Nuevo workspace");
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center transition-all flex-shrink-0 mt-[2px]"
      style={{
        width: "32px", height: "32px",
        borderRadius: "9px",
        fontSize: "16px",
        color: "var(--text3)",
        background: "transparent",
        border: "1.5px dashed var(--border2)",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "var(--accent)";
        el.style.color = "var(--accent)";
        el.style.background = "var(--accent-dim)";
        showTooltip(e);
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "var(--border2)";
        el.style.color = "var(--text3)";
        el.style.background = "transparent";
        hideTooltip();
      }}
    >
      +
    </button>
  );
}

function SettingsButton({ onClick }: { onClick: () => void }) {
  const { showTooltip, hideTooltip } = useSidebarTooltip("Configuración");
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center rounded-lg transition-all"
      style={{
        width: "32px", height: "32px",
        background: "transparent", border: "none",
        color: "var(--text3)", cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = "var(--elevated)";
        el.style.color = "var(--text2)";
        showTooltip(e);
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = "transparent";
        el.style.color = "var(--text3)";
        hideTooltip();
      }}
    >
      <Settings size={16} />
    </button>
  );
}

function ProfileButton() {
  const { account, connecting, connect, disconnect } = useGoogleAccount();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const tooltipLabel = connecting
    ? "Conectando..."
    : account
    ? account.name
    : "Conectar cuenta de Google";
  const { showTooltip, hideTooltip } = useSidebarTooltip(tooltipLabel);

  // Cerrar popover al click fuera
  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [popoverOpen]);

  const handleClick = () => {
    if (connecting) return;
    if (account) {
      setPopoverOpen((v) => !v);
    } else {
      void connect();
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={buttonRef}
        className="flex items-center justify-center rounded-full transition-all mt-[2px]"
        disabled={connecting}
        onClick={handleClick}
        style={{
          width: "28px", height: "28px",
          background: account
            ? "transparent"
            : "linear-gradient(135deg, var(--accent), #C084FC)",
          border: "none",
          cursor: connecting ? "wait" : "pointer",
          opacity: connecting ? 0.6 : 1,
          padding: 0,
          overflow: "hidden",
          boxShadow: "0 0 0 2px var(--base-deep), 0 0 0 3px var(--border2)",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow =
            "0 0 0 2px var(--base-deep), 0 0 0 3px var(--accent)";
          showTooltip(e);
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow =
            "0 0 0 2px var(--base-deep), 0 0 0 3px var(--border2)";
          hideTooltip();
        }}
      >
        {account ? (
          <img
            src={account.picture_url}
            referrerPolicy="no-referrer"
            style={{ width: "28px", height: "28px", objectFit: "cover" }}
          />
        ) : (
          <User size={14} color="#fff" />
        )}
      </button>

      {popoverOpen && account && (
        <div
          ref={popoverRef}
          style={{
            position: "absolute",
            left: "52px",
            bottom: "0",
            background: "var(--elevated)",
            border: "1px solid var(--border2)",
            borderRadius: "12px",
            padding: "12px",
            minWidth: "200px",
            zIndex: 1000,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <img
              src={account.picture_url}
              referrerPolicy="no-referrer"
              style={{
                width: "40px", height: "40px",
                borderRadius: "50%", objectFit: "cover", flexShrink: 0,
              }}
            />
            <div style={{ overflow: "hidden" }}>
              <div
                className="text-sm font-medium truncate"
                style={{ color: "var(--text)" }}
              >
                {account.name}
              </div>
              <div
                className="text-xs truncate"
                style={{ color: "var(--text3)" }}
              >
                {account.email}
              </div>
            </div>
          </div>
          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "8px 0" }} />
          <button
            onClick={() => { void disconnect(); setPopoverOpen(false); }}
            className="w-full text-sm text-left px-2 py-1 rounded transition-colors"
            style={{
              background: "transparent",
              border: "none",
              color: "#f87171",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--base-deep)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            Desconectar
          </button>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ workspaces, onAddWorkspace, onEditWorkspace, onOpenSettings }: Props) {
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();

  return (
    <aside
      className="flex h-full flex-shrink-0 flex-col items-center py-[10px]"
      style={{
        width: "52px",
        background: "var(--base-deep)",
        borderRight: "1px solid var(--border)",
        position: "relative",
      }}
    >
      {/* Línea decorativa degradada en el borde derecho */}
      <div
        style={{
          position: "absolute", top: 0, right: 0, bottom: 0, width: 1,
          background: "linear-gradient(to bottom, transparent, rgba(124,106,247,0.3), transparent)",
          pointerEvents: "none",
        }}
      />

      <LogoButton />

      <WorkspaceList
        workspaces={workspaces}
        activeId={activeWorkspaceId}
        onSelect={setActiveWorkspace}
        onEdit={onEditWorkspace}
      />

      <AddWorkspaceButton onClick={onAddWorkspace} />

      <div className="mt-auto flex flex-col items-center gap-1 pb-[6px] px-[7px]">
        <FocusModeButton />
        <SettingsButton onClick={onOpenSettings} />
        <ProfileButton />
      </div>
    </aside>
  );
}
