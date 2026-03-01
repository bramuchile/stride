import { Separator } from "@/components/ui/separator";
import { useScratchpad } from "./useScratchpad";

interface Props {
  // Modo compacto: sin header propio (lo maneja PanelOverlay)
  compact?: boolean;
}

export function ScratchpadWidget({ compact = false }: Props) {
  const { content, handleChange, isSaving } = useScratchpad();

  return (
    <div className="flex h-full w-full flex-col bg-transparent">
      {!compact && (
        <>
          <div className="flex h-10 items-center justify-between px-4">
            <span className="text-sm font-medium">Scratchpad</span>
            {isSaving && (
              <span className="text-xs text-muted-foreground">Guardando…</span>
            )}
          </div>
          <Separator />
        </>
      )}
      <textarea
        className="flex-1 resize-none bg-transparent p-3 font-mono text-[10px] outline-none placeholder:text-muted-foreground leading-relaxed"
        style={{ color: "#9ca3af" }}
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Escribe aquí tus notas…"
        spellCheck={false}
      />
    </div>
  );
}
