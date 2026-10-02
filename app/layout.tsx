import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
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
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
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
      </body>
    </html>
  );
}
