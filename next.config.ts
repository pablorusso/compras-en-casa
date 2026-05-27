import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer usa dependencias de Node (fuentes, fs) que no deben pasar por
  // el bundler del server: se externaliza para que el render del PDF funcione en Vercel.
  serverExternalPackages: ["@react-pdf/renderer"],
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/admin/list/published",
        destination: "/admin/list",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
