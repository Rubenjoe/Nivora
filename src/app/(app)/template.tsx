import type { ReactNode } from "react";

/**
 * A template re-mounts on every navigation, so this wrapper replays a soft
 * page-in transition between routes without touching any page component.
 */
export default function AppTemplate({ children }: { children: ReactNode }) {
  return <div className="nv-page">{children}</div>;
}
