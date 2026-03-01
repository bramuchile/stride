import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDb } from "@/lib/db";
import type { Panel } from "@/types";

export function usePanels(workspaceId: string | null) {
  return useQuery({
    queryKey: ["panels", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      if (!workspaceId) return [];
      const db = await getDb();
      return db.select<Panel[]>(
        `SELECT id, workspace_id, type, url, widget_id, position,
                overlay_widget_id, overlay_position, overlay_height_pct
         FROM panels WHERE workspace_id = $1 ORDER BY position ASC`,
        [workspaceId]
      );
    },
  });
}

export function useUpdatePanel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (panel: Panel) => {
      const db = await getDb();
      await db.execute(
        `UPDATE panels SET type=$1, url=$2, widget_id=$3,
         overlay_widget_id=$4, overlay_position=$5, overlay_height_pct=$6
         WHERE id=$7`,
        [
          panel.type,
          panel.url ?? null,
          panel.widget_id ?? null,
          panel.overlay_widget_id ?? null,
          panel.overlay_position ?? null,
          panel.overlay_height_pct ?? null,
          panel.id,
        ]
      );
    },
    onSuccess: (_data, panel) =>
      qc.invalidateQueries({ queryKey: ["panels", panel.workspace_id] }),
  });
}

export function useCreatePanel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (panel: Panel) => {
      const db = await getDb();
      await db.execute(
        `INSERT INTO panels (id, workspace_id, type, url, widget_id, position,
                             overlay_widget_id, overlay_position, overlay_height_pct)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          panel.id,
          panel.workspace_id,
          panel.type,
          panel.url ?? null,
          panel.widget_id ?? null,
          panel.position,
          panel.overlay_widget_id ?? null,
          panel.overlay_position ?? null,
          panel.overlay_height_pct ?? null,
        ]
      );
    },
    onSuccess: (_data, panel) =>
      qc.invalidateQueries({ queryKey: ["panels", panel.workspace_id] }),
  });
}
