import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDb } from "@/lib/db";
import type { Workspace } from "@/types";

export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const db = await getDb();
      return db.select<Workspace[]>(
        "SELECT id, name, layout, position, icon FROM workspaces ORDER BY position ASC"
      );
    },
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ws: Omit<Workspace, "position">) => {
      const db = await getDb();
      const rows = await db.select<{ max_pos: number }[]>(
        "SELECT COALESCE(MAX(position), -1) as max_pos FROM workspaces"
      );
      const nextPos = (rows[0]?.max_pos ?? -1) + 1;
      await db.execute(
        "INSERT INTO workspaces (id, name, layout, position, icon) VALUES ($1, $2, $3, $4, $5)",
        [ws.id, ws.name, ws.layout, nextPos, ws.icon ?? "📁"]
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}

export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ws: Pick<Workspace, "id" | "name" | "icon">) => {
      const db = await getDb();
      await db.execute(
        "UPDATE workspaces SET name=$1, icon=$2 WHERE id=$3",
        [ws.name, ws.icon ?? "📁", ws.id]
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const db = await getDb();
      await db.execute("DELETE FROM workspaces WHERE id = $1", [id]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}
