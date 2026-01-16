
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Global Conflict Tracker",
  description: "Visualizing global conflicts in real-time.",
};

import { Toaster } from "sonner";
import Sentinel from "@/components/Sentinel";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 overflow-hidden`} suppressHydrationWarning>
        {children}
        <Sentinel />
        <Toaster richColors theme="dark" />
      </body>
    </html>
  );
}
