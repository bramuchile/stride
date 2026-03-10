import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Search, LayoutPanelLeft } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { AddressBar } from "./AddressBar";
import { useUpdatePanel } from "@/hooks/usePanels";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { Panel } from "@/types";

interface Props {
  panel: Panel;
}

function getDomain(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function getSiteTitle(url?: string): string {
  if (!url) return "Nueva página";
  try {
    const hostname = new URL(url).hostname;
    // Eliminar "www." y extensión TLD para nombre más limpio
    return hostname.replace(/^www\./, "").replace(/\.[^.]+$/, "");
  } catch {
    return url;
  }
}

function getFaviconUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const { origin } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${origin}&sz=32`;
  } catch {
    return null;
  }
}

export function PanelHeader({ panel }: Props) {
  const [showAddressBar, setShowAddressBar] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(panel.url ?? "");
  const [faviconError, setFaviconError] = useState(false);
  const [history, setHistory] = useState<string[]>(panel.url ? [panel.url] : []);
  const [historyIndex, setHistoryIndex] = useState(0);
  const pendingNav = useRef<"back" | "forward" | null>(null);
  const updatePanel = useUpdatePanel();
  const { setWebviewUrl } = useWorkspaceStore();

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const faviconUrl = getFaviconUrl(currentUrl);
  const domain = getDomain(currentUrl);
  const siteTitle = getSiteTitle(currentUrl);
  const firstLetter = domain.charAt(0).toUpperCase();

  // Escuchar navegaciones del WebView y actualizar URL + historial
  useEffect(() => {
    const unlisten = listen<{ panel_id: string; url: string }>("panel-navigated", (event) => {
      if (event.payload.panel_id !== panel.id) return;
      const newUrl = event.payload.url;

      if (pendingNav.current === "back") {
        pendingNav.current = null;
        setHistoryIndex((i) => i - 1);
      } else if (pendingNav.current === "forward") {
        pendingNav.current = null;
        setHistoryIndex((i) => i + 1);
      } else {
        setHistory((h) => [...h.slice(0, historyIndex + 1), newUrl]);
        setHistoryIndex((i) => i + 1);
      }

      setCurrentUrl(newUrl);
      setFaviconError(false);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [panel.id, historyIndex]);

  const handleNavigate = async (newUrl: string) => {
    setHistory((h) => [...h.slice(0, historyIndex + 1), newUrl]);
    setHistoryIndex((i) => i + 1);
    setCurrentUrl(newUrl);
    setFaviconError(false);
    await invoke("navigate_panel_webview", {
      panelId: panel.id,
      url: newUrl,
    }).catch(console.error);
    updatePanel.mutateAsync({ ...panel, url: newUrl }).catch(console.error);
    setWebviewUrl(panel.id, newUrl);
  };

  const handleReload = async () => {
    await invoke("navigate_panel_webview", {
      panelId: panel.id,
      url: currentUrl,
    }).catch(console.error);
  };

  const handleBack = () => {
    if (!canGoBack) return;
    pendingNav.current = "back";
    invoke("go_back_panel_webview", { panelId: panel.id }).catch(console.error);
  };

  const handleForward = () => {
    if (!canGoForward) return;
    pendingNav.current = "forward";
    invoke("go_forward_panel_webview", { panelId: panel.id }).catch(console.error);
  };

  const handleWidgetBtn = () => {
    window.dispatchEvent(new CustomEvent("stride:edit-panels"));
  };

  return (
    <div
      className="relative flex flex-shrink-0 items-center gap-2 px-[10px]"
      style={{
        height: "32px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {showAddressBar ? (
        <AddressBar
          initialUrl={currentUrl}
          onNavigate={handleNavigate}
          onClose={() => setShowAddressBar(false)}
        />
      ) : (
        <>
          {/* Atrás */}
          <button
            onClick={handleBack}
            disabled={!canGoBack}
            style={{
              width: 22, height: 22,
              background: "transparent", border: "none",
              color: canGoBack ? "var(--text3)" : "var(--border2)",
              cursor: canGoBack ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 4, flexShrink: 0,
            }}
            title="Atrás"
            onMouseEnter={(e) => {
              if (!canGoBack) return;
              const el = e.currentTarget as HTMLElement;
              el.style.background = "var(--elevated)";
              el.style.color = "var(--text2)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "transparent";
              el.style.color = canGoBack ? "var(--text3)" : "var(--border2)";
            }}
          >
            <ChevronLeft size={13} strokeWidth={2} />
          </button>

          {/* Adelante */}
          <button
            onClick={handleForward}
            disabled={!canGoForward}
            style={{
              width: 22, height: 22,
              background: "transparent", border: "none",
              color: canGoForward ? "var(--text3)" : "var(--border2)",
              cursor: canGoForward ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 4, flexShrink: 0,
            }}
            title="Adelante"
            onMouseEnter={(e) => {
              if (!canGoForward) return;
              const el = e.currentTarget as HTMLElement;
              el.style.background = "var(--elevated)";
              el.style.color = "var(--text2)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "transparent";
              el.style.color = canGoForward ? "var(--text3)" : "var(--border2)";
            }}
          >
            <ChevronRight size={13} strokeWidth={2} />
          </button>

          {/* Favicon */}
          <div
            className="flex-shrink-0 flex items-center justify-center rounded"
            style={{ width: 16, height: 16, background: "var(--elevated)", overflow: "hidden" }}
          >
            {faviconUrl && !faviconError ? (
              <img
                src={faviconUrl}
                width={16}
                height={16}
                onError={() => setFaviconError(true)}
                style={{ display: "block" }}
              />
            ) : (
              <span style={{ fontSize: 9, color: "var(--text3)", fontWeight: 600 }}>
                {firstLetter}
              </span>
            )}
          </div>

          {/* Site title — clicable para abrir barra de dirección */}
          <button
            onClick={() => setShowAddressBar(true)}
            className="flex-1 text-left truncate min-w-0 transition-colors"
            style={{
              fontSize: 11, color: "var(--text2)",
              fontWeight: 500,
              background: "none", border: "none", cursor: "pointer",
              padding: 0,
            }}
            title={currentUrl}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text2)"; }}
          >
            {siteTitle || "Nueva página"}
          </button>

          {/* Status dot (activo) */}
          <div
            className="flex-shrink-0 rounded-full"
            style={{
              width: 6, height: 6,
              background: "var(--green)",
              boxShadow: "0 0 5px var(--green)",
            }}
          />

          {/* Recargar */}
          <button
            onClick={handleReload}
            className="flex-shrink-0 flex items-center justify-center rounded transition-all"
            style={{
              width: 22, height: 22,
              background: "transparent", border: "none",
              color: "var(--text3)", cursor: "pointer",
            }}
            title="Recargar"
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "var(--elevated)";
              el.style.color = "var(--text2)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "transparent";
              el.style.color = "var(--text3)";
            }}
          >
            <RotateCcw size={13} strokeWidth={2} />
          </button>

          {/* Ir a URL */}
          <button
            onClick={() => setShowAddressBar(true)}
            className="flex-shrink-0 flex items-center justify-center rounded transition-all"
            style={{
              width: 22, height: 22,
              background: "transparent", border: "none",
              color: "var(--text3)", cursor: "pointer",
            }}
            title="Ir a URL"
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "var(--elevated)";
              el.style.color = "var(--text2)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "transparent";
              el.style.color = "var(--text3)";
            }}
          >
            <Search size={13} strokeWidth={2} />
          </button>

          {/* Widget btn */}
          <button
            onClick={handleWidgetBtn}
            className="flex-shrink-0 flex items-center gap-1 transition-all"
            style={{
              height: 20, padding: "0 8px",
              borderRadius: 5,
              background: "var(--accent-dim)",
              border: "1px solid rgba(124,106,247,0.2)",
              fontSize: 9, color: "var(--accent2)",
              fontFamily: "'Geist Mono', monospace",
              cursor: "pointer",
            }}
            title="Configurar widgets"
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "var(--accent-glow)";
              el.style.borderColor = "rgba(124,106,247,0.4)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "var(--accent-dim)";
              el.style.borderColor = "rgba(124,106,247,0.2)";
            }}
          >
            <LayoutPanelLeft size={10} strokeWidth={2} />
            widget
          </button>
        </>
      )}
    </div>
  );
}
