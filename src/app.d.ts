// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    interface Platform {
      env: {
        PCHRON_KV: KVNamespace;
        PCHRON_DB: D1Database;
        CF_ACCOUNT_ID: string;
        CF_IMAGES_TOKEN: string;
        DEV_USER?: string;
      };
    }
  }
}

export {};
