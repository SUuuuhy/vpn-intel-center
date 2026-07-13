declare module "cloudflare:workers" {
  export const env: {
    DB?: unknown;
    [key: string]: unknown;
  };
}

type D1Database = unknown;

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}
