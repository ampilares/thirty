export type SelfhostSimStatus = {
  configured: boolean;
  baseUrl: string | null;
  deviceId: string | null;
  hasApiKey: boolean;
};

export type SmsSendResult = {
  success: boolean;
  batchId: string | null;
  recipientCount: number;
  message: string;
};

function config() {
  return {
    baseUrl: process.env.SELFHOSTSIM_BASE_URL?.trim().replace(/\/+$/, "") ?? "",
    apiKey: process.env.SELFHOSTSIM_API_KEY?.trim() ?? "",
    deviceId: process.env.SELFHOSTSIM_DEVICE_ID?.trim() ?? "",
  };
}

export function selfhostSimStatus(): SelfhostSimStatus {
  const current = config();
  return {
    configured: Boolean(current.baseUrl && current.apiKey && current.deviceId),
    baseUrl: current.baseUrl || null,
    deviceId: current.deviceId || null,
    hasApiKey: Boolean(current.apiKey),
  };
}

function apiBase(raw: string): string {
  const url = new URL(raw);
  const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !local) throw new Error("SelfhostSim must use HTTPS unless it is running on localhost");
  const path = url.pathname.replace(/\/+$/, "");
  if (!path.endsWith("/api/v1")) url.pathname = `${path}/api/v1`;
  return url.toString().replace(/\/+$/, "");
}

export function normalizeSmsPhone(phone: string): string {
  const trimmed = phone.trim();
  const normalized = `${trimmed.startsWith("+") ? "+" : ""}${trimmed.replace(/\D/g, "")}`;
  if (!/^\+?[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error(`Invalid SMS recipient "${phone}"; use an international number such as +61412345678`);
  }
  return normalized;
}

export function maskSmsPhone(phone: string): string {
  const visible = phone.replace(/\D/g, "");
  return visible.length > 4 ? `••••${visible.slice(-4)}` : "••••";
}

export async function sendSmsViaSelfhostSim(input: { phone: string; message: string }): Promise<SmsSendResult> {
  const current = config();
  if (!current.baseUrl || !current.apiKey || !current.deviceId) {
    throw new Error("SelfhostSim is not configured. Add SELFHOSTSIM_BASE_URL, SELFHOSTSIM_API_KEY, and SELFHOSTSIM_DEVICE_ID.");
  }
  const phone = normalizeSmsPhone(input.phone);
  const message = input.message.trim();
  if (!message) throw new Error("SMS message cannot be empty");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.SELFHOSTSIM_TIMEOUT_MS ?? 15000));
  try {
    const response = await fetch(`${apiBase(current.baseUrl)}/gateway/devices/${encodeURIComponent(current.deviceId)}/send-sms`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": current.apiKey },
      body: JSON.stringify({
        message,
        recipients: [phone],
        // Kept for compatibility with older SelfhostSim Android/API builds.
        smsBody: message,
        receivers: [phone],
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    const json = await response.json().catch(() => ({})) as Record<string, unknown>;
    const data = (json.data && typeof json.data === "object" ? json.data : json) as Record<string, unknown>;
    if (!response.ok || data.success === false) {
      const reason = String(data.message ?? json.message ?? `HTTP ${response.status}`);
      throw new Error(`SelfhostSim rejected the SMS: ${reason}`);
    }
    return {
      success: true,
      batchId: data.smsBatchId ? String(data.smsBatchId) : null,
      recipientCount: Number(data.recipientCount ?? 1),
      message: String(data.message ?? "SMS queued on Android gateway"),
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("SelfhostSim timed out after 15 seconds");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
