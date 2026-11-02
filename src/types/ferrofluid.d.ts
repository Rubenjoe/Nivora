declare module "@/components/ui/ferrofluid.jsx" {
  import type { CSSProperties, ReactNode } from "react";

  export interface FerrofluidProps {
    /** Colors of the studio lights reflected in the fluid: key light, side lights and fill light. */
    colors?: string[];
    /** Strength of the reflections. */
    brightness?: number;
    /** How fast the swells roll across the surface. */
    speed?: number;
    /** Zoom of the fluid. Higher values show bigger, fewer spikes. */
    scale?: number;
    /** How tall the spikes grow in a strong field. */
    spikeHeight?: number;
    /** How peaked the spikes are. Low values give soft mounds, high values taller cones. */
    sharpness?: number;
    /** How much the spike pattern sways and drifts out of its regular grid. */
    turbulence?: number;
    /** How loosely the spikes respond, from 0 (thick and slow) to 1 (bouncy). */
    fluidity?: number;
    /** Viewing angle in degrees. Low values look down from above, high values look across the fluid. */
    tilt?: number;
    /** Strength of the magnetic field that raises swells of spikes across the surface. */
    magnetism?: number;
    /** Picks a different arrangement of swells. */
    variation?: number;
    /** Direction the swells roll. `none` keeps them morphing in place. */
    flowDirection?: "down" | "up" | "left" | "right" | "none";
    /** Turns the cursor into a magnet that raises a crown of spikes. */
    mouseInteraction?: boolean;
    /** Strength of the cursor magnet. */
    mouseStrength?: number;
    /** Reach of the cursor magnet, as a fraction of the height. */
    mouseRadius?: number;
    /** Time in seconds the crown takes to catch up with the cursor. 0 follows instantly. */
    mouseDampening?: number;
    /** Clicking sends a magnetic pulse through the fluid. */
    clickPulse?: boolean;
    /** Raises the spikes when the field switches on. */
    intro?: boolean;
    /** Renders the fluid as glossy white liquid for light backgrounds. */
    lightMode?: boolean;
    /** Lets the page show through. When off, the fluid sits on the color below. */
    transparent?: boolean;
    /** Background color when transparent is off. Defaults to white in light mode. */
    color?: string;
    /** Opacity of the whole effect. */
    opacity?: number;
    /** Freezes the fluid. */
    paused?: boolean;
    /** Maximum device pixel ratio, capped at 2. */
    dpr?: number;
    /** CSS mix-blend-mode applied to the container. */
    mixBlendMode?: CSSProperties["mixBlendMode"];
    /** Extra class names for the container. */
    className?: string;
    /** Inline styles for the container. */
    style?: CSSProperties;
  }

  const Ferrofluid: (props: FerrofluidProps) => ReactNode;
  export default Ferrofluid;
}
