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
  metadataBase: new URL("https://visor.edycu.dev"),
  title: "Visor — Privacy-Blind Submission Agent",
  description: "Secure appointment booking and intake form submissions via TEE enclaves. Keeps personal data completely hidden from AI agents.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Visor",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  openGraph: {
    title: "Visor — Privacy-Blind Submission Agent",
    description: "Secure appointment booking and intake form submissions via TEE enclaves. Keeps personal data completely hidden from AI agents.",
    url: "https://visor.edycu.dev",
    siteName: "Visor",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Visor — Privacy-Blind Submission Agent"
      }
    ],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Visor — Privacy-Blind Submission Agent",
    description: "Secure appointment booking and intake form submissions via TEE enclaves. Keeps personal data completely hidden from AI agents.",
    images: ["/og-image.png"]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#030712] bg-grid-mesh flex flex-col">{children}</body>
    </html>
  );
}
