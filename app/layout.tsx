import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import PwaBootstrap from "@/components/PwaBootstrap";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VisaMotion 365 — Agentic AI Visa Workspace",
  description:
    "A global visa & immigration agency workspace: five autonomous agents for eligibility, document audit, SOP drafting, refusal analysis and embassy portal checks.",
  applicationName: "VisaMotion 365",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "VisaMotion 365",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0b1020",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-white text-neutral-900">
        {children}
        <PwaBootstrap />
      </body>
    </html>
  );
}
