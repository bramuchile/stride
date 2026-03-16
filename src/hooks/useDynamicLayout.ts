import { useState, useEffect, useCallback } from "react";
import { getDynamicLayout, saveDynamicLayout } from "@/lib/db";
import type { DynamicLayout, DynamicColumn } from "@/types";

// Constantes de layout dinámico — deben coincidir con DynamicPanelGrid.tsx
export const COL_RESIZER_W = 5;
export const ROW_RESIZER_H = 4;

export function useDynamicLayout(workspaceId: string | null) {
  const [layout, setLayout] = useState<DynamicLayout | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setLayout(null);
      return;
    }
    getDynamicLayout(workspaceId).then((l) => setLayout(l));
  }, [workspaceId]);

  const save = useCallback(
    async (newLayout: DynamicLayout) => {
      if (!workspaceId) return;
      setLayout(newLayout);
      await saveDynamicLayout(workspaceId, newLayout);
    },
    [workspaceId]
  );

  const addColumn = useCallback(async () => {
    if (!layout) return;
    const newColCount = layout.columns.length + 1;
    const equalFrac = 1 / newColCount;
    const newColumns: DynamicColumn[] = [
      ...layout.columns.map((col) => ({ ...col, width_frac: equalFrac })),
      { width_frac: equalFrac, panels: [] },
    ];
    await save({ columns: newColumns });
  }, [layout, save]);

  const addPanelToColumn = useCallback(
    async (colIdx: number, panelId: string) => {
      if (!layout) return;
      const newColumns = layout.columns.map((col, i) => {
        if (i !== colIdx) return col;
        const newCount = col.panels.length + 1;
        const equalFrac = 1 / newCount;
        return {
          ...col,
          panels: [
            ...col.panels.map((p) => ({ ...p, height_frac: equalFrac })),
            { panel_id: panelId, height_frac: equalFrac },
          ],
        };
      });
      await save({ columns: newColumns });
    },
    [layout, save]
  );

  const updateColumnWidths = useCallback(
    async (newWidths: number[]) => {
      if (!layout) return;
      const newColumns = layout.columns.map((col, i) => ({
        ...col,
        width_frac: newWidths[i] ?? col.width_frac,
      }));
      await save({ columns: newColumns });
    },
    [layout, save]
  );

  const updateRowHeights = useCallback(
    async (colIdx: number, newHeights: number[]) => {
      if (!layout) return;
      const newColumns = layout.columns.map((col, i) => {
        if (i !== colIdx) return col;
        return {
          ...col,
          panels: col.panels.map((p, j) => ({
            ...p,
            height_frac: newHeights[j] ?? p.height_frac,
          })),
        };
      });
      await save({ columns: newColumns });
    },
    [layout, save]
  );

  const removePanel = useCallback(
    async (panelId: string) => {
      if (!layout) return;
      let colsChanged = false;
      const newColumns = layout.columns
        .map((col) => {
          const filtered = col.panels.filter((p) => p.panel_id !== panelId);
          if (filtered.length === col.panels.length) return col;
          colsChanged = true;
          if (filtered.length === 0) return null; // columna vacía → eliminar
          const total = filtered.reduce((s, p) => s + p.height_frac, 0);
          return {
            ...col,
            panels: filtered.map((p) => ({ ...p, height_frac: p.height_frac / total })),
          };
        })
        .filter(Boolean) as DynamicColumn[];

      // Redistribuir anchos si se eliminó alguna columna
      if (colsChanged && newColumns.length !== layout.columns.length && newColumns.length > 0) {
        const total = newColumns.reduce((s, c) => s + c.width_frac, 0);
        newColumns.forEach((c) => {
          c.width_frac = c.width_frac / total;
        });
      }
      await save({ columns: newColumns });
    },
    [layout, save]
  );

  return {
    layout,
    save,
    addColumn,
    addPanelToColumn,
    updateColumnWidths,
    updateRowHeights,
    removePanel,
  };
}
