/**
 * Halftone brand mark. It lives in the footer only, turned so the letters face left.
 */
export function BrandWatermark() {
  return (
    <div className="m-brand-watermark" aria-hidden>
      <div className="m-brand-watermark__stack">
        <p className="m-brand-watermark__text">peffle</p>
        <p className="m-brand-watermark__reflect">peffle</p>
      </div>
    </div>
  );
}
