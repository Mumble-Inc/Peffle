import type { PolicyCopyItem } from "@/lib/policy/copy";

type LandingGovernanceListProps = {
  items: PolicyCopyItem[];
};

export function LandingGovernanceList({ items }: LandingGovernanceListProps) {
  return (
    <dl className="rf-guardrail-list">
      {items.map((item) => (
        <div key={item.id} className="rf-guardrail-row">
          <dt>{item.title}</dt>
          <dd>
            <p>{item.rule}</p>
            <p className="mt-1 text-muted">{item.why}</p>
          </dd>
        </div>
      ))}
    </dl>
  );
}
