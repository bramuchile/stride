import { useState } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { Button } from "@/components/ui/button";
import { formatErrorForClipboard } from "@/hooks/useErrorHandler";
import type { AppError } from "@/types";

interface Props {
  error: AppError;
  onRetry?: () => void;
}

export function ErrorDisplay({ error, onRetry }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = formatErrorForClipboard(error);
    await writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="max-w-md rounded-lg border border-destructive/30 bg-destructive/10 p-6">
        <h2 className="mb-2 text-lg font-semibold text-destructive">
          Algo salió mal
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">{error.message}</p>
        <div className="flex gap-2 justify-center flex-wrap">
          <Button variant="outline" onClick={handleCopy}>
            {copied ? "¡Copiado!" : "Copiar error"}
          </Button>
          {onRetry && (
            <Button variant="default" onClick={onRetry}>
              Reintentar
            </Button>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Pega el error en{" "}
          <span className="font-mono">GitHub Issues</span> para reportarlo.
        </p>
      </div>
    </div>
  );
}
