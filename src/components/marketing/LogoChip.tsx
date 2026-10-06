import { Mark } from "@/components/mark";

type Props = {
  href?: string;
};

/** Circular floating logo control (Mac-style chip) */
export function LogoChip({ href = "/" }: Props) {
  return (
    <a className="m-logo-chip" href={href} aria-label="Peffle home">
      <Mark className="m-logo-chip__mark size-[18px] text-accent" />
    </a>
  );
}
