import { Settings } from "lucide-react";
import strideIcon from "@/assets/stride-icon.svg";
import { WorkspaceList } from "./WorkspaceList";
import { FocusModeButton } from "./FocusModeButton";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useSidebarTooltip } from "@/hooks/useSidebarTooltip";
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
  const { showTooltip, hideTooltip } = useSidebarTooltip("Perfil", "Fase 2");
  return (
    <button
      className="flex items-center justify-center rounded-full font-semibold transition-all mt-[2px]"
      style={{
        width: "28px", height: "28px",
        background: "linear-gradient(135deg, var(--accent), #C084FC)",
        color: "#fff", fontSize: "10px",
        border: "none", cursor: "pointer",
        boxShadow: "0 0 0 2px var(--base-deep), 0 0 0 3px var(--border2)",
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
      C
    </button>
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
