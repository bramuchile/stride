import type { ReactNode } from "react";
import {
  Monitor, Code2, Globe, LayoutDashboard, Bookmark, Zap,
  Music, Mail, Camera, BarChart2, Terminal, Cpu,
  type LucideIcon,
} from "lucide-react";
import type { LayoutTemplate } from "@/types";

export const ICON_OPTIONS: { name: string; Icon: LucideIcon }[] = [
  { name: "Monitor",         Icon: Monitor },
  { name: "Code2",           Icon: Code2 },
  { name: "Globe",           Icon: Globe },
  { name: "LayoutDashboard", Icon: LayoutDashboard },
  { name: "Bookmark",        Icon: Bookmark },
  { name: "Zap",             Icon: Zap },
  { name: "Music",           Icon: Music },
  { name: "Mail",            Icon: Mail },
  { name: "Camera",          Icon: Camera },
  { name: "BarChart2",       Icon: BarChart2 },
  { name: "Terminal",        Icon: Terminal },
  { name: "Cpu",             Icon: Cpu },
];

export const TEMPLATE_NAMES: Record<LayoutTemplate, string> = {
  free:   "Mi workspace",
  double: "Workspace dividido",
  triple: "Workspace triple",
  quad:   "Workspace grid",
};

export const LAYOUT_OPTIONS: {
  value: LayoutTemplate;
  label: string;
  description: string;
  preview: (active: boolean) => ReactNode;
}[] = [
  {
    value: "free",
    label: "Libre",
    description: "Empieza en blanco, agrega paneles libremente",
    preview: (active) => (
      <svg width="44" height="30" viewBox="0 0 44 30">
        <rect x="2" y="2" width="16" height="11" rx="2"
          fill={active ? "rgba(124,106,247,0.3)" : "rgba(255,255,255,0.06)"}
          stroke={active ? "rgba(124,106,247,0.6)" : "rgba(255,255,255,0.1)"}
          strokeWidth="1"
        />
        <rect x="2" y="17" width="16" height="11" rx="2"
          fill={active ? "rgba(124,106,247,0.2)" : "rgba(255,255,255,0.04)"}
          stroke={active ? "rgba(124,106,247,0.6)" : "rgba(255,255,255,0.1)"}
          strokeWidth="1"
        />
        <rect x="26" y="2" width="16" height="26" rx="2"
          fill={active ? "rgba(124,106,247,0.15)" : "rgba(255,255,255,0.04)"}
          stroke={active ? "rgba(124,106,247,0.6)" : "rgba(255,255,255,0.1)"}
          strokeWidth="1"
        />
        <text x="34" y="19" fontSize="8" fill={active ? "rgba(124,106,247,0.9)" : "rgba(255,255,255,0.3)"} textAnchor="middle">+</text>
      </svg>
    ),
  },
  {
    value: "double",
    label: "Doble",
    description: "2 columnas iguales",
    preview: (active) => (
      <svg width="44" height="30" viewBox="0 0 44 30">
        <rect x="2" y="2" width="18" height="26" rx="3"
          fill={active ? "rgba(124,106,247,0.3)" : "rgba(255,255,255,0.06)"}
          stroke={active ? "rgba(124,106,247,0.6)" : "rgba(255,255,255,0.1)"}
          strokeWidth="1"
        />
        <rect x="24" y="2" width="18" height="26" rx="3"
          fill={active ? "rgba(124,106,247,0.2)" : "rgba(255,255,255,0.04)"}
          stroke={active ? "rgba(124,106,247,0.6)" : "rgba(255,255,255,0.1)"}
          strokeWidth="1"
        />
      </svg>
    ),
  },
  {
    value: "triple",
    label: "Triple",
    description: "3 columnas iguales",
    preview: (active) => (
      <svg width="44" height="30" viewBox="0 0 44 30">
        {[0, 1, 2].map((i) => (
          <rect key={i}
            x={2 + i * 14} y="2" width="10" height="26" rx="2"
            fill={active ? `rgba(124,106,247,${0.3 - i * 0.08})` : "rgba(255,255,255,0.06)"}
            stroke={active ? "rgba(124,106,247,0.6)" : "rgba(255,255,255,0.1)"}
            strokeWidth="1"
          />
        ))}
      </svg>
    ),
  },
  {
    value: "quad",
    label: "Cuádruple",
    description: "2 columnas con 2 paneles cada una",
    preview: (active) => (
      <svg width="44" height="30" viewBox="0 0 44 30">
        {([[2, 2], [24, 2], [2, 17], [24, 17]] as [number, number][]).map(([x, y], i) => (
          <rect key={i}
            x={x} y={y} width="18" height="11" rx="2"
            fill={active ? `rgba(124,106,247,${0.3 - i * 0.05})` : "rgba(255,255,255,0.06)"}
            stroke={active ? "rgba(124,106,247,0.6)" : "rgba(255,255,255,0.1)"}
            strokeWidth="1"
          />
        ))}
      </svg>
    ),
  },
];
