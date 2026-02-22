import { useEffect } from "react";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useWorkspaces } from "@/hooks/useWorkspaces";

export function useKeyboardShortcuts() {
  const { data: workspaces = [] } = useWorkspaces();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  useEffect(() => {
    if (workspaces.length === 0) return;

    const setup = async () => {
      await unregisterAll();

      for (let i = 0; i < Math.min(workspaces.length, 9); i++) {
        const ws = workspaces[i];
        await register(`Control+${i + 1}`, () => {
          setActiveWorkspace(ws.id);
        });
      }

      await register("Control+Tab", () => {
        const idx = workspaces.findIndex((ws) => ws.id === activeWorkspaceId);
        const next = workspaces[(idx + 1) % workspaces.length];
        if (next) setActiveWorkspace(next.id);
      });

      await register("Control+Shift+Tab", () => {
        const idx = workspaces.findIndex((ws) => ws.id === activeWorkspaceId);
        const prev =
          workspaces[(idx - 1 + workspaces.length) % workspaces.length];
        if (prev) setActiveWorkspace(prev.id);
      });
    };

    setup().catch(console.error);
    return () => { unregisterAll().catch(console.error); };
  }, [workspaces, activeWorkspaceId, setActiveWorkspace]);
}
