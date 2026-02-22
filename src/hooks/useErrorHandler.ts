import { getVersion } from "@tauri-apps/api/app";
import type { AppError } from "@/types";

export async function formatError(
  error: unknown,
  context?: string
): Promise<AppError> {
  const version = await getVersion().catch(() => "unknown");
  const err = error instanceof Error ? error : new Error(String(error));

  return {
    message: err.message,
    stack: err.stack,
    context,
    timestamp: new Date().toISOString(),
    version,
  };
}

export function formatErrorForClipboard(appError: AppError): string {
  return [
    `**Stride Error Report**`,
    `Version: ${appError.version}`,
    `Time: ${appError.timestamp}`,
    `Context: ${appError.context ?? "unknown"}`,
    ``,
    `**Error:**`,
    appError.message,
    ``,
    `**Stack:**`,
    "```",
    appError.stack ?? "No stack trace",
    "```",
  ].join("\n");
}
