const RETRYABLE = /429|RESOURCE_EXHAUSTED|UNAVAILABLE|503|rate.?limit|quota/i;

export function geminiErrorText(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 400);
  return String(error).slice(0, 400);
}

export function isRetryableGeminiError(error: unknown): boolean {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status: unknown }).status)
      : NaN;
  if (status === 429 || status === 503) return true;
  return RETRYABLE.test(geminiErrorText(error));
}

export async function withGeminiRetry<T>(
  fn: () => Promise<T>,
  opts?: { attempts?: number; sleep?: (ms: number) => Promise<void> },
): Promise<T> {
  const attempts = opts?.attempts ?? 4;
  const sleep = opts?.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  let last: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      last = error;
      if (i === attempts - 1 || !isRetryableGeminiError(error)) throw error;
      const backoff = Math.min(8_000, 400 * 2 ** i) + Math.floor(Math.random() * 250);
      await sleep(backoff);
    }
  }
  throw last;
}
