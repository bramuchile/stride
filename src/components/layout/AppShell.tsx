import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Titlebar } from "./Titlebar";
import { PanelGrid } from "./PanelGrid";
import { CreateWorkspaceDialog } from "@/components/workspace/CreateWorkspaceDialog";
import { EditWorkspaceDialog } from "@/components/workspace/EditWorkspaceDialog";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { usePanels } from "@/hooks/usePanels";
import { useWebviews } from "@/hooks/useWebviews";
import type { Workspace } from "@/types";

export function AppShell() {
  const { data: workspaces = [] } = useWorkspaces();
  const { activeWorkspaceId, setActiveWorkspace, webviewMap } = useWorkspaceStore();
  const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId);
  const { data: panels = [] } = usePanels(activeWorkspaceId);
  const initialized = useRef(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [editStartAtPanels, setEditStartAtPanels] = useState(false);

  // Cuando cualquier diálogo está abierto, ocultar los WebViews nativos para que
  // no queden por encima del diálogo (los WebView2 child windows siempre están
  // sobre la ventana React, ignorando el z-index de CSS).
  const webviewMapRef = useRef(webviewMap);
  webviewMapRef.current = webviewMap;
  const panelsRef = useRef(panels);
  panelsRef.current = panels;

  const anyDialogOpen = editingWorkspace !== null || createOpen;
  useEffect(() => {
    if (anyDialogOpen) {
      invoke("hide_all_panel_webviews").catch(console.error);
    } else {
      // Volver a mostrar solo los WebViews que ya fueron creados para el workspace activo
      const visibleIds = panelsRef.current
        .filter((p) => p.type === "WEB" && webviewMapRef.current[p.id])
        .map((p) => p.id);
      if (visibleIds.length > 0) {
        invoke("show_panel_webviews", { panel_ids: visibleIds }).catch(console.error);
      }
    }
  }, [anyDialogOpen]);

  // Activar el primer workspace al cargar, solo una vez
  useEffect(() => {
    if (!initialized.current && workspaces.length > 0 && !activeWorkspaceId) {
      initialized.current = true;
      setActiveWorkspace(workspaces[0].id);
    }
  }, [workspaces, activeWorkspaceId, setActiveWorkspace]);

  useWebviews(panels, activeWorkspace?.layout ?? "2col", activeWorkspaceId);

  function openEditWorkspace(ws: Workspace) {
    setEditingWorkspace(ws);
    setEditStartAtPanels(false);
  }

  function openConfigurePanels() {
    if (activeWorkspace) {
      setEditingWorkspace(activeWorkspace);
      setEditStartAtPanels(true);
    }
  }

  // El botón "widget" del PanelHeader emite este evento para abrir el editor de paneles
  // sin necesidad de prop drilling desde PanelSlot → PanelHeader.
  useEffect(() => {
    const handler = () => openConfigurePanels();
    window.addEventListener("stride:edit-panels", handler);
    return () => window.removeEventListener("stride:edit-panels", handler);
  });

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
      <Sidebar
        workspaces={workspaces}
        onAddWorkspace={() => setCreateOpen(true)}
        onEditWorkspace={openEditWorkspace}
      />
      <main className="flex-1 overflow-hidden">
        {activeWorkspace && panels.length > 0 && (
          <PanelGrid
            panels={panels}
            layout={activeWorkspace.layout}
          />
        )}
        {!activeWorkspace && (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            Selecciona un workspace
          </div>
        )}
      </main>

      </div>

      <CreateWorkspaceDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <EditWorkspaceDialog
        workspace={editingWorkspace}
        startAtPanels={editStartAtPanels}
        onClose={() => setEditingWorkspace(null)}
      />
    </div>
  );
}
