"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  CircleHelp,
  CreditCard,
  FileText,
  Goal,
  LayoutDashboard,
  Moon,
  Repeat,
  Search,
  Settings2,
  Wallet,
} from "lucide-react";
import { toggleTheme } from "@/components/theme-toggle";

type Command = {
  id: string;
  label: string;
  hint: string;
  icon: typeof LayoutDashboard;
  run: () => void;
};

/**
 * ⌘K command palette — glass overlay, gold/purple active bar, full keyboard
 * support. Styled entirely by nivora-motion.css §4 with the repo's own tokens.
 */
export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const commands: Command[] = useMemo(
    () => [
      {
        id: "go-dashboard",
        label: "Go to Dashboard",
        hint: "Navigation",
        icon: LayoutDashboard,
        run: () => router.push("/"),
      },
      {
        id: "go-transactions",
        label: "Go to Transactions",
        hint: "Navigation",
        icon: CreditCard,
        run: () => router.push("/transactions"),
      },
      {
        id: "go-budgets",
        label: "Go to Budgets",
        hint: "Navigation",
        icon: Wallet,
        run: () => router.push("/budgets"),
      },
      {
        id: "go-analytics",
        label: "Go to Analytics",
        hint: "Navigation",
        icon: BarChart3,
        run: () => router.push("/analytics"),
      },
      {
        id: "go-reports",
        label: "Go to Monthly Review",
        hint: "Navigation",
        icon: FileText,
        run: () => router.push("/reports"),
      },
      {
        id: "go-goals",
        label: "Go to Goals",
        hint: "Navigation",
        icon: Goal,
        run: () => router.push("/goals"),
      },
      {
        id: "go-recurring",
        label: "Go to Recurring",
        hint: "Navigation",
        icon: Repeat,
        run: () => router.push("/recurring"),
      },
      {
        id: "go-settings",
        label: "Go to Settings",
        hint: "Navigation",
        icon: Settings2,
        run: () => router.push("/settings"),
      },
      {
        id: "go-help",
        label: "Go to Help & Support",
        hint: "Navigation",
        icon: CircleHelp,
        run: () => router.push("/help"),
      },
      {
        id: "theme",
        label: "Switch light / dark theme",
        hint: "Appearance",
        icon: Moon,
        run: () => toggleTheme(),
      },
    ],
    [router],
  );

  /* Fuzzy-ish filter: subsequence match on the label. */
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => {
      const label = c.label.toLowerCase();
      let i = 0;
      for (const ch of q) {
        i = label.indexOf(ch, i);
        if (i === -1) return false;
        i += 1;
      }
      return true;
    });
  }, [commands, query]);

  /* Reset + focus + scroll-lock on open. */
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = setTimeout(() => {
      setQuery("");
      setIndex(0);
      inputRef.current?.focus();
    }, 20);
    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus({ preventScroll: true });
      previousFocusRef.current = null;
    };
  }, [open]);

  /* Keep the highlighted item in view. */
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!open) return null;

  const runCommand = (command: Command) => {
    onClose();
    // Let the overlay unmount before navigating for a clean transition.
    setTimeout(() => command.run(), 10);
  };

  return (
    <div
      className="nv-cmdk-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="nv-cmdk-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
            return;
          }
          if (event.key !== "Tab") return;

          const focusable = Array.from(
            panelRef.current?.querySelectorAll<HTMLElement>(
              'input:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
            ) ?? [],
          );
          if (focusable.length === 0) {
            event.preventDefault();
            return;
          }

          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          const active = document.activeElement;
          if (
            event.shiftKey &&
            (active === first || !panelRef.current?.contains(active))
          ) {
            event.preventDefault();
            last.focus();
          } else if (
            !event.shiftKey &&
            (active === last || !panelRef.current?.contains(active))
          ) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <div className="nv-cmdk-inputrow">
          <Search size={15} aria-hidden="true" />
          <input
            ref={inputRef}
            className="nv-cmdk-input"
            value={query}
            role="combobox"
            aria-expanded="true"
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-controls="nv-cmdk-listbox"
            aria-activedescendant={
              results[index] ? `nv-cmdk-opt-${results[index].id}` : undefined
            }
            placeholder="Search pages and actions…"
            onChange={(event) => {
              setQuery(event.target.value);
              setIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setIndex((i) => Math.min(results.length - 1, i + 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
              } else if (event.key === "Enter" && results[index]) {
                event.preventDefault();
                runCommand(results[index]);
              }
            }}
          />
          <kbd className="nv-cmdk-esc">esc</kbd>
        </div>

        <div
          id="nv-cmdk-listbox"
          ref={listRef}
          className="nv-cmdk-list"
          role="listbox"
        >
          {results.length === 0 && (
            <p className="nv-cmdk-empty">
              Nothing matches “{query}”. Try a page name like “budgets”.
            </p>
          )}
          {results.map((command, i) => {
            const Icon = command.icon;
            const active = i === index;
            return (
              <button
                key={command.id}
                id={`nv-cmdk-opt-${command.id}`}
                type="button"
                role="option"
                aria-selected={active}
                data-active={active}
                className="nv-cmdk-item"
                onMouseEnter={() => setIndex(i)}
                onClick={() => runCommand(command)}
              >
                <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
                <span>{command.label}</span>
                <span className="nv-cmdk-hint">{command.hint}</span>
              </button>
            );
          })}
        </div>

        <div className="nv-cmdk-foot">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span style={{ marginLeft: "auto" }}>esc close</span>
        </div>
      </div>
    </div>
  );
}
