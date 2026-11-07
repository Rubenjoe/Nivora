"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";

type ToastOptions = {
  message: string;
  /** Label for the optional action button, e.g. "Undo". */
  actionLabel?: string;
  onAction?: () => void;
  /** How long the toast stays visible, in ms. */
  duration?: number;
};

type ToastItem = Required<Pick<ToastOptions, "message" | "duration">> &
  Pick<ToastOptions, "actionLabel" | "onAction"> & { id: string };

type ToastApi = {
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context)
    throw new Error("useToast must be used inside <ToastProvider>.");
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    ({ message, actionLabel, onAction, duration = 5000 }: ToastOptions) => {
      counter.current += 1;
      const id = `toast-${counter.current}`;
      setItems((current) => [
        ...current.slice(-3),
        { id, message, actionLabel, onAction, duration },
      ]);
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), duration),
      );
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="nv-toasts" role="region" aria-label="Notifications">
        {items.map((item) => (
          <div
            key={item.id}
            className="nv-toast"
            role="status"
            aria-live="polite"
            style={{ ["--toast-ms" as string]: `${item.duration}ms` }}
          >
            <span className="nv-toast-message">{item.message}</span>
            {item.actionLabel && (
              <button
                type="button"
                className="nv-toast-action"
                onClick={() => {
                  item.onAction?.();
                  dismiss(item.id);
                }}
              >
                {item.actionLabel}
              </button>
            )}
            <button
              type="button"
              className="nv-toast-close"
              aria-label="Dismiss notification"
              onClick={() => dismiss(item.id)}
            >
              <X size={14} aria-hidden="true" />
            </button>
            <span className="nv-toast-timer" aria-hidden="true" />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
