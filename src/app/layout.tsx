import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/shell/toaster";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  title: { default: "Call Intelligence", template: "%s · Call Intelligence" },
  description: "Every call transcribed, classified, scored against your call framework, and turned into coaching.",
  applicationName: "Call Intelligence",
  manifest: "/manifest.webmanifest",
};

// Light by default; dark only when the viewer picks it (saved per browser).
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f3f6fd" }, { media: "(prefers-color-scheme: dark)", color: "#060b26" }], colorScheme: "light dark" };

// Automated browsers and ?static=1 get final states with no animation, so QA screenshots show true values.
const staticScript = `try{if(localStorage.getItem("theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}if(navigator.webdriver||location.search.indexOf("static=1")>-1)document.documentElement.classList.add("static")`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: staticScript }} /></head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:shadow-lg">Skip to content</a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
