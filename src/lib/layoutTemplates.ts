import type { DynamicLayout, LayoutTemplate } from "@/types";

export function instantiateTemplate(template: LayoutTemplate): DynamicLayout {
  switch (template) {
    case "free":
      return {
        columns: [
          { width_frac: 1, panels: [{ panel_id: crypto.randomUUID(), height_frac: 1 }] },
        ],
      };
    case "double":
      return {
        columns: [
          { width_frac: 0.5, panels: [{ panel_id: crypto.randomUUID(), height_frac: 1 }] },
          { width_frac: 0.5, panels: [{ panel_id: crypto.randomUUID(), height_frac: 1 }] },
        ],
      };
    case "triple":
      return {
        columns: [
          { width_frac: 0.333, panels: [{ panel_id: crypto.randomUUID(), height_frac: 1 }] },
          { width_frac: 0.334, panels: [{ panel_id: crypto.randomUUID(), height_frac: 1 }] },
          { width_frac: 0.333, panels: [{ panel_id: crypto.randomUUID(), height_frac: 1 }] },
        ],
      };
    case "quad":
      return {
        columns: [
          {
            width_frac: 0.5,
            panels: [
              { panel_id: crypto.randomUUID(), height_frac: 0.5 },
              { panel_id: crypto.randomUUID(), height_frac: 0.5 },
            ],
          },
          {
            width_frac: 0.5,
            panels: [
              { panel_id: crypto.randomUUID(), height_frac: 0.5 },
              { panel_id: crypto.randomUUID(), height_frac: 0.5 },
            ],
          },
        ],
      };
  }
}
