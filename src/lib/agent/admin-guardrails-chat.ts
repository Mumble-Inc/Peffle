import type { ChatHistoryTurn } from "@/lib/agent/chat-history";
import {
  mergePolicyPatch,
  planAdminGuardrailsIntents,
  type AdminGuardrailsIntent,
} from "@/lib/agent/admin-guardrails-planner";
import { generateAdminGuardrailsReply, summarizeGuardrails } from "@/lib/agent/admin-guardrails-reply";
import type { ChatReplyPlanner } from "@/lib/agent/chat-reply";
import type { PoliciesFormValues } from "@/lib/policy/map";
import {
  getAdminPolicies,
  updateAdminPolicies,
  validateAdminPolicyInput,
} from "@/lib/services/admin-policies";
import { reviveAgent, killAgent, getPeffleControlState } from "@/lib/peffle/control";
import { setRuntimeCheckoutCapPaise, setRuntimeDiscountCapPaise } from "@/lib/peffle/client";
import { formatInr } from "@/lib/format";

export type AdminGuardrailsToolResult = {
  ok: boolean;
  action: string;
  message: string;
};

export async function runAdminGuardrailsChat(
  merchantId: string,
  message: string,
  history: ChatHistoryTurn[] = [],
) {
  let policies = await getAdminPolicies(merchantId);
  let peffle = getPeffleControlState();
  const intents = planAdminGuardrailsIntents(message);
  const results: AdminGuardrailsToolResult[] = [];

  for (const intent of intents) {
    results.push(await executeIntent(merchantId, intent, policies, peffle));
    policies = await getAdminPolicies(merchantId);
    peffle = getPeffleControlState();
  }

  let reply: string;
  let planner: ChatReplyPlanner = "deterministic";

  if (results.length > 0) {
    reply = results.map((row) => row.message).join("\n");
  } else {
    const generated = await generateAdminGuardrailsReply(
      message,
      {
        merchantName: policies.merchant,
        toolSummary: "No server action ran on this turn.",
        policies,
        peffle,
      },
      history,
    );
    reply = generated.reply;
    planner = generated.planner;
  }

  return {
    reply,
    planner,
    tools: results,
    policies,
    peffleUpdated: results.some((row) => row.ok),
  };
}

async function executeIntent(
  merchantId: string,
  intent: AdminGuardrailsIntent,
  policies: PoliciesFormValues,
  peffle: ReturnType<typeof getPeffleControlState>,
): Promise<AdminGuardrailsToolResult> {
  switch (intent.kind) {
    case "summarize":
      return {
        ok: true,
        action: "summarize",
        message: summarizeGuardrails(policies, peffle),
      };
    case "update_merchant_policy": {
      try {
        const merged = mergePolicyPatch(policies, intent.patch);
        const validated = validateAdminPolicyInput(merged);
        const updated = await updateAdminPolicies(merchantId, validated);
        const parts: string[] = ["Merchant policy updated."];
        if (intent.patch.maxDiscountPct != null) {
          parts.push(`Discount ceiling is now ${updated.maxDiscountPct}%.`);
        }
        if (intent.patch.minMarginPct != null) {
          parts.push(`Margin floor is now ${updated.minMarginPct}%.`);
        }
        if (intent.patch.maxOrderInr != null) {
          parts.push(`Max order is now ${formatInr(updated.maxOrderInr)}.`);
        }
        if (intent.patch.minAttachRatePct != null) {
          parts.push(`Min attach rate is now ${updated.minAttachRatePct}%.`);
        }
        if (intent.patch.allowCrossSell != null) {
          parts.push(`Cross-sell is ${updated.allowCrossSell ? "enabled" : "disabled"}.`);
        }
        if (intent.patch.requireBudgetFit != null) {
          parts.push(`Budget fit is ${updated.requireBudgetFit ? "required" : "optional"}.`);
        }
        return { ok: true, action: "update_merchant_policy", message: parts.join(" ") };
      } catch (error) {
        return {
          ok: false,
          action: "update_merchant_policy",
          message: error instanceof Error ? error.message : "Could not update merchant policy.",
        };
      }
    }
    case "set_checkout_cap_inr": {
      try {
        const capPaise = Math.round(intent.inr * 100);
        setRuntimeCheckoutCapPaise(capPaise);
        return {
          ok: true,
          action: "set_checkout_cap_inr",
          message: `Checkout daily cap set to ${formatInr(intent.inr)}.`,
        };
      } catch (error) {
        return {
          ok: false,
          action: "set_checkout_cap_inr",
          message: error instanceof Error ? error.message : "Could not set checkout cap.",
        };
      }
    }
    case "set_discount_budget_inr": {
      try {
        const capPaise = Math.round(intent.inr * 100);
        setRuntimeDiscountCapPaise(capPaise);
        return {
          ok: true,
          action: "set_discount_budget_inr",
          message: `Daily discount budget set to ${formatInr(intent.inr)}.`,
        };
      } catch (error) {
        return {
          ok: false,
          action: "set_discount_budget_inr",
          message: error instanceof Error ? error.message : "Could not set discount budget.",
        };
      }
    }
    case "disable_agent":
      if (!intent.confirmed) {
        return {
          ok: false,
          action: "disable_agent",
          message:
            'Disabling the agent blocks checkout.create. Reply with "Confirm disable agent" if you want to proceed.',
        };
      }
      try {
        killAgent(peffle.agentId, "admin guardrails chat");
        return {
          ok: true,
          action: "disable_agent",
          message: "Agent disabled. Checkout is blocked until you enable the agent again.",
        };
      } catch (error) {
        return {
          ok: false,
          action: "disable_agent",
          message: error instanceof Error ? error.message : "Could not disable agent.",
        };
      }
    case "enable_agent":
      try {
        reviveAgent(peffle.agentId);
        return {
          ok: true,
          action: "enable_agent",
          message: "Agent enabled. Checkout guard is active again.",
        };
      } catch (error) {
        return {
          ok: false,
          action: "enable_agent",
          message: error instanceof Error ? error.message : "Could not enable agent.",
        };
      }
    default:
      return { ok: false, action: "unknown", message: "Unknown action." };
  }
}
