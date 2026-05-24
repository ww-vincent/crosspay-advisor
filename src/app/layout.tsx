import type { Metadata } from "next";
import { Inspector } from "react-dev-inspector";
import { AuthProvider } from "@/hooks/use-auth";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Chain | CrossPay Advisor",
    template: "%s | Chain",
  },
  description:
    "AI-powered cross-border payment advisor with real-time rate tracking, precision forecasting, and intelligent routing across 12 fiat and 7 crypto currencies.",
  keywords: [
    "CrossPay",
    "Exchange Rate",
    "Currency Conversion",
    "Cross-Border Payment",
    "AI Advisor",
    "FX Forecast",
  ],
  authors: [{ name: "Chain Financial Technologies Inc." }],
  generator: "Chain",
  openGraph: {
    title: "Chain | Cross-Border Payments, Clarified",
    description: "Real-time tracking, AI-powered predictions, and smart routing for your cross-border transactions.",
    locale: "en_US",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === "DEV";

  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#020202] text-zinc-100 font-sans">
        <AuthProvider>
          {isDev && <Inspector />}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
