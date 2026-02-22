import { WorkspaceItem } from "./WorkspaceItem";
import type { Workspace } from "@/types";

interface Props {
  workspaces: Workspace[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function WorkspaceList({ workspaces, activeId, onSelect }: Props) {
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      {workspaces.map((ws, i) => (
        <WorkspaceItem
          key={ws.id}
          workspace={ws}
          isActive={ws.id === activeId}
          shortcutIndex={i + 1}
          onSelect={() => onSelect(ws.id)}
        />
      ))}
    </div>
  );
}
