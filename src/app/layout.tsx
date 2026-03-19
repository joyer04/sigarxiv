import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SigArxiv",
  description: "AI-native research archive and peer review system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
