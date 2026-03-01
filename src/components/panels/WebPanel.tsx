import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { Panel } from "@/types";

interface Props {
  panel: Panel;
}

// El WebView2 real se renderiza detrás de esta UI via Rust.
// Este div toma el espacio restante bajo el PanelHeader.
export function WebPanel({ panel }: Props) {
  const webviewMap = useWorkspaceStore((s) => s.webviewMap);
  const isLoaded = !!webviewMap[panel.id];

  // Sin URL: invitar al usuario a configurar el panel
  if (!panel.url) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-8">
        <span style={{ fontSize: 32, lineHeight: 1 }}>🌐</span>
        <p className="text-sm font-medium" style={{ color: "#e2e4e8" }}>
          Sin URL configurada
        </p>
        <p className="text-[11px] leading-relaxed" style={{ color: "#6b7280", maxWidth: 200 }}>
          Mantén pulsado el workspace en la barra lateral durante 3 s para editarlo
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-transparent">
      {!isLoaded && (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-xs truncate max-w-[180px] opacity-60">{panel.url}</span>
        </div>
      )}
    </div>
  );
}
