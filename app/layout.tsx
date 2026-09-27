import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "./providers";

const title = "AfterHours — SERV-powered pre-trade review";
const description = "Review Solana devnet test-token requests with SERV Reasoning, labelled simulated references, and reserve-based pool quotes.";
const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title,
  description,
  icons: {
    icon: [
      { url: "/afterhours-mark.svg", type: "image/svg+xml" },
      { url: "/afterhours-mark.png", type: "image/png", sizes: "1024x1024" },
    ],
    apple: [{ url: "/afterhours-mark.png", type: "image/png", sizes: "1024x1024" }],
  },
  openGraph: {
    title,
    description,
    type: "website",
    images: [{ url: "/afterhours-mark.png", width: 1024, height: 1024, alt: "AfterHours geometric mark on warm paper" }],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: [{ url: "/afterhours-mark.png", alt: "AfterHours geometric mark on warm paper" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
