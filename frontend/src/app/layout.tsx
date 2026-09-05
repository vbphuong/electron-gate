import type { Metadata } from "next";
import { Fraunces, Geist, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/app/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { AmbientChatbot } from "@/components/chat/AmbientChatbot";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800", "900"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Electron Gate · Atelier RAG Intelligence Enclave",
  description: "High-precision Retrieval-Augmented Generation gateway with role-isolated vector enclaves and neural context routing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${geistSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--color-paper)] text-[var(--color-ink)]">
        <AuthProvider>
          <Navbar />
          {children}
          <AmbientChatbot />
        </AuthProvider>
      </body>
    </html>
  );
}

