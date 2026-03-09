import { useEffect, useRef } from "react";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useWorkspaces } from "@/hooks/useWorkspaces";

export function useKeyboardShortcuts() {
  const { data: workspaces = [] } = useWorkspaces();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  // Ref para Ctrl+Tab sin causar re-registro en cada cambio de workspace
  const activeIdRef = useRef(activeWorkspaceId);
  useEffect(() => {
    activeIdRef.current = activeWorkspaceId;
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (workspaces.length === 0) return;

    const setup = async () => {
      await unregisterAll();
      console.log("[shortcuts] unregisterAll done, registering for", workspaces.length, "workspaces");

      for (let i = 0; i < Math.min(workspaces.length, 9); i++) {
        const ws = workspaces[i];
        await register(`Control+${i + 1}`, () => {
          console.log("[shortcuts] Control+" + (i + 1) + " fired → workspace", ws.id);
          setActiveWorkspace(ws.id);
        });
        console.log("[shortcuts] registered Control+" + (i + 1));
      }

      await register("Control+Tab", () => {
        console.log("[shortcuts] Control+Tab fired");
        const idx = workspaces.findIndex((ws) => ws.id === activeIdRef.current);
        const next = workspaces[(idx + 1) % workspaces.length];
        if (next) setActiveWorkspace(next.id);
      });

      await register("Control+Shift+Tab", () => {
        console.log("[shortcuts] Control+Shift+Tab fired");
        const idx = workspaces.findIndex((ws) => ws.id === activeIdRef.current);
        const prev =
          workspaces[(idx - 1 + workspaces.length) % workspaces.length];
        if (prev) setActiveWorkspace(prev.id);
      });

      console.log("[shortcuts] all shortcuts registered");
    };

    setup().catch((e) => console.error("[shortcuts] setup failed:", e));
    return () => { unregisterAll().catch(console.error); };
  }, [workspaces, setActiveWorkspace]); // activeWorkspaceId removido — usa ref para evitar race condition
}
