import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Bubble Challenge Platform",
  description: "Plateforme de défis peer-to-peer pour apprendre Bubble.io",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${dmSans.variable} antialiased bg-[#f8f9fc] min-h-screen font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
