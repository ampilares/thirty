import { describe, it, expect } from "vitest";
import { classifyLeadPriority, classifyTicket } from "../agents/catalog";

describe("intake lead classification", () => {
  it("marks big deals and referrals high priority", () => {
    expect(classifyLeadPriority({ valueCents: 1_500_000, source: "Website form" })).toBe("high");
    expect(classifyLeadPriority({ valueCents: 100_000, source: "Referral" })).toBe("high");
    expect(classifyLeadPriority({ valueCents: 200_000, source: "Existing client" })).toBe("high");
  });
  it("marks mid-size and web leads normal", () => {
    expect(classifyLeadPriority({ valueCents: 400_000, source: "LinkedIn" })).toBe("normal");
    expect(classifyLeadPriority({ valueCents: 50_000, source: "Website form" })).toBe("normal");
  });
  it("marks small unknown-source leads low", () => {
    expect(classifyLeadPriority({ valueCents: 50_000, source: "Cold list" })).toBe("low");
  });
});

describe("support ticket triage", () => {
  it("detects outages as urgent bugs", () => {
    const r = classifyTicket("Booking widget down on homepage", "The widget never loads and we are losing reservations");
    expect(r.priority).toBe("urgent");
    expect(r.category).toBe("Bug");
  });
  it("classifies non-outage bugs as high", () => {
    const r = classifyTicket("SSL certificate warning appears", "Browsers show a warning on our site");
    expect(r.priority).toBe("high");
    expect(r.category).toBe("Bug");
  });
  it("classifies questions as low priority", () => {
    const r = classifyTicket("Question about analytics report", "Can you explain the drop in week 3?");
    expect(r.priority).toBe("low");
    expect(r.category).toBe("Question");
  });
  it("classifies billing topics", () => {
    const r = classifyTicket("Invoice query", "I think we were charged twice on the last invoice");
    expect(r.category).toBe("Billing");
  });
});
