/**
 * Model gateway (PRD §23, scaled to MVP): a provider-agnostic text-generation
 * interface. The deterministic "heuristic" provider keeps the product fully
 * functional offline; the "anthropic" provider activates when ANTHROPIC_API_KEY
 * is set. Agents and Ask use this — never a model SDK directly.
 */

export type DraftKind = "briefing" | "ticket_reply" | "deal_followup" | "ask";

export type DraftRequest = {
  kind: DraftKind;
  context: Record<string, unknown>;
};

export type DraftResult = {
  text: string;
  provider: "heuristic" | "anthropic";
  model: string;
  costCents: number;
};

function heuristicDraft(req: DraftRequest): string {
  const c = req.context;
  switch (req.kind) {
    case "ticket_reply": {
      const name = String(c.customerName ?? "there");
      const subject = String(c.subject ?? "your request");
      const category = String(c.category ?? "issue");
      const urgent = c.priority === "urgent" || c.priority === "high";
      return (
        `Hi ${name.split(" ")[0]},\n\n` +
        `Thanks for reaching out about "${subject}". ${
          urgent
            ? "We've marked this as a priority and someone from the team is looking at it right now."
            : `We've logged this as a ${category.toLowerCase()} and it's in our queue.`
        }\n\n` +
        `${urgent ? "We'll update you within the next few hours with what we find." : "You can expect an update from us within one business day."}\n\n` +
        `Best regards,\nCoastal Digital Support`
      );
    }
    case "deal_followup": {
      const contact = String(c.contactName ?? "there");
      const dealName = String(c.dealName ?? "our proposal");
      const days = Number(c.daysSinceActivity ?? 0);
      return (
        `Hi ${contact.split(" ")[0]},\n\n` +
        `Just checking in on ${dealName} — it's been ${days} days since we last spoke and I wanted to see if any questions have come up on your side.\n\n` +
        `Happy to jump on a quick call this week if that's easier.\n\n` +
        `Best,\nAlex`
      );
    }
    case "briefing": {
      // The chief-of-staff agent assembles the structured facts; this provider
      // just renders them plainly.
      return String(c.factsText ?? "");
    }
    default:
      return String(c.factsText ?? "");
  }
}

async function anthropicDraft(req: DraftRequest, apiKey: string): Promise<DraftResult> {
  const model = process.env.THIRTY_AI_MODEL ?? "claude-haiku-4-5-20251001";
  const prompts: Record<DraftKind, string> = {
    ticket_reply:
      "Write a short, warm, professional support reply (max 120 words) for this ticket. Plain text, sign off as 'Coastal Digital Support'.",
    deal_followup: "Write a short, friendly sales follow-up email (max 100 words). Plain text, sign off as 'Alex'.",
    briefing:
      "You are the Owner Chief of Staff for a small agency. Rewrite these facts as a crisp morning briefing (max 180 words): lead with what needs attention, keep every number.",
    ask: "Answer the question using ONLY the JSON snapshot provided. Cite record ids you used in the form [type#id]. If the snapshot can't answer it, say so.",
  };
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      system: prompts[req.kind],
      messages: [{ role: "user", content: JSON.stringify(req.context) }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[]; usage?: { input_tokens: number; output_tokens: number } };
  const text = data.content.find((b) => b.type === "text")?.text ?? "";
  // Rough cost attribution for the transparent-economics ledger (PRD §12.10).
  const inTok = data.usage?.input_tokens ?? 0;
  const outTok = data.usage?.output_tokens ?? 0;
  const costCents = Math.max(1, Math.round(((inTok * 0.1 + outTok * 0.5) / 1_000_000) * 100 * 100) / 100);
  return { text, provider: "anthropic", model, costCents: Math.ceil(costCents) };
}

export function aiProviderStatus(): { provider: "heuristic" | "anthropic"; model: string } {
  const key = process.env.ANTHROPIC_API_KEY;
  return key
    ? { provider: "anthropic", model: process.env.THIRTY_AI_MODEL ?? "claude-haiku-4-5-20251001" }
    : { provider: "heuristic", model: "deterministic-rules" };
}

export async function generateDraft(req: DraftRequest): Promise<DraftResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    try {
      return await anthropicDraft(req, key);
    } catch (err) {
      console.error("[ai] anthropic provider failed, falling back to heuristic:", err);
    }
  }
  return { text: heuristicDraft(req), provider: "heuristic", model: "deterministic-rules", costCents: 0 };
}
