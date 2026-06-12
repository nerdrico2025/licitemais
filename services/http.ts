const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 2;

export class ApiUnavailableError extends Error {
  constructor(message = "Serviço de consulta indisponível no momento. Tente novamente em alguns minutos.") {
    super(message);
    this.name = "ApiUnavailableError";
  }
}

export async function fetchJsonWithRetry<T>(
  url: string,
  options: { retries?: number; timeoutMs?: number } = {},
): Promise<T> {
  const { retries = DEFAULT_RETRIES, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (response.status === 204) return { data: [] } as T;
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error ? lastError : new ApiUnavailableError();
}
