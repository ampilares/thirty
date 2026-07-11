import { describe, it, expect } from "vitest";
import { evalCondition, conditionsPass, interpolate } from "../automations/engine";

describe("automation condition evaluation", () => {
  const payload = { source: "Website form", valueCents: 500000, priority: "high", empty: "" };

  it("evaluates comparison operators", () => {
    expect(evalCondition({ field: "priority", op: "eq", value: "high" }, payload)).toBe(true);
    expect(evalCondition({ field: "priority", op: "eq", value: "HIGH" }, payload)).toBe(true); // case-insensitive
    expect(evalCondition({ field: "priority", op: "neq", value: "low" }, payload)).toBe(true);
    expect(evalCondition({ field: "valueCents", op: "gt", value: 400000 }, payload)).toBe(true);
    expect(evalCondition({ field: "valueCents", op: "lt", value: 400000 }, payload)).toBe(false);
    expect(evalCondition({ field: "valueCents", op: "gte", value: 500000 }, payload)).toBe(true);
    expect(evalCondition({ field: "valueCents", op: "lte", value: 499999 }, payload)).toBe(false);
    expect(evalCondition({ field: "source", op: "contains", value: "form" }, payload)).toBe(true);
    expect(evalCondition({ field: "source", op: "contains", value: "referral" }, payload)).toBe(false);
  });

  it("evaluates presence operators", () => {
    expect(evalCondition({ field: "source", op: "is_set" }, payload)).toBe(true);
    expect(evalCondition({ field: "empty", op: "is_set" }, payload)).toBe(false);
    expect(evalCondition({ field: "missing", op: "not_set" }, payload)).toBe(true);
  });

  it("requires all conditions to pass (AND semantics)", () => {
    expect(
      conditionsPass(
        [
          { field: "priority", op: "eq", value: "high" },
          { field: "valueCents", op: "gt", value: 1 },
        ],
        payload
      )
    ).toBe(true);
    expect(
      conditionsPass(
        [
          { field: "priority", op: "eq", value: "high" },
          { field: "valueCents", op: "gt", value: 999999999 },
        ],
        payload
      )
    ).toBe(false);
    expect(conditionsPass([], payload)).toBe(true);
    expect(conditionsPass(undefined, payload)).toBe(true);
  });
});

describe("template interpolation", () => {
  it("substitutes payload fields and entity id", () => {
    expect(interpolate("Respond to {name} (#{id})", { name: "Acme deal" }, 42)).toBe("Respond to Acme deal (#42)");
  });
  it("leaves unknown placeholders visible rather than blanking them", () => {
    expect(interpolate("Hello {nope}", {}, 1)).toBe("Hello {nope}");
  });
});
