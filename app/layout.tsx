import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Alien Invasion Game",
  description: "A fun HTML5 Canvas game where you fight alien invaders with lightning powers!",
  keywords: ["game", "alien", "invasion", "canvas", "javascript", "nextjs"],
  authors: [{ name: "Alien Invasion Game" }],
  creator: "Alien Invasion Game",
  robots: "index, follow",
  openGraph: {
    title: "Alien Invasion Game",
    description: "Fight alien invaders with lightning powers in this exciting HTML5 Canvas game!",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Alien Invasion Game",
    description: "Fight alien invaders with lightning powers in this exciting HTML5 Canvas game!",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
