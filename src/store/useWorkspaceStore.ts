import { create } from "zustand";

interface WebviewMap {
  [panelId: string]: string; // panelId → webview label
}

interface WorkspaceStore {
  activeWorkspaceId: string | null;
  webviewMap: WebviewMap;
  // URL actualmente cargada en cada webview (para detectar cambios y navegar)
  webviewUrlMap: { [panelId: string]: string };

  setActiveWorkspace: (id: string) => void;
  registerWebview: (panelId: string, label: string) => void;
  unregisterWebview: (panelId: string) => void;
  setWebviewUrl: (panelId: string, url: string) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  activeWorkspaceId: null,
  webviewMap: {},
  webviewUrlMap: {},

  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

  registerWebview: (panelId, label) =>
    set((state) => ({
      webviewMap: { ...state.webviewMap, [panelId]: label },
    })),

  unregisterWebview: (panelId) =>
    set((state) => {
      const { [panelId]: _removedLabel, ...restLabels } = state.webviewMap;
      const { [panelId]: _removedUrl, ...restUrls } = state.webviewUrlMap;
      return { webviewMap: restLabels, webviewUrlMap: restUrls };
    }),

  setWebviewUrl: (panelId, url) =>
    set((state) => ({
      webviewUrlMap: { ...state.webviewUrlMap, [panelId]: url },
    })),
}));
