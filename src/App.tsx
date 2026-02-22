import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
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
  useKeyboardShortcuts();
  useUpdater();

  useEffect(() => {
    // Inicializar DB y sembrar workspaces de ejemplo si es el primer arranque
    getDb()
      .then(() => seedIfNeeded())
      .catch(console.error);
  }, []);

  return <AppShell />;
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
