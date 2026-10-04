const STAGES = [
  { step: "01", title: "Understand", body: "Parse buyer intent, budget, and constraints before any SKU is shown." },
  { step: "02", title: "Decide", body: "Rank catalog and apply RazorFlow merchant policy — margin, discount, order cap." },
  { step: "03", title: "Guard", body: "Peffle authorizes checkout.create: spend cap, kill switch, execution policy." },
  { step: "04", title: "Transact", body: "Only then create a Razorpay order. Capture stays HMAC-verified." },
  { step: "05", title: "Recover", body: "Re-evaluate failed payments before a governed retry." },
] as const;

export function LandingWorkflowRail() {
  return (
    <div className="rf-workflow-rail">
      {STAGES.map((stage) => (
        <article key={stage.step} className="rf-workflow-stage">
          <p className="rf-workflow-stage-num">{stage.step}</p>
          <h3 className="rf-workflow-stage-title">{stage.title}</h3>
          <p className="rf-workflow-stage-body">{stage.body}</p>
        </article>
      ))}
    </div>
  );
}
