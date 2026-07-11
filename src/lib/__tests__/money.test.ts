import { describe, it, expect } from "vitest";
import { lineTotal, itemsTotal, balanceCents, isOverdue, formatMoney } from "../core/money";

describe("money math", () => {
  it("computes line and items totals in cents", () => {
    expect(lineTotal({ qty: 3, unitPriceCents: 4500 })).toBe(13500);
    expect(itemsTotal([{ qty: 1, unitPriceCents: 700000 }, { qty: 12, unitPriceCents: 14000 }])).toBe(868000);
    expect(itemsTotal([])).toBe(0);
  });

  it("computes balances and never goes negative", () => {
    expect(balanceCents(100000, 40000)).toBe(60000);
    expect(balanceCents(100000, 100000)).toBe(0);
    expect(balanceCents(100000, 150000)).toBe(0); // overpayment clamps
  });

  it("derives overdue from status + due date", () => {
    expect(isOverdue("sent", "2026-07-01", "2026-07-11")).toBe(true);
    expect(isOverdue("sent", "2026-07-20", "2026-07-11")).toBe(false);
    expect(isOverdue("paid", "2026-07-01", "2026-07-11")).toBe(false);
    expect(isOverdue("draft", "2026-07-01", "2026-07-11")).toBe(false);
    expect(isOverdue("sent", null, "2026-07-11")).toBe(false);
    expect(isOverdue("overdue", "2026-07-01", "2026-07-11")).toBe(true);
  });

  it("formats money", () => {
    expect(formatMoney(1200000)).toBe("$12,000");
    expect(formatMoney(14550)).toBe("$145.50");
  });
});
