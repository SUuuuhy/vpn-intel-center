declare module "cloudflare:workers" {
  export const env: {
    DB?: any;
    [key: string]: any;
  };
}

type D1Database = any;

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}
