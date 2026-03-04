import { Settings, Target } from "lucide-react";
import strideIcon from "@/assets/stride-icon.svg";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WorkspaceList } from "./WorkspaceList";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { Workspace } from "@/types";

interface Props {
  workspaces: Workspace[];
  onAddWorkspace: () => void;
  onEditWorkspace: (ws: Workspace) => void;
  onOpenSettings: () => void;
}

export function Sidebar({ workspaces, onAddWorkspace, onEditWorkspace, onOpenSettings }: Props) {
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();

  return (
    <TooltipProvider delayDuration={300}>
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

        {/* Logo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <img
              src={strideIcon}
              width={32}
              height={32}
              className="mb-[14px] flex-shrink-0 cursor-default select-none"
              style={{ borderRadius: "9px" }}
              draggable={false}
            />
          </TooltipTrigger>
          <TooltipContent side="right">Stride</TooltipContent>
        </Tooltip>

        {/* Workspaces */}
        <WorkspaceList
          workspaces={workspaces}
          activeId={activeWorkspaceId}
          onSelect={setActiveWorkspace}
          onEdit={onEditWorkspace}
        />

        {/* Botón + para añadir workspace */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onAddWorkspace}
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
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "var(--border2)";
                el.style.color = "var(--text3)";
                el.style.background = "transparent";
              }}
            >
              +
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Nuevo workspace</TooltipContent>
        </Tooltip>

        {/* Iconos de fondo */}
        <div className="mt-auto flex flex-col items-center gap-1 pb-[6px] px-[7px]">
          {/* Focus Mode */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
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
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "transparent";
                  el.style.color = "var(--text3)";
                }}
              >
                <Target size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Focus Mode <span className="opacity-60 text-xs">(Fase 3)</span></TooltipContent>
          </Tooltip>

          {/* Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onOpenSettings}
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
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "transparent";
                  el.style.color = "var(--text3)";
                }}
              >
                <Settings size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Configuración</TooltipContent>
          </Tooltip>

          {/* Avatar de perfil */}
          <Tooltip>
            <TooltipTrigger asChild>
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
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 0 0 2px var(--base-deep), 0 0 0 3px var(--border2)";
                }}
              >
                JD
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Perfil <span className="opacity-60 text-xs">(Fase 2)</span></TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
