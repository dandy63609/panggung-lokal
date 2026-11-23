import { defineWranglerConfig } from "wrangler/experimental-config";

export default defineWranglerConfig({
  build: {
    command: "npm run client:build",
  },
  assetsDirectory: "./client/dist",
  uploadSourceMaps: true,
  types: {
    generate: true,
    includeRuntime: false,
  },
});
