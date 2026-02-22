import { useQuery } from "@tanstack/react-query";
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
        "SELECT id, workspace_id, type, url, widget_id, position FROM panels WHERE workspace_id = $1 ORDER BY position ASC",
        [workspaceId]
      );
    },
  });
}
