import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/shell/toaster";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: { default: "Call Intelligence", template: "%s · Call Intelligence" },
  description: "Every call transcribed, classified, scored against your call framework, and turned into coaching. A portfolio demo with fictional data.",
  applicationName: "Call Intelligence",
  manifest: "/manifest.webmanifest",
};

// Light only: the app never follows the OS theme.
export const viewport: Viewport = { themeColor: "#f6f7fb", colorScheme: "light" };

// Automated browsers and ?static=1 get final states with no animation, so QA screenshots show true values.
const staticScript = `if(navigator.webdriver||location.search.indexOf("static=1")>-1)document.documentElement.classList.add("static")`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: staticScript }} /></head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:shadow-lg">Skip to content</a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
