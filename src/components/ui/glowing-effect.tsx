// The proximity glow was removed from the product surface: it added a
// continuous pointer listener to every card and competed with the content.
// Kept as a no-op so existing call sites stay untouched.
type GlowingEffectProps = {
  glow?: boolean;
  disabled?: boolean;
  spread?: number;
  proximity?: number;
  inactiveZone?: number;
};

const GlowingEffect = (_props: GlowingEffectProps) => null;

export { GlowingEffect };
