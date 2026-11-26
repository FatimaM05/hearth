import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";
import AmbientBg from "@/components/AmbientBg";
import Header from "@/components/Header";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });
const sans = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

export const metadata: Metadata = {
  title: "Hearth: beds and bedroom furniture",
  description: "Build your bed your way: fabric, size, storage and base, with the price updating as you choose.",
};

export const viewport: Viewport = { themeColor: "#0c0a08", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} relative min-h-screen font-sans antialiased`}>
        <AmbientBg />
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
