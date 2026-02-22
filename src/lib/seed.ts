import { getDb } from "./db";
import type { Panel, Workspace } from "@/types";

// Sembrar workspaces de ejemplo si es el primer arranque
export async function seedIfNeeded(): Promise<void> {
  const db = await getDb();

  const rows = await db.select<{ value: string }[]>(
    "SELECT value FROM settings WHERE key = 'onboarding_seeded'"
  );

  if (rows.length > 0) return;

  const workspaces: Workspace[] = [
    { id: "ws-trabajo", name: "Trabajo", layout: "2col", position: 0 },
    { id: "ws-personal", name: "Personal", layout: "2col", position: 1 },
    { id: "ws-dev", name: "Dev", layout: "3col", position: 2 },
  ];

  for (const ws of workspaces) {
    await db.execute(
      "INSERT OR IGNORE INTO workspaces (id, name, layout, position) VALUES ($1, $2, $3, $4)",
      [ws.id, ws.name, ws.layout, ws.position]
    );
  }

  const panels: Panel[] = [
    {
      id: "p-t-1",
      workspace_id: "ws-trabajo",
      type: "WEB",
      url: "https://mail.google.com",
      position: 0,
    },
    {
      id: "p-t-2",
      workspace_id: "ws-trabajo",
      type: "WEB",
      url: "https://calendar.google.com",
      position: 1,
    },
    {
      id: "p-p-1",
      workspace_id: "ws-personal",
      type: "WEB",
      url: "https://youtube.com",
      position: 0,
    },
    {
      id: "p-p-2",
      workspace_id: "ws-personal",
      type: "WIDGET",
      widget_id: "scratchpad",
      position: 1,
    },
    {
      id: "p-d-1",
      workspace_id: "ws-dev",
      type: "WEB",
      url: "https://github.com",
      position: 0,
    },
    {
      id: "p-d-2",
      workspace_id: "ws-dev",
      type: "WEB",
      url: "https://github.com",
      position: 1,
    },
    {
      id: "p-d-3",
      workspace_id: "ws-dev",
      type: "WEB",
      url: "https://vercel.com/dashboard",
      position: 2,
    },
  ];

  for (const panel of panels) {
    await db.execute(
      `INSERT OR IGNORE INTO panels (id, workspace_id, type, url, widget_id, position)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        panel.id,
        panel.workspace_id,
        panel.type,
        panel.url ?? null,
        panel.widget_id ?? null,
        panel.position,
      ]
    );
  }

  await db.execute(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('onboarding_seeded', 'true')"
  );
}
