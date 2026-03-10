import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { DownloadToast } from "@/components/DownloadToast";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useUpdater } from "@/features/updater/useUpdater";
import { getDb } from "@/lib/db";
import { seedIfNeeded } from "@/lib/seed";
import "@/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AppInner() {
  const [dbReady, setDbReady] = useState(false);

  useKeyboardShortcuts();
  useUpdater();

  useEffect(() => {
    // Inicializar DB y sembrar workspaces ANTES de renderizar AppShell.
    // Sin este await, useWorkspaces() dispara la query con la BD vacía (race condition).
    getDb()
      .then(() => seedIfNeeded())
      .then(() => setDbReady(true))
      .catch((e) => {
        console.error(e);
        setDbReady(true); // Arrancar igualmente aunque falle el seed
      });
  }, []);

  if (!dbReady) return null;
  return (
    <>
      <AppShell />
      <DownloadToast />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppInner />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
