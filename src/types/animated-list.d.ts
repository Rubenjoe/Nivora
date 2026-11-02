declare module "@/components/ui/animated-list.jsx" {
  import type { CSSProperties, ReactNode } from "react";

  export type AnimatedListItem =
    | string
    | {
        id?: string;
        icon?: ReactNode;
        image?: string;
        title: string;
        description?: string;
        meta?: string;
      };

  export interface AnimatedListProps {
    items?: AnimatedListItem[];
    onItemSelect?: (item: AnimatedListItem, index: number) => void;
    renderItem?: (
      item: AnimatedListItem,
      index: number,
      selected: boolean,
    ) => ReactNode;
    initialSelectedIndex?: number;
    selectOnHover?: boolean;
    enableArrowNavigation?: boolean;
    loop?: boolean;
    animation?: "pop" | "slide" | "fade" | "none";
    animateOnce?: boolean;
    stagger?: number;
    showGradients?: boolean;
    fadeSize?: number;
    displayScrollbar?: boolean;
    frame?: boolean;
    theme?: "dark" | "light";
    accentColor?: string;
    radius?: number;
    gap?: number;
    width?: number | string;
    maxHeight?: number | string;
    className?: string;
    itemClassName?: string;
    ariaLabel?: string;
    style?: CSSProperties;
  }

  const AnimatedList: (props: AnimatedListProps) => ReactNode;
  export default AnimatedList;
}
