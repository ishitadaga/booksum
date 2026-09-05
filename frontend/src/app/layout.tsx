import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { themeInitScript } from "@/lib/theme-script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BookSum",
  description: "Start with a story you love. Find the threads that connect it to your next.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head>
      <body className={`${inter.className} flex min-h-svh flex-col`}>
        <ThemeProvider><AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
        </AuthProvider></ThemeProvider>
      </body>
    </html>
  );
}
