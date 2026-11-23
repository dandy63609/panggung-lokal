import { bindings, defineConfig } from "cf/config";

const hyperdriveId =
  (process.env.CLOUDFLARE_HYPERDRIVE_ID || "").trim() ||
  "adf0f20c2f6047b9978a2861148f2c1b";
const devConnectionString =
  (process.env.CLOUDFLARE_HYPERDRIVE_DEV_URL || "").trim() ||
  (process.env.DATABASE_URL || "").trim() ||
  "postgresql://postgres:postgres@localhost:5432/panggung_lokal";

export default defineConfig({
  worker: {
    name: "panggung-lokal",
    compatibilityDate: "2026-11-19",
    compatibilityFlags: ["nodejs_compat"],
    entrypoint: "./worker.mjs",
    workersDev: true,
    domains: ["reffband.studio", "www.reffband.studio"],
    assets: {
      notFoundHandling: "single-page-application",
      runWorkerFirst: ["/api/*", "/health", "/admin.html"],
    },
    placement: {
      mode: "targeted",
      region: "aws:ap-southeast-1",
    },
    observability: {
      enabled: true,
      logs: { enabled: true, headSamplingRate: 1 },
      traces: { enabled: true, headSamplingRate: 0.1 },
    },
    env: {
      NODE_ENV: bindings.text("production"),
      CLOUDFLARE_WORKERS: bindings.text("1"),
      SUPABASE_STORAGE_BUCKET: bindings.text("media"),
      CORS_ORIGIN: bindings.text(
        "https://panggung-lokal.dandy-adya2006.workers.dev,https://reffband.studio,https://www.reffband.studio"
      ),
      HYPERDRIVE: bindings.hyperdrive({
        id: hyperdriveId,
        dev: {
          connectionString: devConnectionString,
        },
      }),
      SUPABASE_URL: bindings.secret(),
      SUPABASE_SERVICE_ROLE_KEY: bindings.secret(),
      JWT_SECRET: bindings.secret(),
      ADMIN_EMAIL: bindings.secret(),
      ADMIN_PASSWORD: bindings.secret(),
      GOOGLE_CLIENT_ID: bindings.secret(),
    },
  },
});
