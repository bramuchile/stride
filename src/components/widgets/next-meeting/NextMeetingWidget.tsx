import { useState, useEffect } from "react";
import { Video } from "lucide-react";

// Datos mock — OAuth con Google Calendar es Fase 2
const MOCK_MEETING = {
  name: "Sprint Planning Q1",
  time: "11:30 AM",
  tags: ["📍 Google Meet", "⏱ 45 min"],
  attendees: [
    { initial: "A", bg: "#7C6AF7", textColor: "#fff" },
    { initial: "M", bg: "#9B6EF7", textColor: "#fff" },
    { initial: "R", bg: "#FB923C", textColor: "#fff" },
    { initial: "+4", bg: "var(--elevated)", textColor: "var(--text3)" },
  ],
};

const INITIAL_MINUTES = 24;

export function NextMeetingWidget() {
  const [minutesLeft, setMinutesLeft] = useState(INITIAL_MINUTES);

  useEffect(() => {
    const interval = setInterval(() => {
      setMinutesLeft((m) => (m > 0 ? m - 1 : 0));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="flex items-center gap-[14px] px-3 py-2 h-full"
      style={{ color: "var(--text)" }}
    >
      {/* Countdown box */}
      <div
        className="flex flex-col items-center justify-center flex-shrink-0"
        style={{
          background: "var(--accent-dim)",
          border: "1px solid rgba(124,106,247,0.2)",
          borderRadius: 10,
          padding: "8px 14px",
          minWidth: 88,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Línea degradada inferior */}
        <div
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
            background: "linear-gradient(90deg, var(--accent), var(--accent2))",
            borderRadius: "0 0 10px 10px",
          }}
        />
        <span
          style={{
            fontSize: 8, color: "var(--accent2)",
            fontFamily: "'Geist Mono', monospace",
            letterSpacing: "0.1em", textTransform: "uppercase",
            marginBottom: 2,
          }}
        >
          en
        </span>
        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: 28, fontWeight: 600,
            color: "var(--text)", lineHeight: 1,
            letterSpacing: "-0.03em",
          }}
        >
          {minutesLeft}
          <span style={{ fontSize: 12, color: "var(--text3)", fontWeight: 400 }}>m</span>
        </span>
        <span
          style={{
            fontSize: 9, color: "var(--text3)",
            fontFamily: "'Geist Mono', monospace",
            marginTop: 2,
          }}
        >
          {MOCK_MEETING.time}
        </span>
      </div>

      {/* Meeting info */}
      <div className="flex-1 min-w-0">
        <div
          className="truncate"
          style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 3 }}
        >
          {MOCK_MEETING.name}
        </div>

        {/* Tags pills */}
        <div className="flex items-center gap-2 mb-2" style={{ flexWrap: "wrap" }}>
          {MOCK_MEETING.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 9, color: "var(--text3)",
                fontFamily: "'Geist Mono', monospace",
                background: "var(--elevated)",
                border: "1px solid var(--border2)",
                borderRadius: 4,
                padding: "1px 6px",
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Avatares */}
        <div className="flex items-center">
          {MOCK_MEETING.attendees.map((att, i) => (
            <div
              key={i}
              className="flex items-center justify-center rounded-full font-semibold flex-shrink-0"
              style={{
                width: 20, height: 20,
                background: att.bg,
                color: att.textColor,
                fontSize: 8,
                marginLeft: i === 0 ? 0 : "-5px",
                border: "2px solid var(--base-deep)",
                zIndex: MOCK_MEETING.attendees.length - i,
                position: "relative",
              }}
            >
              {att.initial}
            </div>
          ))}
        </div>
      </div>

      {/* Join button */}
      <button
        className="flex-shrink-0 flex items-center gap-[5px] transition-all"
        style={{
          height: 30, padding: "0 14px",
          background: "linear-gradient(135deg, var(--accent) 0%, #9B6EF7 100%)",
          border: "none", borderRadius: 8,
          fontSize: 11, fontWeight: 600, color: "#fff",
          cursor: "pointer", whiteSpace: "nowrap",
          fontFamily: "'Instrument Sans', sans-serif",
          boxShadow: "0 4px 16px rgba(124,106,247,0.3)",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = "translateY(-1px)";
          el.style.boxShadow = "0 6px 20px rgba(124,106,247,0.45)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = "translateY(0)";
          el.style.boxShadow = "0 4px 16px rgba(124,106,247,0.3)";
        }}
        onClick={() => {/* OAuth Fase 2 */}}
      >
        <Video size={12} strokeWidth={2} />
        Unirse
      </button>
    </div>
  );
}
