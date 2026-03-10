import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Download, CheckCircle, XCircle, X } from "lucide-react";

interface Toast {
  id: string;
  filename: string;
  status: "downloading" | "done" | "error";
}

export function DownloadToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  useEffect(() => {
    const unlistenStart = listen<string>("download-started", (e) => {
      const id = Date.now().toString();
      setToasts((prev) => [
        ...prev,
        { id, filename: e.payload, status: "downloading" },
      ]);
    });

    const unlistenFinish = listen<{ filename: string; success: boolean }>(
      "download-finished",
      (e) => {
        const { filename, success } = e.payload;
        setToasts((prev) =>
          prev.map((t) =>
            t.filename === filename
              ? { ...t, status: success ? "done" : "error" }
              : t
          )
        );
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.filename !== filename));
        }, success ? 4000 : 6000);
      }
    );

    return () => {
      unlistenStart.then((fn) => fn());
      unlistenFinish.then((fn) => fn());
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background: "var(--elevated)",
            border: "1px solid var(--border2)",
            borderRadius: 8,
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 240,
            maxWidth: 320,
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            pointerEvents: "auto",
            animation: "toastSlideIn 0.2s ease",
          }}
        >
          {/* Icono según estado */}
          <div style={{ flexShrink: 0 }}>
            {toast.status === "downloading" && (
              <Download size={14} color="var(--accent)" />
            )}
            {toast.status === "done" && (
              <CheckCircle size={14} color="var(--green)" />
            )}
            {toast.status === "error" && (
              <XCircle size={14} color="var(--red)" />
            )}
          </div>

          {/* Texto */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                color: "var(--text)",
                fontWeight: 500,
                fontFamily: "'Instrument Sans', sans-serif",
              }}
            >
              {toast.status === "downloading" && "Descargando"}
              {toast.status === "done" && "Descargado"}
              {toast.status === "error" && "Error al descargar"}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text3)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontFamily: "'Geist Mono', monospace",
              }}
            >
              {toast.filename}
            </div>
          </div>

          {/* Botón cerrar (solo cuando no está descargando) */}
          {toast.status !== "downloading" && (
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text3)",
                cursor: "pointer",
                padding: 2,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
