import { useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import type { Update } from "@tauri-apps/plugin-updater";

declare global {
  interface WindowEventMap {
    "stride:update-available": CustomEvent<{ version: string; update: Update }>;
  }
}

export function useUpdater() {
  useEffect(() => {
    // Verificar actualizaciones en segundo plano al arrancar
    // Esperar 5s para no impactar el tiempo de arranque
    const timeout = setTimeout(async () => {
      try {
        const update = await check();
        if (update?.available) {
          console.info(`Update available: ${update.version}`);
          window.dispatchEvent(
            new CustomEvent("stride:update-available", { detail: { version: update.version, update } })
          );
        }
      } catch {
        // Silenciar en desarrollo (servidor de updates no configurado)
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);
}
