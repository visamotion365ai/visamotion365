import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VisaMotion365 — Visa Operations OS",
  description: "Multi-tenant visa consultancy & recruitment operating system: OCR intake, compliance, A4 dossiers, AI agent orchestration, browser automation with human approval."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
