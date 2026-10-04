import {
  AgentKilledError,
  ApprovalAlreadyConsumedError,
  ApprovalDeniedError,
  ApprovalFingerprintMismatchError,
  ApprovalRequiredError,
  ApprovalTokenInvalidError,
  BudgetExceededError,
  PolicyDeniedError,
  type ApprovalRequiredError as ApprovalRequired,
} from "peffle";

export type PeffleReasonCode =
  | "BUDGET_EXCEEDED"
  | "POLICY_DENIED"
  | "AGENT_KILLED"
  | "APPROVAL_REQUIRED"
  | "APPROVAL_ALREADY_CONSUMED"
  | "APPROVAL_FINGERPRINT_MISMATCH"
  | "APPROVAL_DENIED"
  | "APPROVAL_TOKEN_INVALID"
  | "PEFFLE_UNAVAILABLE";

export type MappedPeffleError = {
  status: "denied" | "approval_required";
  reasonCode: PeffleReasonCode;
  message: string;
  eventId: string | null;
  limitPaise?: number;
  spentPaise?: number;
};

export function mapPeffleError(error: unknown): MappedPeffleError {
  if (error instanceof BudgetExceededError) {
    return {
      status: "denied",
      reasonCode: "BUDGET_EXCEEDED",
      message: "This action exceeded the execution budget.",
      eventId: error.eventId,
      limitPaise: error.limit,
      spentPaise: error.spent,
    };
  }
  if (error instanceof AgentKilledError) {
    return {
      status: "denied",
      reasonCode: "AGENT_KILLED",
      message: "This agent is disabled.",
      eventId: null,
    };
  }
  if (error instanceof PolicyDeniedError) {
    return {
      status: "denied",
      reasonCode: "POLICY_DENIED",
      message: "Execution policy denied this action.",
      eventId: error.eventId,
    };
  }
  if (error instanceof ApprovalRequiredError) {
    return {
      status: "approval_required",
      reasonCode: "APPROVAL_REQUIRED",
      message: "This action needs operator approval.",
      eventId: error.eventId,
    };
  }
  if (error instanceof ApprovalAlreadyConsumedError) {
    return {
      status: "denied",
      reasonCode: "APPROVAL_ALREADY_CONSUMED",
      message: "This approval was already used.",
      eventId: error.eventId,
    };
  }
  if (error instanceof ApprovalFingerprintMismatchError) {
    return {
      status: "denied",
      reasonCode: "APPROVAL_FINGERPRINT_MISMATCH",
      message: "The approved request does not match this retry.",
      eventId: error.eventId,
    };
  }
  if (error instanceof ApprovalDeniedError) {
    return {
      status: "denied",
      reasonCode: "APPROVAL_DENIED",
      message: "The operator denied this action.",
      eventId: error.eventId,
    };
  }
  if (error instanceof ApprovalTokenInvalidError) {
    return {
      status: "denied",
      reasonCode: "APPROVAL_TOKEN_INVALID",
      message: "Approval token is invalid.",
      eventId: error.eventId,
    };
  }
  return {
    status: "denied",
    reasonCode: "PEFFLE_UNAVAILABLE",
    message: "Execution control is unavailable.",
    eventId: null,
  };
}

export function isApprovalRequiredError(error: unknown): error is ApprovalRequired {
  return error instanceof ApprovalRequiredError;
}
