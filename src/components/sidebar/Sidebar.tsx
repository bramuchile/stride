import { Settings, Target } from "lucide-react";
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
}

export function Sidebar({ workspaces, onAddWorkspace, onEditWorkspace }: Props) {
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className="flex h-full flex-shrink-0 flex-col items-center border-r border-border py-[10px]"
        style={{ width: "56px", background: "#161719" }}
      >
        {/* Logo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="flex items-center justify-center rounded-lg text-white font-bold cursor-default select-none mb-4"
              style={{ width: "30px", height: "30px", background: "#5b7cf6", fontSize: "13px", borderRadius: "8px", letterSpacing: "-0.03em" }}
            >
              S
            </div>
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
              className="flex items-center justify-center rounded-[9px] transition-colors font-mono mt-[6px]"
              style={{
                width: "38px",
                height: "38px",
                fontSize: "14px",
                color: "#6b7280",
                background: "transparent",
                border: "1px dashed #323539",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                (e.currentTarget as HTMLElement).style.color = "#e2e4e8";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "#6b7280";
              }}
            >
              +
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Nuevo workspace</TooltipContent>
        </Tooltip>

        {/* Iconos de fondo */}
        <div className="mt-auto flex flex-col items-center gap-1 pb-[6px] px-[9px]">
          {/* Focus Mode */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex items-center justify-center rounded-lg transition-colors"
                style={{
                  width: "32px", height: "32px",
                  background: "transparent", border: "none",
                  color: "#6b7280", cursor: "pointer",
                  fontSize: "15px",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                  (e.currentTarget as HTMLElement).style.color = "#e2e4e8";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "#6b7280";
                }}
              >
                <Target size={15} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Focus Mode <span className="opacity-60 text-xs">(Fase 3)</span></TooltipContent>
          </Tooltip>

          {/* Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex items-center justify-center rounded-lg transition-colors"
                style={{
                  width: "32px", height: "32px",
                  background: "transparent", border: "none",
                  color: "#6b7280", cursor: "pointer",
                  fontSize: "15px",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                  (e.currentTarget as HTMLElement).style.color = "#e2e4e8";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "#6b7280";
                }}
              >
                <Settings size={15} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Configuración</TooltipContent>
          </Tooltip>

          {/* Avatar de perfil */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex items-center justify-center rounded-full font-semibold mt-[2px]"
                style={{
                  width: "28px", height: "28px",
                  background: "linear-gradient(135deg, #5b7cf6, #9b6ef3)",
                  color: "#fff", fontSize: "11px",
                  border: "none", cursor: "pointer",
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
