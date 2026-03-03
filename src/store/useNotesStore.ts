import { create } from "zustand";

interface NotesStore {
  savingPanels: Set<string>;
  setSaving: (panelId: string, saving: boolean) => void;
}

export const useNotesStore = create<NotesStore>((set) => ({
  savingPanels: new Set(),
  setSaving: (panelId, saving) =>
    set((s) => {
      const next = new Set(s.savingPanels);
      if (saving) next.add(panelId);
      else next.delete(panelId);
      return { savingPanels: next };
    }),
}));
