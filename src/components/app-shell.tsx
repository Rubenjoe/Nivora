"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  BarChart3,
  CircleHelp,
  CreditCard,
  Download,
  Goal,
  LayoutDashboard,
  LogOut,
  Menu,
  Repeat,
  Settings2,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import {
  sessionInitials,
  useNavSession,
  type ClientNavSession,
} from "@/components/use-nav-session";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: CreditCard },
  { href: "/budgets", label: "Budgets", icon: Wallet },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/goals", label: "Goals", icon: Goal },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/settings", label: "Settings", icon: Settings2 },
  { href: "/help", label: "Help & Support", icon: CircleHelp },
];

function BrandLogo() {
  return (
    <Link className="premium-brand" href="/" aria-label="Nivora home">
      <span className="premium-brand-mark" aria-hidden="true">
        n
      </span>
      <span>nivora</span>
    </Link>
  );
}

function TopBarAuth({
  session,
  onSignedOut,
}: {
  session: ClientNavSession;
  onSignedOut: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (session.status === "loading") {
    return <span className="premium-auth-loading" aria-hidden="true" />;
  }

  if (session.status === "anonymous") {
    return (
      <>
        <Link className="premium-btn-ghost" href="/sign-in">
          Sign in
        </Link>
        <Link className="premium-btn-primary" href="/sign-up">
          Get started
        </Link>
      </>
    );
  }

  const initials = sessionInitials(session);
  const displayName =
    session.profile?.displayName ||
    session.user.name ||
    session.user.email?.split("@")[0] ||
    "Your account";

  async function signOut() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    setOpen(false);
    onSignedOut();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <div className="premium-profile-wrap">
      <button
        type="button"
        className="premium-profile-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="premium-avatar" aria-hidden="true">
          {initials}
        </span>
        <span className="premium-profile-label">{displayName}</span>
      </button>
      {open && (
        <div className="premium-profile-menu" role="menu">
          <div className="premium-profile-meta">
            <strong>{displayName}</strong>
            {session.user.email && <span>{session.user.email}</span>}
            {!session.storageReady && (
              <span className="premium-profile-warning">
                Financial storage needs local configuration.
              </span>
            )}
          </div>
          <Link href="/settings" role="menuitem" onClick={() => setOpen(false)}>
            Account settings
          </Link>
          <button type="button" role="menuitem" onClick={() => void signOut()}>
            <LogOut size={15} aria-hidden="true" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function AppShell({
  initialSession,
  children,
}: {
  initialSession: ClientNavSession;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { session, refresh } = useNavSession(initialSession);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mode =
    session.status === "authenticated"
      ? (session.profile?.mode ?? "simple")
      : "simple";

  useEffect(() => {
    if (!drawerOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen]);

  async function toggleMode() {
    if (session.status !== "authenticated") return;
    const next = mode === "simple" ? "pro" : "simple";
    const response = await fetch("/api/v1/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: next }),
    });
    if (response.ok) await refresh();
  }

  const dockActiveIndex = pathname.startsWith("/transactions")
    ? 0
    : pathname.startsWith("/settings")
      ? 2
      : -1;

  const navigationLinks = (
    <>
      {navItems.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            className={`premium-nav-item${active ? " active" : ""}`}
            href={href}
            aria-current={active ? "page" : undefined}
            title={label}
            onClick={() => setDrawerOpen(false)}
          >
            <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </>
  );

  const modeControl = (
    <button
      type="button"
      className="premium-mode-control"
      onClick={() => void toggleMode()}
      disabled={session.status !== "authenticated"}
      aria-label={`Current mode: ${mode}. ${session.status === "authenticated" ? "Switch mode" : "Sign in to change mode"}`}
      title={
        session.status === "authenticated"
          ? "Switch mode"
          : "Sign in to change mode"
      }
    >
      <Sparkles size={15} aria-hidden="true" />
      <span>{mode === "simple" ? "Simple" : "Pro"}</span>
      <span className="premium-mode-switch" aria-hidden="true">
        <span className={mode === "simple" ? "selected" : ""}>S</span>
        <span className={mode === "pro" ? "selected" : ""}>P</span>
      </span>
    </button>
  );

  return (
    <main className="premium-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      {drawerOpen && (
        <button
          type="button"
          className="premium-scrim"
          aria-label="Close navigation"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <header className="premium-app-header glass-surface">
        <div className="premium-header-brand">
          <button
            type="button"
            className="premium-mobile-toggle"
            aria-label={drawerOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={drawerOpen}
            aria-controls="mobile-navigation"
            onClick={() => setDrawerOpen((value) => !value)}
          >
            {drawerOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
          <BrandLogo />
        </div>
        <nav
          aria-label="Main navigation"
          className="premium-nav-desktop glass-surface"
        >
          {navigationLinks}
        </nav>
        <div className="premium-header-actions">
          {modeControl}
          <ThemeToggle />
          <TopBarAuth session={session} onSignedOut={() => void refresh()} />
        </div>
      </header>

      <aside
        id="mobile-navigation"
        aria-label="Mobile navigation"
        aria-hidden={!drawerOpen}
        inert={!drawerOpen}
        className={`premium-sidebar glass-surface ${drawerOpen ? "open" : ""}`}
      >
        <div className="premium-sidebar-inner">
          <div className="premium-sidebar-top">
            <div>
              <p className="premium-workspace-label">YOUR MONEY, IN FOCUS</p>
              <strong>Workspace</strong>
            </div>
            <button
              type="button"
              className="premium-sidebar-close"
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <nav aria-label="Main navigation" className="premium-nav-list">
            {navigationLinks}
          </nav>
          <div className="premium-sidebar-bottom">
            <div className="premium-mode-description">
              <Sparkles size={15} aria-hidden="true" />
              <span>
                {mode === "simple"
                  ? "Essentials and calm pacing"
                  : "Advanced filters and analysis"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      <nav
        className="quick-dock glass-surface"
        aria-label="Quick actions"
        data-active={dockActiveIndex}
        style={
          {
            "--dock-index": dockActiveIndex < 0 ? 0 : dockActiveIndex,
          } as CSSProperties
        }
      >
        <span
          className={`quick-dock-indicator${dockActiveIndex < 0 ? " hidden" : ""}`}
          aria-hidden="true"
        />
        <Link
          href="/transactions"
          aria-label="Add or review transactions"
          title="Add transaction"
          className={dockActiveIndex === 0 ? "is-active" : undefined}
          aria-current={dockActiveIndex === 0 ? "page" : undefined}
        >
          <Wallet size={18} aria-hidden="true" />
        </Link>
        <Link
          href="/api/v1/export/transactions"
          aria-label="Export transactions as CSV"
          title="Export CSV"
        >
          <Download size={17} aria-hidden="true" />
        </Link>
        <Link
          href="/settings"
          aria-label="Open settings"
          title="Settings"
          className={dockActiveIndex === 2 ? "is-active" : undefined}
          aria-current={dockActiveIndex === 2 ? "page" : undefined}
        >
          <Settings2 size={17} aria-hidden="true" />
        </Link>
      </nav>

      <section className="premium-main">
        <div className="premium-content" id="main-content">
          {children}
        </div>
      </section>
    </main>
  );
}
