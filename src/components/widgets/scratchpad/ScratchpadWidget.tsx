import { Separator } from "@/components/ui/separator";
import { useScratchpad } from "./useScratchpad";

export function ScratchpadWidget() {
  const { content, handleChange, isSaving } = useScratchpad();

  return (
    <div className="flex h-full w-full flex-col bg-background">
      <div className="flex h-10 items-center justify-between px-4">
        <span className="text-sm font-medium">Scratchpad</span>
        {isSaving && (
          <span className="text-xs text-muted-foreground">Guardando…</span>
        )}
      </div>
      <Separator />
      <textarea
        className="flex-1 resize-none bg-transparent p-4 font-mono text-sm outline-none placeholder:text-muted-foreground"
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Escribe aquí tus notas…"
        spellCheck={false}
      />
    </div>
  );
}
