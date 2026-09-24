import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "AfterHours — Stock-token swap prototype",
  description: "Explore simulated reference-aware limits and direct Solana devnet test-token swaps with live pool quotes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
