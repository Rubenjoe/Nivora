"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  BarChart3,
  CircleHelp,
  CreditCard,
  FileText,
  Goal,
  LayoutDashboard,
  LogOut,
  Menu,
  Repeat,
  Search,
  Settings2,
  Wallet,
  X,
} from "lucide-react";

import { BrandWordmark } from "@/components/brand-wordmark";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/ui/command-palette";
import { BrandSplash } from "@/components/ui/brand-splash";
import { PointerSpotlight } from "@/components/ui/pointer-spotlight";
import { RouteProgress } from "@/components/ui/route-progress";
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
  { href: "/reports", label: "Monthly Review", icon: FileText },
  { href: "/goals", label: "Goals", icon: Goal },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/settings", label: "Settings", icon: Settings2 },
  { href: "/help", label: "Help & Support", icon: CircleHelp },
];

function BrandLogo() {
  return (
    <Link className="premium-brand" href="/" aria-label="Nivora home">
      <BrandWordmark className="premium-brand-lockup" />
    </Link>
  );
}

function PublicFeatureGate() {
  return (
    <section className="public-dashboard public-feature-gate">
      <p className="public-dashboard-kicker">PRIVATE WORKSPACE</p>
      <h1>Sign in to continue.</h1>
      <p>
        Your transactions, budgets, goals, and preferences are available after
        you sign in to your account.
      </p>
      <div className="public-dashboard-actions">
        <Link className="premium-btn-premium" href="/sign-in">
          Sign in
        </Link>
        <Link className="premium-btn-ghost" href="/sign-up">
          Create an account <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </section>
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

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

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
  const showPrivateGate =
    session.status === "anonymous" && pathname !== "/" && pathname !== "/help";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [overlayPath, setOverlayPath] = useState(pathname);
  const authenticated = session.status === "authenticated";

  /* Close overlays when the route changes without a synchronous effect:
     React's documented "adjust state during render" pattern. */
  if (overlayPath !== pathname) {
    setOverlayPath(pathname);
    setDrawerOpen(false);
    setCmdkOpen(false);
  }

  useEffect(() => {
    if (!drawerOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen]);

  /* ⌘K / Ctrl+K opens the command palette (authenticated workspace only). */
  useEffect(() => {
    if (!authenticated) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setDrawerOpen(false);
        setCmdkOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [authenticated]);

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
            title={label}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            onClick={() => setDrawerOpen(false)}
          >
            <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <main className="premium-shell">
      <BrandSplash />
      <Suspense fallback={null}>
        <RouteProgress />
      </Suspense>
      <PointerSpotlight />
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
      <header className="premium-app-header">
        <div className="premium-header-inner">
          <div className="premium-header-brand">
            {authenticated && (
              <button
                type="button"
                className="premium-mobile-toggle"
                aria-label={drawerOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={drawerOpen}
                aria-controls="mobile-navigation"
                onClick={() => setDrawerOpen((value) => !value)}
              >
                {drawerOpen ? <X size={19} /> : <Menu size={18} />}
              </button>
            )}
            <BrandLogo />
          </div>
          {authenticated && (
            <nav aria-label="Main navigation" className="premium-nav-desktop">
              {navigationLinks}
            </nav>
          )}
          <div className="premium-header-actions">
            {authenticated && (
              <button
                type="button"
                className="nivora-search-trigger"
                aria-label="Search pages and actions (Command K)"
                aria-keyshortcuts="Meta+K Control+K"
                onClick={() => setCmdkOpen(true)}
              >
                <Search size={15} aria-hidden="true" />
                <kbd aria-hidden="true">⌘K</kbd>
              </button>
            )}
            <ThemeToggle />
            {(authenticated || pathname === "/" || pathname === "/help") && (
              <TopBarAuth
                session={session}
                onSignedOut={() => void refresh()}
              />
            )}
          </div>
        </div>
      </header>

      <aside
        id="mobile-navigation"
        aria-label="Mobile navigation"
        aria-hidden={!drawerOpen}
        inert={!drawerOpen}
        className={`premium-sidebar${drawerOpen ? " open" : ""}`}
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
          {session.status === "anonymous" && (
            <div className="premium-sidebar-auth">
              <Link
                className="premium-btn-secondary"
                href="/sign-in"
                onClick={() => setDrawerOpen(false)}
              >
                Sign in
              </Link>
              <Link
                className="premium-btn-primary"
                href="/sign-up"
                onClick={() => setDrawerOpen(false)}
              >
                Get started
              </Link>
            </div>
          )}
        </div>
      </aside>

      <section className="premium-main">
        <div className="premium-content" id="main-content">
          {showPrivateGate ? <PublicFeatureGate /> : children}
        </div>
      </section>

      {authenticated && (
        <CommandPalette open={cmdkOpen} onClose={() => setCmdkOpen(false)} />
      )}
    </main>
  );
}
