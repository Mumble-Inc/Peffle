type Props = {
  className?: string;
};

export function Wordmark({ className = "" }: Props) {
  return (
    <span className={`m-wordmark ${className}`.trim()} aria-label="Peffle">
      peffle
    </span>
  );
}
