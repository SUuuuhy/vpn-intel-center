import type { NextConfig } from "next";

const isGitHubPagesBuild = process.env.BUILD_TARGET === "github-pages";
const pagesBasePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  ...(isGitHubPagesBuild
    ? {
        output: "export",
        trailingSlash: true,
        images: {
          unoptimized: true,
        },
        basePath: pagesBasePath,
        assetPrefix: pagesBasePath,
      }
    : {}),
};

export default nextConfig;
