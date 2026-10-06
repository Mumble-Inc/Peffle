import type { CartLine } from "@/hooks/use-cart";

/** Effective session discount as % of pre-discount cart value. */
export function cartDiscountPct(lines: CartLine[]): number {
  let listTotal = 0;
  let discountedTotal = 0;
  for (const line of lines) {
    const listUnit = line.listUnitPrice ?? line.unitPrice;
    listTotal += listUnit * line.quantity;
    discountedTotal += line.unitPrice * line.quantity;
  }
  if (listTotal <= 0) return 0;
  return ((listTotal - discountedTotal) / listTotal) * 100;
}

export function cartHasSessionDiscount(lines: CartLine[]): boolean {
  return lines.some((line) => {
    const listUnit = line.listUnitPrice ?? line.unitPrice;
    return listUnit > line.unitPrice + 0.001;
  });
}
