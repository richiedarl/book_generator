import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Shelf — Book Writing Studio",
  description: "AI-assisted book creation and publishing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}