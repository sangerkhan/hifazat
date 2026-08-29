import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Serif_Text, Noto_Sans } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSerifText = DM_Serif_Text({
  variable: "--font-dm-serif-text",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal"],
});

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Hifazat — Know Your Rights",
  description:
    "Understand your rights under Pakistani law. Free, private, and available in English and Urdu.",
  openGraph: {
    title: "Hifazat — Know Your Rights",
    description:
      "Describe what happened and get clear guidance on your legal rights under Pakistani law. Free, private, and confidential.",
    type: "website",
    locale: "en_US",
    siteName: "Hifazat",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Hifazat — Know Your Rights",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hifazat — Know Your Rights",
    description:
      "Describe what happened and get clear guidance on your legal rights under Pakistani law. Free, private, and confidential.",
    images: ["/og-image.png"],
  },
};

/**
 * Mobile chrome.
 *
 * Without this the browser picked its own defaults: the Safari toolbar stayed
 * grey above a cream page, and on a notched phone the page stopped at the safe
 * area so the background ended in a black band. `viewport-fit: cover` lets the
 * page run edge to edge; the safe-area padding that makes that safe lives in
 * globals.css and on the docked action bars.
 *
 * `maximumScale` is deliberately 5 rather than 1. Blocking zoom is the usual
 * way to stop iOS scaling on focus, but it also takes pinch-to-zoom away from
 * anyone who needs it. Every input here is already 16px, which is what actually
 * stops the zoom-on-focus.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#faf8f6",
  // The docked submit buttons are `position: fixed`. Without this the on-screen
  // keyboard overlays them, so on the free-text screen the button someone needs
  // sits behind the keyboard they are typing on.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${dmSerifText.variable} ${notoSans.variable} h-full antialiased`}
    >
      {/* The 600px cap used to live here, which made every screen mobile-only.
          Width is now chosen per surface: forms stay narrow because a long
          measure is harder to fill in, prose stays readable, and card lists are
          free to use the space. */}
      <body className="min-h-full flex flex-col bg-hifazat-bg text-hifazat-ink font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
