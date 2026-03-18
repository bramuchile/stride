import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { DownloadToast } from "@/components/DownloadToast";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useUpdater } from "@/features/updater/useUpdater";
import { getDb } from "@/lib/db";
import { seedIfNeeded } from "@/lib/seed";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import "@/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AppInner() {
  const [dbReady, setDbReady] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const setPresentationMode = useWorkspaceStore((s) => s.setPresentationMode);

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

  // Verificar si el onboarding ya fue completado y cargar ajustes persistidos
  useEffect(() => {
    if (!dbReady) return;
    getDb().then(async (db) => {
      const [onboardingRows, presentationRows] = await Promise.all([
        db.select<{ value: string }[]>(
          "SELECT value FROM settings WHERE key = $1",
          ["onboarding_v1"]
        ),
        db.select<{ value: string }[]>(
          "SELECT value FROM settings WHERE key = $1",
          ["presentation_mode"]
        ),
      ]);
      setOnboardingDone(onboardingRows.length > 0 && onboardingRows[0].value === "done");
      if (presentationRows.length > 0 && presentationRows[0].value === "1") {
        setPresentationMode(true);
      }
    });
  }, [dbReady, setPresentationMode]);

  if (!dbReady || onboardingDone === null) return null;

  if (onboardingDone === false) {
    return <OnboardingFlow onComplete={() => setOnboardingDone(true)} />;
  }

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
