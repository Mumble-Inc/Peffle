const STEPS = [
  {
    title: "Read intent",
    body: "Peffle interprets what the buyer wants against your live catalog, not a generic model guess.",
  },
  {
    title: "Check policy",
    body: "Discount ceilings, attach rules, and spend caps run before any checkout payload is built.",
  },
  {
    title: "Authorize, then settle",
    body: "Approved requests reach Razorpay. Captures land in the ledger only after verification.",
  },
] as const;

export function LandingHowItWorks() {
  return (
    <div className="rf-how-grid">
      {STEPS.map((step, index) => (
        <article key={step.title} className="rf-how-card">
          <p className="rf-how-index">{String(index + 1).padStart(2, "0")}</p>
          <h3 className="rf-how-title">{step.title}</h3>
          <p className="rf-how-body">{step.body}</p>
        </article>
      ))}
    </div>
  );
}
