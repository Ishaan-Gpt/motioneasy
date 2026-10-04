import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Footer, Nav } from "@/components/site/nav";
import { Loader, SmoothScroll, TransitionProvider } from "@/components/site/motion";
import { ToastProvider } from "@/components/site/toast";

export const metadata: Metadata = {
  title: { default: "MotionEasy · Motion components for social video", template: "%s · MotionEasy" },
  description:
    "A library of cinematic, deterministic motion components for Reels, Shorts and TikToks. Customise text, colour and media, export an MP4 in your browser, or copy a prompt any LLM can follow exactly.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#FFFFEB", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <TransitionProvider>
            <Loader />
            <SmoothScroll />
            <Nav />
            <main className="min-h-screen pt-[var(--nav-h)]">{children}</main>
            <Footer />
          </TransitionProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
