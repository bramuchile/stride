import { getDb } from "./db";
import type { Panel, Workspace } from "@/types";

// Sembrar workspaces de ejemplo si es el primer arranque (o re-seed v2 con overlays)
export async function seedIfNeeded(): Promise<void> {
  const db = await getDb();

  // seed_v2: incluye overlays de widgets y emojis en workspaces
  const rows = await db.select<{ value: string }[]>(
    "SELECT value FROM settings WHERE key = 'seed_v2'"
  );

  if (rows.length > 0) {
    // Ejecutar migraciones incrementales aunque el seed base ya exista
    await migrateV3();
    return;
  }

  const workspaces: Workspace[] = [
    { id: "ws-trabajo",  name: "Trabajo",  layout: "3col", position: 0, icon: "💼" },
    { id: "ws-finanzas", name: "Finanzas", layout: "2col", position: 1, icon: "📊" },
    { id: "ws-social",   name: "Social",   layout: "3col", position: 2, icon: "🎮" },
    { id: "ws-dev",      name: "Dev",      layout: "3col", position: 3, icon: "⚙️" },
  ];

  for (const ws of workspaces) {
    await db.execute(
      "INSERT OR REPLACE INTO workspaces (id, name, layout, position, icon) VALUES ($1, $2, $3, $4, $5)",
      [ws.id, ws.name, ws.layout, ws.position, ws.icon]
    );
  }

  const panels: Panel[] = [
    // ── Trabajo (3col) — replica el wireframe ──
    {
      id: "p-t-1",
      workspace_id: "ws-trabajo",
      type: "WEB",
      url: "https://web.whatsapp.com",
      position: 0,
      overlay_widget_id: "weather",
      overlay_position: "top",
      overlay_height_pct: 30,
    },
    {
      id: "p-t-2",
      workspace_id: "ws-trabajo",
      type: "WEB",
      url: "https://chatgpt.com",
      position: 1,
    },
    {
      id: "p-t-3",
      workspace_id: "ws-trabajo",
      type: "WEB",
      url: "https://youtube.com",
      position: 2,
      overlay_widget_id: "notes",
      overlay_position: "bottom",
      overlay_height_pct: 40,
    },

    // ── Finanzas (2col) ──
    {
      id: "p-f-1",
      workspace_id: "ws-finanzas",
      type: "WEB",
      url: "https://finance.yahoo.com",
      position: 0,
    },
    {
      id: "p-f-2",
      workspace_id: "ws-finanzas",
      type: "WEB",
      url: "https://tradingview.com",
      position: 1,
    },

    // ── Social (3col) ──
    {
      id: "p-s-1",
      workspace_id: "ws-social",
      type: "WEB",
      url: "https://web.whatsapp.com",
      position: 0,
    },
    {
      id: "p-s-2",
      workspace_id: "ws-social",
      type: "WEB",
      url: "https://x.com",
      position: 1,
    },
    {
      id: "p-s-3",
      workspace_id: "ws-social",
      type: "WEB",
      url: "https://instagram.com",
      position: 2,
    },

    // ── Dev (3col) ──
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
      `INSERT OR REPLACE INTO panels
         (id, workspace_id, type, url, widget_id, position,
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
  }

  await db.execute(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('seed_v2', 'true')"
  );
  // Marcar también el flag antiguo para no re-correr el seed v1
  await db.execute(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('onboarding_seeded', 'true')"
  );

  // seed_v3 ya se ejecutará a continuación
}

// Migración v3: reemplaza "scratchpad" overlay por "notes" en todos los paneles que lo usen
async function migrateV3(): Promise<void> {
  const db = await getDb();
  const rows = await db.select<{ value: string }[]>(
    "SELECT value FROM settings WHERE key = 'seed_v3'"
  );
  if (rows.length > 0) return;

  await db.execute(
    "UPDATE panels SET overlay_widget_id = 'notes' WHERE overlay_widget_id = 'scratchpad'"
  );

  await db.execute(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('seed_v3', 'true')"
  );
}
