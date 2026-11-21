import type { Metadata, Viewport } from "next";
import React from "react";
import { figtree } from "@/lib/fonts";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { UtmCapture } from "@/components/tracking/UtmCapture";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "K2WFINANCE — Your Partner in Financial Growth",
  description:
    "Your Partner in Financial Growth. A financial roadmap for your income, your milestones and the life you’re building. Explore savings and income plans with K2WFINANCE.",
  openGraph: {
    title: "K2WFINANCE — Your Partner in Financial Growth",
    description:
      "Your Partner in Financial Growth. A financial roadmap for your income, your milestones and the life you’re building. Explore savings and income plans with K2WFINANCE.",
    siteName: "K2WFINANCE",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "K2WFINANCE — Your Partner in Financial Growth",
    description:
      "Your Partner in Financial Growth. A financial roadmap for your income, your milestones and the life you’re building. Explore savings and income plans with K2WFINANCE.",
  },
  icons: {
    icon: "/assets/k2wfinance-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={figtree.variable}>
      <body>
        <ScrollProgress />
        <a className="skip" href="#main">
          Skip to content
        </a>
        <Header />
        {children}
        <Footer />
        <UtmCapture />
      </body>
    </html>
  );
}
