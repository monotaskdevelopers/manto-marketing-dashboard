/*
File description:
This root layout defines the HTML shell and shared metadata for the entire dashboard application.
It keeps the global wrapper minimal so authentication and dashboard navigation can be handled by nested
layouts without forcing public routes such as /login into the authenticated app shell.
*/

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marketing Reports Dashboard",
  description: "Internal Shopify and Klaviyo analytics dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
