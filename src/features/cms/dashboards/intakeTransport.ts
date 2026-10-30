/** Poll background work through the standard authenticated CMS transport. */
export async function pollIntakeResponse<T>(
  load: () => Promise<T | { status: "pending" }>,
  signal: AbortSignal,
): Promise<T> {
  const deadline = Date.now() + 660000;
  while (!signal.aborted && Date.now() < deadline) {
    const result = await load();
    if (
      !result ||
      typeof result !== "object" ||
      !("status" in result) ||
      result.status !== "pending"
    )
      return result as T;
    await new Promise<void>((resolve, reject) => {
      const done = () => {
        signal.removeEventListener("abort", abort);
        resolve();
      };
      const timer = setTimeout(done, 2000);
      const abort = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
        reject(new DOMException("Aborted", "AbortError"));
      };
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
  }
  throw new Error(signal.aborted ? "Aborted" : "Dashboard refresh timed out");
}
