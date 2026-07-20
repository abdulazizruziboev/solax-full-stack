import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Minimal self-contained server output for the Docker production image
  // (copies only the traced files). `outputFileTracingRoot` points at the
  // monorepo root so workspace deps are traced correctly.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // Source maps were the largest dev build artifact (Turbopack failing to write
  // *.js.map on a full disk). Off in dev; harmless in prod.
  productionBrowserSourceMaps: false,
  experimental: {
    turbopackSourceMaps: false,
    serverSourceMaps: false,
  },
};

export default nextConfig;
