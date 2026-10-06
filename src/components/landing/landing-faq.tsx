const FAQ = [
  {
    question: "What does Peffle do?",
    answer:
      "Peffle matches a buyer request to your catalog, checks merchant policy, and authorizes checkout before an order is created.",
  },
  {
    question: "Can the agent pay on its own?",
    answer:
      "No. A recommendation is not a payment. Checkout waits for policy and authorization. A spend cap or the kill switch can stop execution.",
  },
  {
    question: "What does a block look like?",
    answer:
      "The desk shows Blocked, names the rule that failed, and does not create a Razorpay order.",
  },
  {
    question: "What does Razorpay receive?",
    answer:
      "An order only after merchant policy and execution control both pass. Captured payments are verified before they count in the ledger.",
  },
] as const;

export function LandingFaq() {
  return (
    <div className="rf-faq">
      {FAQ.map((item) => (
        <details key={item.question}>
          <summary>{item.question}</summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
