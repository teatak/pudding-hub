import { QueryClient, QueryObserver, type QueryObserverResult } from "@tanstack/react-query";

// Observers give each UI/model reader its own lifetime. TanStack cancels the
// shared request only when its last reader leaves, including queued requests.
export function sharedQuery<T>(client: QueryClient, options: {
  queryKey: readonly unknown[];
  staleTime: number;
  queryFn: (context: { signal: AbortSignal }) => Promise<T>;
}, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted();
  const observer = new QueryObserver<T>(client, { ...options, retry: false });
  return new Promise((resolve, reject) => {
    let done = false, unsubscribe = () => {};
    const finish = (settle: () => void) => {
      if (done) return;
      done = true;
      signal?.removeEventListener("abort", abort);
      unsubscribe();
      settle();
    };
    const abort = () => finish(() => reject(signal!.reason));
    const check = (result: QueryObserverResult<T>) => {
      if (result.fetchStatus !== "idle") return;
      if (result.isSuccess) finish(() => resolve(result.data));
      else if (result.isError) finish(() => reject(result.error));
    };
    signal?.addEventListener("abort", abort, { once: true });
    unsubscribe = observer.subscribe(check);
    if (done) unsubscribe();
    else check(observer.getCurrentResult());
  });
}
