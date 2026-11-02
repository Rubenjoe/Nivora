declare module "@/components/ui/magic-bento.jsx" {
  import type { CSSProperties, ReactNode } from "react";

  export type MagicBentoVisual =
    | "analytics"
    | "dashboard"
    | "collaboration"
    | "automation"
    | "integration"
    | "security";

  export type MagicBentoItem = {
    id?: string;
    title?: string;
    description?: string;
    label?: string;
    icon?: ReactNode;
    image?: string;
    visual?: MagicBentoVisual | ReactNode;
    content?: ReactNode;
    href?: string;
    target?: string;
    rel?: string;
    onClick?: (event: React.MouseEvent) => void;
    colSpan?: number;
    rowSpan?: number;
  };

  export interface MagicBentoProps {
    items?: MagicBentoItem[];
    columns?: number;
    rowHeight?: number;
    gap?: number;
    radius?: number;
    theme?: "dark" | "light";
    glowColor?: string;
    textAutoHide?: boolean;
    enableBorderGlow?: boolean;
    enableSpotlight?: boolean;
    spotlightRadius?: number;
    enableStars?: boolean;
    particleCount?: number;
    enableTilt?: boolean;
    enableMagnetism?: boolean;
    clickEffect?: boolean;
    intro?: boolean;
    disableAnimations?: boolean;
    onItemClick?: (item: MagicBentoItem, index: number) => void;
    className?: string;
    style?: CSSProperties;
  }

  const MagicBento: (props: MagicBentoProps) => ReactNode;
  export default MagicBento;
}
