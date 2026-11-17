import Link from "next/link";

import { BrandWordmark } from "@/components/brand-wordmark";
import { ThemeToggle } from "@/components/theme-toggle";

import "./styles/not-found.css";

export default function NotFound() {
  return (
    <main className="nf-page">
      <header className="nf-header">
        <Link className="nf-brand" href="/" aria-label="Nivora home">
          <BrandWordmark />
        </Link>
        <ThemeToggle />
      </header>

      <section className="nf-panel" aria-labelledby="nf-title">
        <p className="nf-code">404</p>
        <p className="nf-kicker">PAGE NOT FOUND</p>
        <h1 className="nf-title" id="nf-title">
          This page isn&apos;t in the ledger.
        </h1>
        <p className="nf-copy">
          The address may have changed, or the link was mistyped. Your workspace
          is right where you left it.
        </p>
        <div className="nf-actions">
          <Link className="premium-btn-premium" href="/">
            Back to home
          </Link>
          <Link className="premium-btn-ghost" href="/dashboard">
            Open dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
