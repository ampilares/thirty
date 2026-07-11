export type Actor = {
  type: "user" | "agent" | "automation" | "api" | "system";
  id?: string;
  label: string;
};

/** The demo workspace's signed-in user (single-user MVP). */
export const CURRENT_USER: Actor = { type: "user", id: "1", label: "Alex Reeve" };

export const SYSTEM: Actor = { type: "system", label: "System" };

export function agentActor(key: string, name: string): Actor {
  return { type: "agent", id: key, label: name };
}

export function automationActor(id: number, name: string): Actor {
  return { type: "automation", id: String(id), label: name };
}

export const API_ACTOR: Actor = { type: "api", label: "REST API" };
