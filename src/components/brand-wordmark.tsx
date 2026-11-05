type BrandWordmarkProps = {
  className?: string;
  label?: string;
};

export function BrandWordmark({ className, label }: BrandWordmarkProps) {
  return (
    <span
      className={["nivora-wordmark", className].filter(Boolean).join(" ")}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
