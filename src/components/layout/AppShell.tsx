import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Titlebar } from "./Titlebar";
import { PanelGrid } from "./PanelGrid";
import { WorkspaceDialog } from "@/components/workspace/WorkspaceDialog";
import { SettingsDrawer } from "@/components/settings/SettingsDrawer";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { usePanels, useCreatePanel } from "@/hooks/usePanels";
import { useWebviews } from "@/hooks/useWebviews";
import { useDynamicLayout } from "@/hooks/useDynamicLayout";
import { getDb } from "@/lib/db";
import type { DynamicLayout, PanelType, Workspace, WidgetId } from "@/types";

export function AppShell() {
  const { data: workspaces = [] } = useWorkspaces();
  const { activeWorkspaceId, setActiveWorkspace, webviewMap, unregisterWebview } = useWorkspaceStore();
  const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId);
  const { data: panels = [] } = usePanels(activeWorkspaceId);
  const initialized = useRef(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [editStartAtPanels, setEditStartAtPanels] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Layout dinámico — solo activo cuando el workspace activo tiene layout "dynamic"
  const isDynamic = activeWorkspace?.layout === "dynamic";
  const { layout: dynamicLayout, save: saveDynLayout, addColumnWithPanel, addPanelToColumn, removePanel } = useDynamicLayout(
    isDynamic ? activeWorkspaceId : null
  );

  const queryClient = useQueryClient();

  // Cuando cualquier diálogo está abierto, ocultar los WebViews nativos para que
  // no queden por encima del diálogo (los WebView2 child windows siempre están
  // sobre la ventana React, ignorando el z-index de CSS).
  const webviewMapRef = useRef(webviewMap);
  webviewMapRef.current = webviewMap;
  const panelsRef = useRef(panels);
  panelsRef.current = panels;

  const anyDialogOpen = editingWorkspace !== null || createOpen || settingsOpen;
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

  useWebviews(
    panels,
    activeWorkspace?.layout ?? "2col",
    activeWorkspaceId,
    isDynamic ? dynamicLayout : null
  );

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

  const createPanel = useCreatePanel();

  // Callback que usa DynamicPanelGrid vía PanelGrid para añadir un panel en una columna.
  // Crea el panel en SQLite y actualiza la estructura del layout dinámico.
  const handleAddPanelToColumn = useCallback(
    async (colIdx: number, type: PanelType, widgetId?: WidgetId) => {
      if (!activeWorkspaceId) return;
      const newPanelId = crypto.randomUUID();
      const position = panels.length; // posición secuencial sin semántica especial en dynamic
      await createPanel.mutateAsync({
        id: newPanelId,
        workspace_id: activeWorkspaceId,
        type,
        url: type === "WEB" ? undefined : undefined,
        widget_id: type === "WIDGET" && widgetId ? widgetId : undefined,
        position,
      });
      await addPanelToColumn(colIdx, newPanelId);
    },
    [activeWorkspaceId, panels.length, createPanel, addPanelToColumn]
  );

  // Al crear una nueva columna: añadir panel WEB automáticamente sin preguntar.
  const handleAddColumn = useCallback(async () => {
    if (!activeWorkspaceId) return;
    const newPanelId = crypto.randomUUID();
    await createPanel.mutateAsync({
      id: newPanelId,
      workspace_id: activeWorkspaceId,
      type: "WEB",
      url: undefined,
      widget_id: undefined,
      position: panels.length,
    });
    await addColumnWithPanel(newPanelId);
  }, [activeWorkspaceId, panels.length, createPanel, addColumnWithPanel]);

  // Para resize drag en DynamicPanelGrid: actualizar layout inmediatamente (optimista)
  // y persistir en SQLite.
  const handleDynamicLayoutChange = useCallback(
    (layout: DynamicLayout) => {
      saveDynLayout(layout).catch(console.error);
    },
    [saveDynLayout]
  );

  // Eliminar un panel del layout dinámico: destruir WebView, borrar de SQLite,
  // actualizar el layout y refrescar la query de paneles.
  const handleRemovePanel = useCallback(
    async (panelId: string) => {
      if (webviewMap[panelId]) {
        await invoke("destroy_panel_webview", { panelId }).catch(console.error);
        unregisterWebview(panelId);
      }
      const db = await getDb();
      await db.execute("DELETE FROM panels WHERE id = $1", [panelId]);
      await removePanel(panelId);
      queryClient.invalidateQueries({ queryKey: ["panels", activeWorkspaceId] });
    },
    [webviewMap, unregisterWebview, removePanel, activeWorkspaceId, queryClient]
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
      <Sidebar
        workspaces={workspaces}
        onAddWorkspace={() => setCreateOpen(true)}
        onEditWorkspace={openEditWorkspace}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <main className="flex-1 overflow-hidden">
        {activeWorkspace && (panels.length > 0 || isDynamic) && (
          <PanelGrid
            panels={panels}
            layout={activeWorkspace.layout}
            dynamicLayout={isDynamic ? dynamicLayout : undefined}
            onDynamicLayoutChange={isDynamic ? handleDynamicLayoutChange : undefined}
            onAddPanelToColumn={isDynamic ? handleAddPanelToColumn : undefined}
            onAddColumn={isDynamic ? handleAddColumn : undefined}
            onRemovePanel={isDynamic ? handleRemovePanel : undefined}
          />
        )}
        {!activeWorkspace && (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            Selecciona un workspace
          </div>
        )}
      </main>

      </div>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <WorkspaceDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <WorkspaceDialog
        open={editingWorkspace !== null}
        workspace={editingWorkspace}
        startAtPanels={editStartAtPanels}
        onClose={() => setEditingWorkspace(null)}
      />
    </div>
  );
}
