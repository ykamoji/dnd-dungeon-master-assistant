import type { Metadata } from "next";
import { Cinzel, MedievalSharp, EB_Garamond } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

const medieval = MedievalSharp({
  variable: "--font-medieval",
  subsets: ["latin"],
  weight: "400",
});

const garamond = EB_Garamond({
  variable: "--font-garamond",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "D&D Game Master Assistant",
  description:
    "An AI-powered Dungeon Master. Forge a party, choose your adventure, and play.",
  // Browser-tab icon. `public/logos/d20.png` is served at `/logos/d20.png`.
  icons: {
    icon: "/logos/d20.png",
    shortcut: "/logos/d20.png",
    apple: "/logos/d20.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${medieval.variable} ${garamond.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
