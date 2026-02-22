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
