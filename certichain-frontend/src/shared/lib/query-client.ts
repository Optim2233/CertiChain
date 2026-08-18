import { QueryClient } from "@tanstack/react-query";
import type { ApiError } from "@/shared/types/types";

// One client per browser tab; a fresh one per request on the server so
// query state never leaks between users. See TanStack Query's Next.js guide.
let browserQueryClient: QueryClient | undefined;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Auth/permission errors (wrong role, not logged in) never resolve
        // by retrying - burning the default 3 retries just makes every
        // "you're not allowed here" page sit on a "Loading..." spinner for
        // several extra seconds before the real (also unhandled by most
        // pages) empty/error state shows.
        retry: (failureCount, error) => {
          const status = (error as Partial<ApiError>)?.status;
          if (status === 401 || status === 403) return false;
          return failureCount < 3;
        },
      },
    },
  });
}

export function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
