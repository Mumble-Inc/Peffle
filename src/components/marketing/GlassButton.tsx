import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
  /** Specular iOS-style glass (header controls). */
  reflective?: boolean;
};

export function GlassButton({
  children,
  href,
  onClick,
  type = "button",
  className = "",
  reflective = false,
}: Props) {
  const surface = reflective ? "glass-reflective" : "glass-control";
  const classes = `btn-glass ${surface} ${className}`.trim();
  if (href) {
    return (
      <a className={classes} href={href}>
        {children}
      </a>
    );
  }
  return (
    <button className={classes} type={type} onClick={onClick}>
      {children}
    </button>
  );
}
