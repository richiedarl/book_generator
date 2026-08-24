import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Marginalia — Psychology Book Writing Studio",
  description: "Generate professionally formatted psychology books from an idea.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
