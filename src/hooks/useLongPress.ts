import { useCallback, useLayoutEffect, useRef, useState } from "react";

/**
 * Hook para detectar pulsación larga (long-press).
 * Usa requestAnimationFrame para actualizar el progreso suavemente.
 *
 * Cancelación dual (más fiable):
 * 1. document mouseup — captura la mayoría de los releases.
 * 2. onMouseLeave en el elemento — cubre el caso en que el usuario mueve el ratón a
 *    un WebView2 nativo antes de soltar (el mouseup de document no llega al React doc).
 *
 * @param onComplete - Callback disparado cuando se completa la duración
 * @param duration   - Milisegundos para completar (default: 2000)
 */
export function useLongPress(onComplete: () => void, duration = 2000) {
  const rafRef = useRef<number | null>(null);
  const mouseUpCleanupRef = useRef<(() => void) | null>(null);
  const [progress, setProgress] = useState(0);

  // useLayoutEffect garantiza que el ref esté actualizado antes del próximo frame del RAF
  const onCompleteRef = useRef(onComplete);
  useLayoutEffect(() => {
    onCompleteRef.current = onComplete;
  });

  const cancel = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (mouseUpCleanupRef.current) {
      mouseUpCleanupRef.current();
      mouseUpCleanupRef.current = null;
    }
    setProgress(0);
  }, []);

  const start = useCallback(() => {
    if (rafRef.current !== null) return; // evitar múltiples RAFs en paralelo

    const t0 = performance.now();
    const tick = (now: number) => {
      const pct = Math.min(((now - t0) / duration) * 100, 100);
      if (pct >= 100) {
        rafRef.current = null;
        // Limpiar listener de mouseup antes de llamar onComplete para evitar
        // que el release posterior llame cancel() y cause un setState inesperado
        if (mouseUpCleanupRef.current) {
          mouseUpCleanupRef.current();
          mouseUpCleanupRef.current = null;
        }
        setProgress(0);
        onCompleteRef.current();
        return;
      }
      setProgress(pct);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    // Cancelación primaria: mouseup a nivel documento
    const onMouseUp = () => {
      mouseUpCleanupRef.current = null;
      cancel();
    };
    document.addEventListener("mouseup", onMouseUp, { once: true });
    mouseUpCleanupRef.current = () => document.removeEventListener("mouseup", onMouseUp);
  }, [cancel, duration]);

  return { progress, start, cancel };
}
