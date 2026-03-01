import { useState, useEffect } from "react";

// Datos mock — OAuth con Google Calendar es Fase 2
const MOCK_MEETING = {
  name: "Sprint Planning Q1",
  location: "Google Meet · 45 min",
  time: "11:30 AM",
  attendees: [
    { initial: "A", color: "#5b7cf6" },
    { initial: "M", color: "#9b6ef3" },
    { initial: "R", color: "#f6a35b" },
    { initial: "+4", color: "#7ee8a2", textDark: true },
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
      className="flex items-center gap-4 px-3 py-2 h-full"
      style={{ color: "#e2e4e8" }}
    >
      {/* Countdown block */}
      <div
        className="flex flex-col items-center justify-center flex-shrink-0 rounded-lg px-3 py-2"
        style={{
          background: "rgba(91,124,246,0.1)",
          border: "1px solid rgba(91,124,246,0.2)",
          minWidth: "80px",
        }}
      >
        <span
          className="text-[8px] uppercase tracking-[0.08em]"
          style={{ color: "#5b7cf6" }}
        >
          en
        </span>
        <span
          className="font-mono font-semibold leading-none"
          style={{ fontSize: "22px", letterSpacing: "-0.02em" }}
        >
          {minutesLeft}
          <span className="font-mono" style={{ fontSize: "13px", color: "#6b7280" }}>m</span>
        </span>
        <span className="text-[8px]" style={{ color: "#6b7280" }}>
          {MOCK_MEETING.time}
        </span>
      </div>

      {/* Meeting info */}
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium mb-[3px] truncate">{MOCK_MEETING.name}</div>
        <div className="text-[10px] mb-[5px]" style={{ color: "#6b7280" }}>
          📍 {MOCK_MEETING.location}
        </div>
        {/* Avatares */}
        <div className="flex">
          {MOCK_MEETING.attendees.map((att, i) => (
            <div
              key={i}
              className="flex items-center justify-center rounded-full font-semibold flex-shrink-0"
              style={{
                width: "18px",
                height: "18px",
                background: att.color,
                color: att.textDark ? "#1a1a1a" : "#fff",
                fontSize: "8px",
                marginRight: i < MOCK_MEETING.attendees.length - 1 ? "-5px" : "0",
                border: "1.5px solid #1c1e21",
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
        className="flex-shrink-0 rounded font-semibold"
        style={{
          background: "#5b7cf6",
          color: "#fff",
          border: "none",
          padding: "5px 10px",
          fontSize: "9px",
          cursor: "pointer",
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
        }}
        onClick={() => {/* OAuth Fase 2 */}}
      >
        Unirse →
      </button>
    </div>
  );
}
