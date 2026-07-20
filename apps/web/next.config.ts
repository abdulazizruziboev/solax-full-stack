import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disk on this machine is nearly full; source maps were the largest dev
  // build artifact (Turbopack failing to write *.js.map → Internal Server
  // Error). Turning them off drastically cuts dev disk writes.
  productionBrowserSourceMaps: false,
  experimental: {
    turbopackSourceMaps: false,
    serverSourceMaps: false,
  },
};

export default nextConfig;
