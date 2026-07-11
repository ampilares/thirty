import Link from "next/link";
import { ask, supportedQuestions } from "@/lib/ask/engine";
import { aiProviderStatus } from "@/lib/ai/gateway";
import { PageHeader, Card, Badge, inputClass, btnPrimary, fmtDateTime } from "@/components/ui";

export default async function AskPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const provider = aiProviderStatus();
  const result = q ? await ask(q) : null;

  return (
    <>
      <PageHeader
        title="Ask Business"
        subtitle={`Cross-module questions answered from live data with linked evidence · engine: ${provider.provider === "anthropic" ? `LLM fallback enabled (${provider.model})` : "deterministic rules (set ANTHROPIC_API_KEY for free-form questions)"}`}
      />
      <Card className="max-w-3xl">
        <form action="/ask" method="get" className="flex gap-2">
          <input name="q" defaultValue={q ?? ""} placeholder="e.g. Which deals are likely to slip?" className={inputClass} autoFocus />
          <button className={btnPrimary}>Ask</button>
        </form>
      </Card>

      {result && (
        <Card className="mt-4 max-w-3xl" title={`“${result.question}”`}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.answer}</p>
          {result.sources.length > 0 && (
            <div className="mt-3 border-t border-neutral-100 pt-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Sources</span>
              <ul className="mt-1 flex flex-wrap gap-2">
                {result.sources.map((source, i) => (
                  <li key={i}>
                    <Link href={source.href} className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium hover:bg-neutral-100">
                      {source.label} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 border-t border-neutral-100 pt-2 text-xs text-neutral-400">
            <Badge value={result.confidence === "high" ? "success" : result.confidence === "medium" ? "pending" : "failed"} label={`confidence: ${result.confidence}`} />
            <span>data as of {fmtDateTime(result.freshness)}</span>
            <span>· engine: {result.engine}</span>
          </div>
        </Card>
      )}

      <div className="mt-6 max-w-3xl">
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">{result?.suggestions ? "Try one of these instead" : "Things you can ask"}</h2>
        <div className="flex flex-wrap gap-2">
          {(result?.suggestions ?? supportedQuestions()).map((question) => (
            <Link key={question} href={`/ask?q=${encodeURIComponent(question)}`} className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 shadow-sm transition hover:border-neutral-400">
              {question}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
