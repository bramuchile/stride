import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Workspace } from "@/types";

interface Props {
  workspace: Workspace;
  isActive: boolean;
  shortcutIndex: number;
  onSelect: () => void;
}

export function WorkspaceItem({ workspace, isActive, shortcutIndex, onSelect }: Props) {
  const letter = workspace.name.charAt(0).toUpperCase();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onSelect}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition-colors",
            isActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {letter}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-2">
        <span>{workspace.name}</span>
        {shortcutIndex <= 9 && (
          <span className="text-xs opacity-60">Ctrl+{shortcutIndex}</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
