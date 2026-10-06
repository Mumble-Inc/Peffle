import { describe, expect, it } from "vitest";
import { cartDiscountPct, cartHasSessionDiscount } from "@/lib/cart-discount";
import type { CartLine } from "@/hooks/use-cart";

const line = (overrides: Partial<CartLine>): CartLine => ({
  id: "l1",
  productId: "p1",
  sku: "sku",
  name: "Test",
  blurb: "",
  image: "",
  imageAlt: "",
  unitPrice: 7000,
  listUnitPrice: 7490,
  discountPerUnit: 490,
  quantity: 1,
  lineTotal: 7000,
  inventory: 5,
  ...overrides,
});

describe("cart discount helpers", () => {
  it("detects session discount on cart lines", () => {
    expect(cartHasSessionDiscount([line({})])).toBe(true);
    expect(cartHasSessionDiscount([line({ listUnitPrice: 7490, unitPrice: 7490, discountPerUnit: 0 })])).toBe(
      false,
    );
  });

  it("computes effective discount percent", () => {
    expect(cartDiscountPct([line({})])).toBeCloseTo(((7490 - 7000) / 7490) * 100, 2);
  });
});
