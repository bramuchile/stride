import { useEffect, useRef } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { PanelGrid } from "./PanelGrid";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { usePanels } from "@/hooks/usePanels";
import { useWebviews } from "@/hooks/useWebviews";

export function AppShell() {
  const { data: workspaces = [] } = useWorkspaces();
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId);
  const { data: panels = [] } = usePanels(activeWorkspaceId);
  const initialized = useRef(false);

  // Activar el primer workspace al cargar, solo una vez
  useEffect(() => {
    if (!initialized.current && workspaces.length > 0 && !activeWorkspaceId) {
      initialized.current = true;
      setActiveWorkspace(workspaces[0].id);
    }
  }, [workspaces, activeWorkspaceId, setActiveWorkspace]);

  useWebviews(panels, activeWorkspace?.layout ?? "2col", activeWorkspaceId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar workspaces={workspaces} />
      <main className="flex-1 overflow-hidden">
        {activeWorkspace && panels.length > 0 && (
          <PanelGrid panels={panels} layout={activeWorkspace.layout} />
        )}
        {!activeWorkspace && (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            Selecciona un workspace
          </div>
        )}
      </main>
    </div>
  );
}
