import type { Metadata, Viewport } from "next";
import { Archivo_Black, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { Ticker } from "@/components/Ticker";
import { Footer } from "@/components/Footer";

const display = Archivo_Black({ variable: "--font-display", weight: "400", subsets: ["latin"] });
const body = Space_Grotesk({ variable: "--font-body", subsets: ["latin"] });
const mono = Space_Mono({ variable: "--font-mono", weight: ["400", "700"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QREACH",
  description: "Hire creators with QUSDC escrow on QIE. Every paid post gets a public on-chain record.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffe14d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <Providers>
          <Header />
          <Ticker />
          <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
