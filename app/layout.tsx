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
  manifest: "/manifest.json",
  themeColor: "#1f2937",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Alien Invasion",
  },
  formatDetection: {
    telephone: false,
  },
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
  icons: {
    icon: [
      { url: "/icon-192x192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icon-512x512.svg", sizes: "512x512", type: "image/svg+xml" }
    ],
    apple: [
      { url: "/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" }
    ]
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
