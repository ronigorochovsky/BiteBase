import type { Metadata } from "next";
import { Noto_Sans_Hebrew } from "next/font/google";
import "./globals.css";

const notoHebrew = Noto_Sans_Hebrew({
  subsets: ["hebrew"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-hebrew",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "BiteBase — מתכונים ומסעדות אהובות",
    template: "%s | BiteBase",
  },
  description: "אוסף מתכונים ומסעדות אהובות",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className={notoHebrew.variable}>
      <body className="font-sans min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
