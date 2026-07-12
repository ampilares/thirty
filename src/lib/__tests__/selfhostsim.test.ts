import { afterEach, describe, expect, it, vi } from "vitest";
import { maskSmsPhone, normalizeSmsPhone, sendSmsViaSelfhostSim } from "../messaging/selfhostsim";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
});

describe("SelfhostSim SMS adapter", () => {
  it("normalizes and masks international phone numbers", () => {
    expect(normalizeSmsPhone("+61 412 345 678")).toBe("+61412345678");
    expect(maskSmsPhone("+61412345678")).toBe("••••5678");
    expect(() => normalizeSmsPhone("123")).toThrow("Invalid SMS recipient");
  });

  it("uses the direct device endpoint and API-key authentication", async () => {
    process.env.SELFHOSTSIM_BASE_URL = "http://localhost:3001";
    process.env.SELFHOSTSIM_API_KEY = "test-secret";
    process.env.SELFHOSTSIM_DEVICE_ID = "pixel-7";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { success: true, smsBatchId: "batch-42", recipientCount: 1 } }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendSmsViaSelfhostSim({ phone: "+61 412 345 678", message: "Hello from Thirty" });

    expect(result.batchId).toBe("batch-42");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:3001/api/v1/gateway/devices/pixel-7/send-sms");
    expect(request.headers).toMatchObject({ "x-api-key": "test-secret" });
    expect(JSON.parse(String(request.body))).toMatchObject({ message: "Hello from Thirty", recipients: ["+61412345678"] });
  });

  it("refuses cleartext remote gateway URLs", async () => {
    process.env.SELFHOSTSIM_BASE_URL = "http://sms.example.com";
    process.env.SELFHOSTSIM_API_KEY = "test-secret";
    process.env.SELFHOSTSIM_DEVICE_ID = "phone";
    await expect(sendSmsViaSelfhostSim({ phone: "+61412345678", message: "Hello" })).rejects.toThrow("must use HTTPS");
  });
});
