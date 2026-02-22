import { Settings } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { WorkspaceList } from "./WorkspaceList";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { Workspace } from "@/types";

interface Props {
  workspaces: Workspace[];
}

export function Sidebar({ workspaces }: Props) {
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="flex h-full w-[52px] flex-shrink-0 flex-col items-center border-r border-border bg-sidebar py-2">
        {/* Logo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold cursor-default select-none">
              S
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">Stride</TooltipContent>
        </Tooltip>

        <Separator className="my-2 w-8" />

        {/* Workspaces */}
        <WorkspaceList
          workspaces={workspaces}
          activeId={activeWorkspaceId}
          onSelect={setActiveWorkspace}
        />

        {/* Settings al fondo */}
        <div className="mt-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                <Settings size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Configuración</TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
