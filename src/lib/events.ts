import { getDb, now } from "./db/client";
import { events } from "./db/schema";
import type { Actor } from "./actor";

export type BusinessEvent = {
  id: number;
  type: string;
  entityType: string;
  entityId: number;
  payload: Record<string, unknown>;
  actor: Actor;
};

type Dispatcher = (evt: BusinessEvent) => Promise<void>;

const globalForBus = globalThis as unknown as {
  __thirtyDispatchers?: Dispatcher[];
  __thirtyDepth?: number;
};

/** Automation/agent layers register here at bootstrap (see lib/bootstrap.ts). */
export function registerDispatcher(fn: Dispatcher): void {
  globalForBus.__thirtyDispatchers = globalForBus.__thirtyDispatchers ?? [];
  if (!globalForBus.__thirtyDispatchers.includes(fn)) globalForBus.__thirtyDispatchers.push(fn);
}

/**
 * Persists a business event, then dispatches it to automations/agents.
 * Events are facts: dispatch failures never roll back the originating write.
 * Depth guard stops automation→event→automation cascades beyond 3 levels.
 */
export async function emitEvent(
  type: string,
  entityType: string,
  entityId: number,
  payload: Record<string, unknown>,
  actor: Actor
): Promise<void> {
  const db = getDb();
  const inserted = db
    .insert(events)
    .values({
      type,
      entityType,
      entityId,
      payload,
      actorType: actor.type,
      actorId: actor.id ?? null,
      createdAt: now(),
    })
    .returning({ id: events.id })
    .get();

  const evt: BusinessEvent = { id: inserted.id, type, entityType, entityId, payload, actor };

  const depth = globalForBus.__thirtyDepth ?? 0;
  if (depth >= 3) return; // loop guard
  globalForBus.__thirtyDepth = depth + 1;
  try {
    for (const dispatch of globalForBus.__thirtyDispatchers ?? []) {
      try {
        await dispatch(evt);
      } catch (err) {
        console.error(`[events] dispatcher failed for ${type}:`, err);
      }
    }
  } finally {
    globalForBus.__thirtyDepth = depth;
  }
}
