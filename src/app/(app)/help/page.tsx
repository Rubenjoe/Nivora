import Link from "next/link";
import { BookOpen, LifeBuoy, Lock, ShieldCheck } from "lucide-react";

const faqs = [
  {
    q: "How do I record an income or expense?",
    a: "Open Transactions, choose the type, pick a category, enter the amount and date, and save. The entry appears immediately in your history and dashboard totals.",
  },
  {
    q: "Where do my categories come from?",
    a: "Nivora seeds a starter set (Food, Transport, Housing, Bills, Salary, and more) the first time your profile is resolved. You can add your own from the transaction form, and existing categories are never duplicated.",
  },
  {
    q: "How do budgets measure spending?",
    a: "A budget covers one calendar month and, optionally, one expense category. Progress is the sum of your recorded expenses in that month (and category) divided by the budget amount — nothing else is counted.",
  },
  {
    q: "Do savings goals move money?",
    a: "No. A goal is a target you set and contribute toward manually. Nivora tracks the contributions you record; it never claims the funds exist in a bank account.",
  },
  {
    q: "What happens with recurring schedules?",
    a: "A schedule defines what repeats and when. A transaction is only created when you press record — Nivora never silently creates financial records, and recording the same due date twice is rejected.",
  },
  {
    q: "How is my data protected?",
    a: "Every request resolves your verified Supabase session server-side and scopes reads and writes to your profile only. Cross-user access is blocked by ownership checks enforced on every query.",
  },
  {
    q: "Can I export my data?",
    a: "Yes. Settings and Analytics both offer a CSV export of your transaction history, always limited to your own records.",
  },
  {
    q: "What if I see a storage error?",
    a: "That message means the local database connection is not configured or reachable. See docs/SETUP.md in the repository for the exact local steps; no data is lost when it appears.",
  },
];

export default function HelpPage() {
  return (
    <div className="feature-workspace">
      <div className="feature-intro">
        <p className="eyebrow">WE&apos;RE HERE TO HELP</p>
        <h1>Help &amp; Support</h1>
        <p>Answers to common questions, and honest guidance on reaching us.</p>
      </div>

      <div className="help-grid">
        <section
          className="feature-form-card help-card"
          aria-labelledby="faq-title"
        >
          <div className="feature-card-heading">
            <div className="entry-mark">
              <BookOpen size={18} aria-hidden="true" />
            </div>
            <div>
              <h2 id="faq-title">Frequently asked questions</h2>
              <p>The essentials of using Nivora day to day.</p>
            </div>
          </div>
          <dl className="faq-list">
            {faqs.map((entry) => (
              <div className="faq-item" key={entry.q}>
                <dt>{entry.q}</dt>
                <dd>{entry.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="help-side">
          <section
            className="feature-form-card help-card"
            aria-labelledby="contact-title"
          >
            <div className="feature-card-heading">
              <div className="entry-mark">
                <LifeBuoy size={18} aria-hidden="true" />
              </div>
              <div>
                <h2 id="contact-title">Contact support</h2>
                <p>How to reach a human.</p>
              </div>
            </div>
            <p className="help-contact-copy">
              Nivora is a self-hosted personal project. There is no automated
              support backend configured — this page does not send messages
              anywhere. For help, open an issue in the project repository or
              consult <code>docs/SETUP.md</code> and{" "}
              <code>docs/SECURITY.md</code> in the codebase.
            </p>
          </section>

          <section
            className="feature-form-card help-card"
            aria-labelledby="privacy-title"
          >
            <div className="feature-card-heading">
              <div className="entry-mark">
                <ShieldCheck size={18} aria-hidden="true" />
              </div>
              <div>
                <h2 id="privacy-title">Your privacy</h2>
                <p>What Nivora stores and what it never does.</p>
              </div>
            </div>
            <ul className="privacy-list">
              <li>
                <Lock size={15} aria-hidden="true" />
                Identity and sessions are handled by Supabase Auth; Nivora never
                stores your password.
              </li>
              <li>
                <Lock size={15} aria-hidden="true" />
                Financial records live in your own Supabase PostgreSQL database,
                scoped to your profile.
              </li>
              <li>
                <Lock size={15} aria-hidden="true" />
                No analytics, ads, or third-party trackers are included.
              </li>
            </ul>
          </section>

          <section className="feature-form-card help-card links-card">
            <h2>Quick links</h2>
            <ul className="help-links">
              <li>
                <Link href="/transactions">Record a transaction</Link>
              </li>
              <li>
                <Link href="/budgets">Review budgets</Link>
              </li>
              <li>
                <Link href="/goals">Check savings goals</Link>
              </li>
              <li>
                <Link href="/settings">Adjust preferences</Link>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
