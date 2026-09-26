import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "C KI KA LA · Hallila Games",
  description: "Rassemble tes amis, classe de S à E et découvre leur verdict. Le party-game de tier-lists par Hallila Games.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
