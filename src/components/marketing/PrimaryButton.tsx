import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
};

export function PrimaryButton({
  children,
  href,
  onClick,
  type = "button",
  className = "",
}: Props) {
  const classes = `btn-primary ${className}`.trim();
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
