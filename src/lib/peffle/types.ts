export type PeffleEventResult = "ALLOWED" | "BLOCKED" | "FAILED" | "PENDING" | "IN_PROGRESS";

export type PeffleControlEvent = {
  id: string;
  createdAt: string;
  agentId: string;
  action: string;
  amountPaise: number | null;
  result: PeffleEventResult;
  reason: string | null;
};

export type PeffleCheckoutBlock = {
  blocked: true;
  code:
    | "PEFFLE_BUDGET_EXCEEDED"
    | "PEFFLE_AGENT_KILLED"
    | "PEFFLE_POLICY_DENIED"
    | "PEFFLE_APPROVAL_REQUIRED"
    | "PEFFLE_UNAVAILABLE";
  agentId: string;
  action: string;
  amountPaise: number;
  limitPaise: number | null;
  spentPaise: number | null;
};

export type PeffleControlState = {
  agentId: string;
  killed: boolean;
  protection: "protected" | "disabled";
  executionGuard: "active" | "disabled";
  lastActivityAt: string | null;
  spend: {
    spentPaise: number;
    limitPaise: number;
    remainingPaise: number;
    window: "daily";
    currency: "INR";
  };
  merchantPolicy: {
    layer: "merchant";
    status: "active";
    controls: string[];
  };
  executionPolicy: {
    layer: "peffle";
    status: "active";
    controls: string[];
    onNoMatchingRule: "allow" | "deny";
  };
  events: PeffleControlEvent[];
  discountSpend: {
    spentPaise: number;
    limitPaise: number;
    remainingPaise: number;
    window: "daily";
    currency: "INR";
  };
  pendingApprovals: Array<{
    eventId: string;
    tool: string;
    sessionId: string;
    amountPaise: number | null;
    action: string;
  }>;
  agents: Array<{ agentId: string; killed: boolean }>;
  allAgentsKilled: boolean;
};
