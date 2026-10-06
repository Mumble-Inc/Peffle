export function AgentAuthorityDiagram() {
  return (
    <div className="rf-biz-authority-diagram" role="img" aria-label="Models provide intelligence; Peffle gates tools before real-world effects">
      <div className="rf-biz-authority-row">
        <span className="rf-biz-flow-node rf-biz-flow-node--wide">
          OpenAI / Anthropic / Gemini / open source
        </span>
      </div>
      <span className="rf-biz-flow-arrow" aria-hidden>↓</span>
      <div className="rf-biz-authority-row">
        <span className="rf-biz-flow-node">AI agent</span>
      </div>
      <span className="rf-biz-flow-arrow" aria-hidden>↓</span>
      <div className="rf-biz-authority-peffle">
        <span className="rf-biz-authority-peffle-label" translate="no">Peffle</span>
        <div className="rf-biz-authority-branches">
          <span className="rf-biz-flow-node rf-biz-flow-node--branch">Payment</span>
          <span className="rf-biz-flow-node rf-biz-flow-node--branch">Email</span>
          <span className="rf-biz-flow-node rf-biz-flow-node--branch">Deployment</span>
        </div>
      </div>
      <span className="rf-biz-flow-arrow" aria-hidden>↓</span>
      <div className="rf-biz-authority-row">
        <span className="rf-biz-flow-node rf-biz-flow-node--wide">Real-world side effects</span>
      </div>
    </div>
  );
}
