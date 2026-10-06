export type BuyerCapability = "anonymous" | "buyer" | "staff" | "admin";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getInitialAdminEmail(): string | null {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim();
  return email ? normalizeEmail(email) : null;
}

export function isStaffOrAdmin(capability: BuyerCapability): boolean {
  return capability === "staff" || capability === "admin";
}

export function isAdminCapability(capability: BuyerCapability): boolean {
  return capability === "admin";
}

export function capabilityLabel(capability: BuyerCapability): string {
  switch (capability) {
    case "admin":
      return "Administrator";
    case "staff":
      return "Staff";
    case "buyer":
      return "Buyer";
    default:
      return "Guest";
  }
}
