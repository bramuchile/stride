import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Star } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { AddressBar } from "./AddressBar";
import { useUpdatePanel } from "@/hooks/usePanels";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useBookmarks } from "@/hooks/useBookmarks";
import type { Panel, PanelType, WidgetId } from "@/types";

interface Props {
  panel: Panel;
  // Props opcionales para layout dinámico
  dynamicMode?: boolean;
  onAddPanelBelow?: (type: PanelType, widgetId?: WidgetId) => void;
  onAddColumn?: () => void;
  isLastColumn?: boolean;
  onRemovePanel?: () => void;
  canRemove?: boolean;
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

export function PanelHeader({ panel, dynamicMode, onAddPanelBelow, onAddColumn, isLastColumn, onRemovePanel, canRemove }: Props) {
  const [headerHovered, setHeaderHovered] = useState(false);
  const [showAddressBar, setShowAddressBar] = useState(false);
  const [showSplitPopover, setShowSplitPopover] = useState(false);
  const splitPopoverRef = useRef<HTMLDivElement>(null);
  const [currentUrl, setCurrentUrl] = useState(panel.url ?? "");
  const [faviconError, setFaviconError] = useState(false);
  const [history, setHistory] = useState<string[]>(panel.url ? [panel.url] : []);
  const [historyIndex, setHistoryIndex] = useState(0);
  const pendingNav = useRef<"back" | "forward" | null>(null);
  const [showBookmarkPopup, setShowBookmarkPopup] = useState(false);
  const [bookmarkTitle, setBookmarkTitle] = useState("");
  const popupRef = useRef<HTMLDivElement>(null);
  // Beacon dots — tutorial de botones de división
  const [hintSeen, setHintSeen] = useState(() => !!localStorage.getItem("stride_split_hint_seen"));
  const [activeBeacon, setActiveBeacon] = useState<"column" | "row" | null>(null);
  // Beacon estrella — tutorial de favoritos (aparece tras dismissear el hint de split)
  const [bookmarkBeaconVisible, setBookmarkBeaconVisible] = useState(() =>
    !!localStorage.getItem("stride_split_hint_seen") && !localStorage.getItem("stride_bookmark_hint_seen")
  );

  // Sincronizar beacon de split cuando NewTabPage lo dismissea
  useEffect(() => {
    const onSplitDismissed = () => {
      setHintSeen(true);
      setActiveBeacon(null);
      setBookmarkBeaconVisible(!localStorage.getItem("stride_bookmark_hint_seen"));
    };
    const onBookmarkDismissed = () => setBookmarkBeaconVisible(false);
    window.addEventListener("stride:split-hint-dismissed", onSplitDismissed);
    window.addEventListener("stride:bookmark-hint-dismissed", onBookmarkDismissed);
    return () => {
      window.removeEventListener("stride:split-hint-dismissed", onSplitDismissed);
      window.removeEventListener("stride:bookmark-hint-dismissed", onBookmarkDismissed);
    };
  }, []);
  const updatePanel = useUpdatePanel();
  const { setWebviewUrl } = useWorkspaceStore();
  const { bookmarks, isBookmarked, getBookmark, save: saveBookmark, remove: removeBookmark } = useBookmarks();

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

  const bookmarked = isBookmarked(currentUrl);

  // Cerrar popup al hacer click fuera
  useEffect(() => {
    if (!showBookmarkPopup) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowBookmarkPopup(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showBookmarkPopup]);

  // Cerrar popup con Escape
  useEffect(() => {
    if (!showBookmarkPopup) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowBookmarkPopup(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showBookmarkPopup]);

  // Cerrar popover de split al hacer click fuera o Escape
  useEffect(() => {
    if (!showSplitPopover) return;
    const handleClick = (e: MouseEvent) => {
      if (splitPopoverRef.current && !splitPopoverRef.current.contains(e.target as Node)) {
        setShowSplitPopover(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowSplitPopover(false); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [showSplitPopover]);

  // Cerrar tooltip beacon al click fuera o Escape
  useEffect(() => {
    if (!activeBeacon) return;
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-beacon-tooltip]")) setActiveBeacon(null);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setActiveBeacon(null); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [activeBeacon]);

  const dismissHint = () => {
    localStorage.setItem("stride_split_hint_seen", "1");
    setHintSeen(true);
    setActiveBeacon(null);
  };

  // Ocultar/mostrar el WebView del panel cuando hay un overlay flotante.
  // WebView2 es una ventana nativa y siempre se renderiza encima del HTML,
  // ignorando z-index. Solución: hide() mientras el overlay esté abierto.
  const isOverlayOpen = showBookmarkPopup || showAddressBar || showSplitPopover || activeBeacon !== null;
  useEffect(() => {
    const panelId = panel.id;
    if (isOverlayOpen) {
      invoke("hide_panel_webview", { panelId }).catch(console.error);
    } else {
      invoke("show_panel_webview", { panelId }).catch(console.error);
    }
  }, [isOverlayOpen, panel.id]);

  const handleStarClick = () => {
    const bm = getBookmark(currentUrl);
    setBookmarkTitle(bm?.title ?? siteTitle);
    setShowBookmarkPopup(true);
  };

  return (
    <div
      className="relative flex flex-shrink-0 items-center gap-2 px-[10px]"
      onMouseEnter={() => setHeaderHovered(true)}
      onMouseLeave={() => setHeaderHovered(false)}
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
          bookmarks={bookmarks}
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

          {/* Estrella — guardar marcador */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={handleStarClick}
              style={{
                width: 22, height: 22,
                background: bookmarkBeaconVisible ? "rgba(124,106,245,0.18)" : "transparent",
                border: bookmarkBeaconVisible ? "1px solid rgba(124,106,245,0.55)" : "none",
                color: bookmarked ? "var(--accent)" : "var(--text3)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 4,
                filter: bookmarked ? "drop-shadow(0 0 4px rgba(124,106,247,0.5))" : "none",
                transition: "color 0.15s, filter 0.15s, background 0.15s, border-color 0.15s",
              }}
              title={bookmarked ? "Guardado en marcadores" : "Guardar marcador"}
              onMouseEnter={(e) => {
                if (!bookmarked) (e.currentTarget as HTMLElement).style.color = "var(--text2)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = bookmarked ? "var(--accent)" : "var(--text3)";
              }}
            >
              <Star size={13} strokeWidth={2} fill={bookmarked ? "var(--accent)" : "none"} />
            </button>

            {/* Beacon pulsante — visible durante el hint de bookmarks */}
            {bookmarkBeaconVisible && (
              <>
                <style>{`@keyframes ph-beacon-pulse { 0%{transform:scale(1);opacity:0.9} 100%{transform:scale(2.4);opacity:0} }`}</style>
                <div style={{ position: "absolute", top: -4, right: -4, width: 8, height: 8, pointerEvents: "none", zIndex: 10 }}>
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: "50%",
                    background: "rgba(124,106,245,0.55)",
                    animation: "ph-beacon-pulse 2.5s infinite ease-out",
                  }} />
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#7c6af5" }} />
                </div>
              </>
            )}
          </div>

          {/* Popup marcador */}
          {showBookmarkPopup && (
            <div
              ref={popupRef}
              style={{
                position: "absolute",
                top: "36px",
                right: "48px",
                zIndex: 200,
                background: "var(--elevated)",
                border: "1px solid var(--border2)",
                borderRadius: 10,
                padding: "12px",
                width: 240,
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {faviconUrl && (
                  <img
                    src={faviconUrl}
                    width={20} height={20}
                    style={{ borderRadius: 4, flexShrink: 0 }}
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                  />
                )}
                <span style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600 }}>
                  {bookmarked ? "Marcador guardado" : "Guardar marcador"}
                </span>
              </div>
              <input
                type="text"
                value={bookmarkTitle}
                onChange={(e) => setBookmarkTitle(e.target.value)}
                autoFocus
                style={{
                  background: "var(--base-deep)",
                  border: "1px solid var(--border2)",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 11,
                  color: "var(--text)",
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border2)"; }}
              />
              <div style={{ display: "flex", gap: 6 }}>
                {bookmarked ? (
                  <>
                    <button
                      onClick={async () => {
                        const bm = getBookmark(currentUrl);
                        if (bm) await removeBookmark(bm.id);
                        setShowBookmarkPopup(false);
                      }}
                      style={{
                        flex: 1, height: 26, borderRadius: 6,
                        background: "transparent",
                        border: "1px solid var(--border2)",
                        color: "var(--red)", fontSize: 11, cursor: "pointer",
                      }}
                    >
                      Eliminar
                    </button>
                    <button
                      onClick={async () => {
                        await saveBookmark(bookmarkTitle, currentUrl, faviconUrl ?? undefined);
                        setShowBookmarkPopup(false);
                      }}
                      style={{
                        flex: 1, height: 26, borderRadius: 6,
                        background: "var(--accent)", border: "none",
                        color: "#fff", fontSize: 11, cursor: "pointer", fontWeight: 600,
                      }}
                    >
                      Guardar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={async () => {
                      await saveBookmark(bookmarkTitle, currentUrl, faviconUrl ?? undefined);
                      setShowBookmarkPopup(false);
                    }}
                    style={{
                      flex: 1, height: 26, borderRadius: 6,
                      background: "var(--accent)", border: "none",
                      color: "#fff", fontSize: 11, cursor: "pointer", fontWeight: 600,
                    }}
                  >
                    Guardar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Botones de layout dinámico — solo cuando dynamicMode === true */}
          {dynamicMode && (
            <>
              {/* Botón dividir panel (añadir fila debajo) */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowSplitPopover(v => !v)}
                  title="Dividir panel"
                  style={{
                    width: 22, height: 22,
                    background: showSplitPopover ? "var(--elevated)" : "transparent",
                    border: "none",
                    color: showSplitPopover ? "var(--accent)" : "var(--text3)",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: 4, flexShrink: 0, transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = "var(--elevated)";
                    el.style.color = "var(--accent)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = showSplitPopover ? "var(--elevated)" : "transparent";
                    el.style.color = showSplitPopover ? "var(--accent)" : "var(--text3)";
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <rect x="1" y="1" width="11" height="5" rx="1.5"
                      stroke="currentColor" strokeWidth="1.2"/>
                    <rect x="1" y="7" width="11" height="5" rx="1.5"
                      stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                </button>

                {/* Beacon dot — btn-split-h */}
                {!hintSeen && (
                  <div
                    style={{ position: "absolute", top: -4, right: -4, width: 8, height: 8, cursor: "pointer", zIndex: 10 }}
                    onClick={(e) => { e.stopPropagation(); setActiveBeacon(activeBeacon === "row" ? null : "row"); }}
                    data-beacon-tooltip
                  >
                    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#7c6af5",
                      animation: "beacon-ring 2.5s infinite", opacity: 0 }} />
                    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#7c6af5" }} />
                    <style>{`@keyframes beacon-ring { 0%{transform:scale(1);opacity:0.9} 100%{transform:scale(2.4);opacity:0} }`}</style>
                  </div>
                )}

                {/* Tooltip beacon fila */}
                {activeBeacon === "row" && (
                  <div
                    data-beacon-tooltip
                    style={{
                      position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 200,
                      background: "#17152a", border: "1px solid rgba(124,106,245,0.25)",
                      borderRadius: 10, padding: "12px 13px", width: 205,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.75)", marginBottom: 5 }}>
                      Agregar fila
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10, lineHeight: 1.5 }}>
                      Divide el panel en dos filas para mayor densidad de información.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>2 de 2</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={dismissHint} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "rgba(255,255,255,0.3)", padding: "3px 6px" }}>
                          Omitir
                        </button>
                        <button onClick={dismissHint} style={{ background: "var(--accent)", border: "none", cursor: "pointer", fontSize: 11, color: "#fff", padding: "3px 10px", borderRadius: 5, fontWeight: 600 }}>
                          Entendido
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Popover de selección de tipo */}
                {showSplitPopover && onAddPanelBelow && (
                  <div
                    ref={splitPopoverRef}
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      right: 0,
                      zIndex: 200,
                      minWidth: 160,
                      background: "var(--elevated2)",
                      border: "1px solid var(--border2)",
                      borderRadius: 10,
                      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                      padding: "6px 4px",
                    }}
                  >
                    {([
                      { type: "WEB" as const, icon: "🌐", label: "Navegador web", highlight: true },
                      { type: "WIDGET" as const, widgetId: "notes" as WidgetId, icon: "📝", label: "Notas" },
                      { type: "WIDGET" as const, widgetId: "next-meeting" as WidgetId, icon: "📅", label: "Próxima reunión" },
                      { type: "WIDGET" as const, widgetId: "weather" as WidgetId, icon: "🌤️", label: "Clima" },
                    ]).map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          onAddPanelBelow(opt.type, "widgetId" in opt ? opt.widgetId : undefined);
                          setShowSplitPopover(false);
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "6px 10px", borderRadius: 6,
                          cursor: "pointer", fontSize: 12,
                          color: opt.highlight ? "var(--accent)" : "var(--text2)",
                          background: "transparent", border: "none",
                          width: "100%", textAlign: "left",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = opt.highlight
                            ? "rgba(124,106,247,0.08)" : "var(--elevated)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <span style={{ fontSize: 14 }}>{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Botón añadir columna — solo en la última columna */}
              {isLastColumn && onAddColumn && (
                <div style={{ position: "relative" }}>
                  <button
                    onClick={onAddColumn}
                    title="Añadir columna"
                    style={{
                      width: 22, height: 22,
                      background: "transparent", border: "none",
                      color: "var(--text3)", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      borderRadius: 4, flexShrink: 0, transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "var(--elevated)";
                      el.style.color = "var(--accent)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "transparent";
                      el.style.color = "var(--text3)";
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <rect x="1" y="1" width="6" height="11" rx="1.5"
                        stroke="currentColor" strokeWidth="1.2"/>
                      <rect x="9" y="4" width="3" height="5" rx="1"
                        stroke="currentColor" strokeWidth="1.2"
                        strokeDasharray="2 1"/>
                      <line x1="10.5" y1="5.5" x2="10.5" y2="7.5"
                        stroke="currentColor" strokeWidth="1.2"/>
                      <line x1="9.5" y1="6.5" x2="11.5" y2="6.5"
                        stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                  </button>

                  {/* Beacon dot — btn-split-v */}
                  {!hintSeen && (
                    <div
                      style={{ position: "absolute", top: -4, right: -4, width: 8, height: 8, cursor: "pointer", zIndex: 10 }}
                      onClick={(e) => { e.stopPropagation(); setActiveBeacon(activeBeacon === "column" ? null : "column"); }}
                      data-beacon-tooltip
                    >
                      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#7c6af5",
                        animation: "beacon-ring 2.5s infinite 0.4s", opacity: 0 }} />
                      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#7c6af5" }} />
                    </div>
                  )}

                  {/* Tooltip beacon columna */}
                  {activeBeacon === "column" && (
                    <div
                      data-beacon-tooltip
                      style={{
                        position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 200,
                        background: "#17152a", border: "1px solid rgba(124,106,245,0.25)",
                        borderRadius: 10, padding: "12px 13px", width: 205,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.75)", marginBottom: 5 }}>
                        Dividir en columnas
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10, lineHeight: 1.5 }}>
                        Abre un segundo panel en paralelo. Navega dos sitios a la vez.
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>1 de 2</span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={dismissHint} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "rgba(255,255,255,0.3)", padding: "3px 6px" }}>
                            Omitir
                          </button>
                          <button onClick={() => setActiveBeacon("row")} style={{ background: "var(--accent)", border: "none", cursor: "pointer", fontSize: 11, color: "#fff", padding: "3px 10px", borderRadius: 5, fontWeight: 600 }}>
                            Siguiente →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botón cerrar panel */}
              {canRemove && onRemovePanel && (
                <button
                  onClick={onRemovePanel}
                  title="Cerrar panel"
                  style={{
                    width: 22, height: 22,
                    background: "transparent", border: "none",
                    color: "var(--text3)", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: 4, flexShrink: 0, transition: "all 0.15s",
                    opacity: headerHovered ? 1 : 0,
                    pointerEvents: headerHovered ? "auto" : "none",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = "rgba(239,68,68,0.12)";
                    el.style.color = "var(--red)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = "transparent";
                    el.style.color = "var(--text3)";
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </>
          )}

        </>
      )}
    </div>
  );
}
