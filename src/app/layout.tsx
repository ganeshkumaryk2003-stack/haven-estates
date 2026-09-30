import type { Metadata, Viewport } from "next";
import { Figtree, Source_Serif_4 } from "next/font/google";
import { Providers } from "@/components/providers";
import { APP_DESCRIPTION, APP_FULL_NAME, APP_NAME } from "@/lib/constants";
import { absoluteUrl } from "@/lib/utils";
import "./globals.css";

// Figtree for the interface, Source Serif 4 for headings and prices (the "opsz" axis lets the
// browser pick optical sizes, so the serif stays crisp at 14px and elegant at 60px).
const figtree = Figtree({ subsets: ["latin"], variable: "--font-ui", display: "swap" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif", display: "swap", axes: ["opsz"] });

const DEFAULT_TITLE = `${APP_FULL_NAME} · Buy, rent and sell property across India`;

// Favicon, Apple touch icon and the Open Graph image come from src/app/icon.tsx,
// apple-icon.tsx and opengraph-image.tsx (Next.js file conventions) and are injected automatically.
export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl("/")),
  title: {
    default: DEFAULT_TITLE,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: ["real estate India", "flats for sale", "flats for rent", "residential plots", "industrial plots", "list a property", APP_NAME, APP_FULL_NAME],
  openGraph: {
    type: "website",
    siteName: APP_FULL_NAME,
    title: DEFAULT_TITLE,
    description: APP_DESCRIPTION,
    url: absoluteUrl("/"),
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: DEFAULT_TITLE, description: APP_DESCRIPTION },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBFAF8" },
    { media: "(prefers-color-scheme: dark)", color: "#0D1320" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={`${figtree.variable} ${sourceSerif.variable}`}>
      <body className="flex min-h-screen flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
