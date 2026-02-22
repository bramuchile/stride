import { useState } from "react";
import { Search, RotateCcw } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { AddressBar } from "./AddressBar";
import type { Panel } from "@/types";

interface Props {
  panel: Panel;
}

// Extraer dominio de una URL para mostrarlo en el header
function getDomain(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function PanelHeader({ panel }: Props) {
  const [showAddressBar, setShowAddressBar] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(panel.url ?? "");

  const handleNavigate = async (newUrl: string) => {
    setCurrentUrl(newUrl);
    await invoke("navigate_panel_webview", {
      panelId: panel.id,
      url: newUrl,
    }).catch(console.error);
  };

  const handleReload = async () => {
    await invoke("navigate_panel_webview", {
      panelId: panel.id,
      url: currentUrl,
    }).catch(console.error);
  };

  return (
    <div className="relative flex h-9 flex-shrink-0 items-center border-b border-border bg-sidebar px-2 gap-1">
      {showAddressBar ? (
        <AddressBar
          initialUrl={currentUrl}
          onNavigate={handleNavigate}
          onClose={() => setShowAddressBar(false)}
        />
      ) : (
        <>
          {/* Dominio clicable para abrir la barra */}
          <button
            onClick={() => setShowAddressBar(true)}
            className="flex-1 text-left text-xs text-muted-foreground truncate hover:text-foreground transition-colors px-1 min-w-0"
            title={currentUrl}
          >
            {getDomain(currentUrl)}
          </button>

          {/* Recargar */}
          <button
            onClick={handleReload}
            className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Recargar"
          >
            <RotateCcw size={12} strokeWidth={2} />
          </button>

          {/* Abrir barra de direcciones */}
          <button
            onClick={() => setShowAddressBar(true)}
            className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-accent/60 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Ir a URL"
          >
            <Search size={11} strokeWidth={2} />
          </button>
        </>
      )}
    </div>
  );
}
