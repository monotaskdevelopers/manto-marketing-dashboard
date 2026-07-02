/*
File description:
This file configures the Next.js application. It keeps production behavior conservative by disabling
the framework-powered header and leaving rendering/runtime defaults to the App Router unless a route
explicitly opts into dynamic behavior.
*/

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
