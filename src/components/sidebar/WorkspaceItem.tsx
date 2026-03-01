import { useRef } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LongPressRing } from "@/components/ui/LongPressRing";
import { useLongPress } from "@/hooks/useLongPress";
import type { Workspace } from "@/types";

interface Props {
  workspace: Workspace;
  isActive: boolean;
  shortcutIndex: number;
  onSelect: () => void;
  onEdit?: () => void;
}

export function WorkspaceItem({ workspace, isActive, shortcutIndex, onSelect, onEdit }: Props) {
  const icon = workspace.icon ?? workspace.name.charAt(0).toUpperCase();
  // Evitar que onClick dispare onSelect justo después de completar el long-press
  const longPressCompleted = useRef(false);

  const { progress, start, cancel } = useLongPress(() => {
    longPressCompleted.current = true;
    onEdit?.();
  }, 2000);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative flex flex-col items-center w-full px-[9px]">
          {/* Indicador activo — barra izquierda */}
          {isActive && (
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-sm"
              style={{ width: "3px", height: "18px", background: "#5b7cf6" }}
            />
          )}
          {/* Área del botón — onMouseLeave cancela si el ratón sale de esta zona.
              Cubre el caso en que el usuario mueve el ratón fuera antes de soltar
              (el mouseup podría caer en un WebView2 nativo y no llegar al React doc). */}
          <div
            style={{ position: "relative", width: 38, height: 38 }}
            onMouseLeave={cancel}
          >
            <button
              onClick={() => {
                // Ignorar el click sintético que el navegador emite tras el long-press
                if (longPressCompleted.current) {
                  longPressCompleted.current = false;
                  return;
                }
                onSelect();
              }}
              onMouseDown={start}
              className="flex items-center justify-center rounded-[9px] transition-colors text-[17px] select-none w-full h-full"
              style={{
                background: isActive ? "rgba(91,124,246,0.18)" : "transparent",
                boxShadow: isActive ? "inset 0 0 0 1px rgba(91,124,246,0.35)" : "none",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              {icon}
            </button>
            {progress > 0 && <LongPressRing progress={progress} size={38} />}
          </div>
          {/* Label debajo del icono */}
          <span
            className="font-mono truncate max-w-full"
            style={{ fontSize: "8px", color: "#6b7280", letterSpacing: "0.05em", marginTop: "2px" }}
          >
            {workspace.name.toLowerCase().slice(0, 7)}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-2">
        <span>{workspace.name}</span>
        {shortcutIndex <= 9 && (
          <span className="text-xs opacity-60">Ctrl+{shortcutIndex}</span>
        )}
        {onEdit && <span className="text-xs opacity-50">· mantén 2s para editar</span>}
      </TooltipContent>
    </Tooltip>
  );
}
