import { useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import type { Update } from "@tauri-apps/plugin-updater";

// Singleton para poder instalar desde el banner de Titlebar sin prop drilling
let _pendingUpdate: Update | null = null;
export const getPendingUpdate = () => _pendingUpdate;

export function useUpdater() {
  useEffect(() => {
    // Verificar actualizaciones en segundo plano al arrancar
    // Esperar 5s para no impactar el tiempo de arranque
    const timeout = setTimeout(async () => {
      try {
        const update = await check();
        if (update?.available) {
          console.info(`Update available: ${update.version}`);
          _pendingUpdate = update;
          window.dispatchEvent(
            new CustomEvent("stride:update-available", { detail: { version: update.version } })
          );
        }
      } catch {
        // Silenciar en desarrollo (servidor de updates no configurado)
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);
}
