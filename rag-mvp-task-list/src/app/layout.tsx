import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Knowledge Trust — Ishonchli Bilim Markazi",
  description: "Rolga asoslangan, shaffof va o'rganuvchi AI bilim platformasi.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz">
      <body className="antialiased">{children}</body>
    </html>
  );
}
