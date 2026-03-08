import { useRef } from "react";
import {
  Briefcase, User, Code2, Palette, DollarSign, Mail,
  Globe, Zap, Star, Home, BookOpen, Film, Music, Layout,
  type LucideIcon,
} from "lucide-react";
import { LongPressRing } from "@/components/ui/LongPressRing";
import { useLongPress } from "@/hooks/useLongPress";
import { useSidebarTooltip } from "@/hooks/useSidebarTooltip";
import type { Workspace } from "@/types";

interface Props {
  workspace: Workspace;
  isActive: boolean;
  shortcutIndex: number;
  onSelect: () => void;
  onEdit?: () => void;
}

// Mapear nombre del workspace a un icono Lucide según palabras clave
function resolveIcon(name: string): LucideIcon | null {
  const n = name.toLowerCase();
  if (n.includes("work") || n.includes("trabajo") || n.includes("office")) return Briefcase;
  if (n.includes("personal") || n.includes("me")) return User;
  if (n.includes("dev") || n.includes("code") || n.includes("prog")) return Code2;
  if (n.includes("design") || n.includes("diseño")) return Palette;
  if (n.includes("finance") || n.includes("money") || n.includes("crypto")) return DollarSign;
  if (n.includes("mail") || n.includes("email") || n.includes("inbox")) return Mail;
  if (n.includes("web") || n.includes("browser")) return Globe;
  if (n.includes("focus") || n.includes("deep")) return Zap;
  if (n.includes("fav") || n.includes("star")) return Star;
  if (n.includes("home") || n.includes("casa")) return Home;
  if (n.includes("learn") || n.includes("study") || n.includes("curso")) return BookOpen;
  if (n.includes("video") || n.includes("media") || n.includes("film")) return Film;
  if (n.includes("music") || n.includes("musica")) return Music;
  if (n.includes("layout") || n.includes("panel")) return Layout;
  return null;
}

export function WorkspaceItem({ workspace, isActive, shortcutIndex, onSelect, onEdit }: Props) {
  const Icon = resolveIcon(workspace.name);
  const emoji = workspace.icon ?? workspace.name.charAt(0).toUpperCase();
  // Evitar que onClick dispare onSelect justo después de completar el long-press
  const longPressCompleted = useRef(false);

  const { progress, start, cancel } = useLongPress(() => {
    longPressCompleted.current = true;
    onEdit?.();
  }, 2000);

  const hint = shortcutIndex <= 9 ? `Ctrl+${shortcutIndex}` : undefined;
  const { showTooltip, hideTooltip } = useSidebarTooltip(workspace.name, hint);

  return (
    <div className="relative flex flex-col items-center w-full px-[7px]">
      {/* Indicador activo — barra izquierda con glow */}
      {isActive && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-sm"
          style={{
            width: "2.5px", height: "20px",
            background: "var(--accent)",
            boxShadow: "0 0 8px var(--accent)",
          }}
        />
      )}
      {/* Área del botón */}
      <div
        style={{ position: "relative", width: 36, height: 36 }}
        onMouseLeave={() => { cancel(); hideTooltip(); }}
      >
        <button
          onClick={() => {
            if (longPressCompleted.current) {
              longPressCompleted.current = false;
              return;
            }
            onSelect();
          }}
          onMouseDown={start}
          onMouseEnter={(e) => {
            if (!isActive) {
              (e.currentTarget as HTMLElement).style.background = "var(--elevated)";
              (e.currentTarget as HTMLElement).style.color = "var(--text2)";
            }
            showTooltip(e);
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--text3)";
            }
          }}
          className="flex items-center justify-center rounded-[10px] transition-all select-none w-full h-full"
          style={{
            background: isActive ? "var(--accent-glow)" : "transparent",
            boxShadow: isActive ? "inset 0 0 0 1px rgba(124,106,247,0.25)" : "none",
            border: "none",
            cursor: "pointer",
            color: isActive ? "var(--accent2)" : "var(--text3)",
            fontSize: "17px",
          }}
        >
          {Icon ? <Icon size={18} strokeWidth={1.8} /> : emoji}
        </button>
        {progress > 0 && <LongPressRing progress={progress} size={36} />}
      </div>
    </div>
  );
}
