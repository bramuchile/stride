import { useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";

export function useUpdater() {
  useEffect(() => {
    // Verificar actualizaciones en segundo plano al arrancar
    // Esperar 5s para no impactar el tiempo de arranque
    const timeout = setTimeout(async () => {
      try {
        const update = await check();
        if (update?.available) {
          console.info(`Update available: ${update.version}`);
          await update.downloadAndInstall();
        }
      } catch {
        // Silenciar en desarrollo (servidor de updates no configurado)
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);
}
