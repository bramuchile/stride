import { create } from "zustand";

interface WebviewMap {
  [panelId: string]: string; // panelId → webview label
}

interface WorkspaceStore {
  activeWorkspaceId: string | null;
  webviewMap: WebviewMap;

  setActiveWorkspace: (id: string) => void;
  registerWebview: (panelId: string, label: string) => void;
  unregisterWebview: (panelId: string) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  activeWorkspaceId: null,
  webviewMap: {},

  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

  registerWebview: (panelId, label) =>
    set((state) => ({
      webviewMap: { ...state.webviewMap, [panelId]: label },
    })),

  unregisterWebview: (panelId) =>
    set((state) => {
      const { [panelId]: _removed, ...rest } = state.webviewMap;
      return { webviewMap: rest };
    }),
}));
