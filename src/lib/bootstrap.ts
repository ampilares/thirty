/**
 * Wires the event bus to the automation engine and agents, and runs the lazy
 * "cron" sweep (overdue invoices, health refresh, daily briefing) at most once
 * per minute, triggered by any page render. Import ensureBootstrap() from
 * server components/actions before touching core services.
 */
import { registerDispatcher } from "./events";
import { dispatchToAutomations } from "./automations/engine";
import { dispatchToAgents } from "./agents/catalog";
import { sweepOverdueInvoices } from "./core/money";
import { refreshAllHealth } from "./core/health";
import { SYSTEM } from "./actor";

const globalForBoot = globalThis as unknown as {
  __thirtyBooted?: boolean;
  __thirtyLastSweep?: number;
  __thirtySweeping?: boolean;
};

export function ensureBootstrap(): void {
  if (globalForBoot.__thirtyBooted) return;
  globalForBoot.__thirtyBooted = true;
  registerDispatcher(dispatchToAutomations);
  registerDispatcher(async (evt) => dispatchToAgents(evt));
}

export async function runSweep(force = false): Promise<void> {
  ensureBootstrap();
  const last = globalForBoot.__thirtyLastSweep ?? 0;
  if (!force && Date.now() - last < 60_000) return;
  if (globalForBoot.__thirtySweeping) return;
  globalForBoot.__thirtySweeping = true;
  globalForBoot.__thirtyLastSweep = Date.now();
  try {
    await sweepOverdueInvoices(SYSTEM);
    await refreshAllHealth();
    // Daily agent runs: generated once per day, lazily on first visit.
    const { hasRunToday } = await import("./agents/runner");
    if (!hasRunToday("chief_of_staff")) {
      const { runChiefOfStaff, runDeliveryCoordinator, runSalesAgent } = await import("./agents/catalog");
      await runChiefOfStaff("daily");
      await runDeliveryCoordinator("daily");
      await runSalesAgent("daily");
    }
  } catch (err) {
    console.error("[sweep] failed:", err);
  } finally {
    globalForBoot.__thirtySweeping = false;
  }
}
