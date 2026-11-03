/** Route-level loading state: skeletons that mirror the real layout. */
export default function AppLoading() {
  return (
    <div className="nv-loading" role="status" aria-live="polite">
      <span className="nv-sr-only">Loading your workspace…</span>

      <div className="nv-skel-row nv-skel-head" aria-hidden="true">
        <div>
          <span className="nv-skel nv-skel-eyebrow" />
          <span className="nv-skel nv-skel-title" />
        </div>
        <span className="nv-skel nv-skel-pill" />
      </div>

      <section className="nv-skel-panel nv-skel-hero" aria-hidden="true">
        <div>
          <span className="nv-skel nv-skel-eyebrow" />
          <span className="nv-skel nv-skel-value" />
          <span className="nv-skel nv-skel-line" />
          <span className="nv-skel nv-skel-bar" />
        </div>
        <div className="nv-skel-side">
          <span className="nv-skel nv-skel-block" />
          <span className="nv-skel nv-skel-block" />
        </div>
      </section>

      <div className="nv-skel-grid" aria-hidden="true">
        <section className="nv-skel-panel nv-skel-chart">
          <span className="nv-skel nv-skel-eyebrow" />
          <div className="nv-skel-bars">
            {[38, 62, 46, 78, 54, 70, 42, 66].map((h, i) => (
              <span
                key={i}
                className="nv-skel"
                style={{ height: `${h}%`, ["--i" as string]: i }}
              />
            ))}
          </div>
        </section>
        <section className="nv-skel-panel">
          <span className="nv-skel nv-skel-eyebrow" />
          <span className="nv-skel nv-skel-donut" />
          <span className="nv-skel nv-skel-line" />
          <span className="nv-skel nv-skel-line short" />
        </section>
      </div>
    </div>
  );
}
