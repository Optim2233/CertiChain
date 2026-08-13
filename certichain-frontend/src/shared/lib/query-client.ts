import { QueryClient } from "@tanstack/react-query";

// One client per browser tab; a fresh one per request on the server so
// query state never leaks between users. See TanStack Query's Next.js guide.
let browserQueryClient: QueryClient | undefined;

function makeQueryClient() {
  return new QueryClient();
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
