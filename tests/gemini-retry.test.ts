import { describe, expect, it } from "vitest";
import { isRetryableGeminiError, withGeminiRetry } from "@/lib/gemini/retry";

describe("Gemini retry", () => {
  it("treats 429 as retryable", () => {
    expect(isRetryableGeminiError(Object.assign(new Error("RESOURCE_EXHAUSTED"), { status: 429 }))).toBe(true);
    expect(isRetryableGeminiError(new Error("bad request"))).toBe(false);
  });

  it("retries then returns the success value", async () => {
    let n = 0;
    const result = await withGeminiRetry(
      async () => {
        n += 1;
        if (n < 3) throw Object.assign(new Error("429"), { status: 429 });
        return "ok";
      },
      { attempts: 4, sleep: async () => undefined },
    );
    expect(result).toBe("ok");
    expect(n).toBe(3);
  });
});
