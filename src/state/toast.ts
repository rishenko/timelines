import { useCallback, useEffect, useState } from 'react';

export type ToastKind = 'info' | 'error';
export interface Toast {
  text: string;
  kind: ToastKind;
  /** Changes with every message, so a repeated message restarts its animation. */
  n: number;
}
export type Notify = (text: string, kind?: ToastKind) => void;

/** A short status message that clears itself after 3.5 s. `initial` shows one on opening. */
export function useToast(initial: string | null = null) {
  const [toast, setToast] = useState<Toast | null>(() => (initial ? { text: initial, kind: 'info', n: 0 } : null));
  const notify = useCallback<Notify>((text, kind = 'info') => setToast({ text, kind, n: Date.now() }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  return [toast, notify] as const;
}
