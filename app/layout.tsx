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
  title: {
    default: "ListeningTalkers — Free IELTS Listening Practice",
    template: "%s | ListeningTalkers",
  },
  description: "Practice IELTS, TOEFL, TOEIC and CELPIP listening with thousands of free exercises. Multiple choice, fill in the blank, dictation, map labelling and more.",
  keywords: ["IELTS listening practice", "IELTS listening test", "free IELTS practice", "TOEFL listening", "IELTS map labelling", "IELTS multiple choice listening"],
  authors: [{ name: "ListeningTalkers" }],
  creator: "ListeningTalkers",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://listeningtalkers.com",
    siteName: "ListeningTalkers",
    title: "ListeningTalkers — Free IELTS Listening Practice",
    description: "Practice IELTS, TOEFL, TOEIC and CELPIP listening with thousands of free exercises.",
    images: [
      {
        url: "/cat-logo.svg",
        width: 512,
        height: 512,
        alt: "ListeningTalkers",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "ListeningTalkers — Free IELTS Listening Practice",
    description: "Practice IELTS listening with thousands of free exercises.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  verification: {
    google: "nDeRBWUS8pMNx39yXF-6Nm631D3bqGFVMM3q_JOIJWA",
  },
  alternates: {
    canonical: "https://listeningtalkers.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col antialiased`}>
        {children}
      </body>
    </html>
  );
}