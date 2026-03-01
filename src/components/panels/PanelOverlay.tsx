import { ScratchpadWidget } from "@/components/widgets/scratchpad/ScratchpadWidget";
import { NextMeetingWidget } from "@/components/widgets/next-meeting/NextMeetingWidget";
import type { WidgetId } from "@/types";

interface Props {
  widgetId: WidgetId;
  position: "top" | "bottom";
  onCollapse: () => void;
}

const WIDGET_META: Record<WidgetId, { label: string; dotColor: string; lineColor: string }> = {
  "next-meeting": { label: "próxima reunión", dotColor: "var(--accent)", lineColor: "var(--accent)" },
  "scratchpad":   { label: "notas rápidas",   dotColor: "var(--amber)",  lineColor: "var(--amber)" },
};

export function PanelOverlay({ widgetId, position, onCollapse }: Props) {
  const meta = WIDGET_META[widgetId] ?? { label: widgetId, dotColor: "var(--text3)", lineColor: "var(--text3)" };
  const collapseIcon = position === "top" ? "▲" : "▼";

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        height: "100%",
        background: "rgba(19,17,28,0.92)",
        backdropFilter: "blur(20px) saturate(1.4)",
        position: "relative",
      }}
    >
      {/* Línea degradada top/bottom según posición */}
      <div
        style={{
          position: "absolute",
          ...(position === "top"
            ? { top: 0, left: 0, right: 0, height: 1 }
            : { bottom: 0, left: 0, right: 0, height: 1 }),
          background: `linear-gradient(90deg, transparent, ${meta.lineColor}, transparent)`,
          opacity: 0.6,
          pointerEvents: "none",
        }}
      />

      {/* Header del widget */}
      <div className="flex items-center justify-between px-3 pt-[8px] pb-0 flex-shrink-0">
        <div className="flex items-center gap-[6px]">
          <div
            className="rounded-full flex-shrink-0"
            style={{ width: 5, height: 5, background: meta.dotColor }}
          />
          <span
            style={{
              fontSize: 9, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.12em",
              color: "var(--text3)",
              fontFamily: "'Geist Mono', monospace",
            }}
          >
            {meta.label}
          </span>
        </div>
        <button
          onClick={onCollapse}
          className="flex items-center justify-center rounded transition-all"
          style={{
            width: 18, height: 18,
            background: "transparent", border: "none",
            color: "var(--text3)", cursor: "pointer",
            fontSize: 10,
          }}
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
          {collapseIcon}
        </button>
      </div>

      {/* Widget content */}
      <div className="flex-1 overflow-hidden">
        {widgetId === "next-meeting" && <NextMeetingWidget />}
        {widgetId === "scratchpad" && <ScratchpadWidget compact />}
      </div>
    </div>
  );
}

interface CollapsedBarProps {
  widgetId: WidgetId;
  position: "top" | "bottom";
  onExpand: () => void;
}

export function PanelOverlayCollapsedBar({ widgetId, position, onExpand }: CollapsedBarProps) {
  const meta = WIDGET_META[widgetId] ?? { label: widgetId, dotColor: "var(--text3)", lineColor: "var(--text3)" };
  const expandIcon = position === "top" ? "▼" : "▲";

  return (
    <div
      className="flex items-center justify-between px-3 flex-shrink-0"
      style={{
        height: "28px",
        background: "rgba(19,17,28,0.92)",
        backdropFilter: "blur(20px) saturate(1.4)",
        borderTop: position === "bottom" ? "1px solid var(--border)" : undefined,
        borderBottom: position === "top" ? "1px solid var(--border)" : undefined,
        cursor: "pointer",
        position: "relative",
      }}
      onClick={onExpand}
    >
      {/* Línea degradada */}
      <div
        style={{
          position: "absolute",
          ...(position === "top"
            ? { top: 0, left: 0, right: 0, height: 1 }
            : { bottom: 0, left: 0, right: 0, height: 1 }),
          background: `linear-gradient(90deg, transparent, ${meta.lineColor}, transparent)`,
          opacity: 0.5,
          pointerEvents: "none",
        }}
      />
      <div className="flex items-center gap-[6px]">
        <div
          className="rounded-full flex-shrink-0"
          style={{ width: 5, height: 5, background: meta.dotColor }}
        />
        <span
          style={{
            fontSize: 9, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.12em",
            color: "var(--text3)",
            fontFamily: "'Geist Mono', monospace",
          }}
        >
          {meta.label}
        </span>
      </div>
      <span style={{ fontSize: 10, color: "var(--text3)" }}>{expandIcon}</span>
    </div>
  );
}
