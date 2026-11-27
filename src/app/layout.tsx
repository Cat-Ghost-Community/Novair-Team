import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { site } from "@/config/site";
import { ThemeScript } from "@/components/theme/theme-script";
import "./globals.css";

const vazirmatn = localFont({
  src: "../../public/fonts/vazirmatn-arabic-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-vazirmatn",
  fallback: ["Tahoma", "Arial", "sans-serif"],
});

const vazirmatnLatin = localFont({
  src: "../../public/fonts/vazirmatn-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  variable: "--font-vazirmatn-latin",
});

export const metadata: Metadata = {
  metadataBase: site.url,
  title: { default: site.title, template: "%s | نوایر" },
  description: site.description,
  applicationName: site.name,
  robots: { index: false, follow: false, nocache: true },
  openGraph: { title: site.title, description: site.description, siteName: site.name, locale: "fa_IR", type: "website" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f9f7ff" }, { media: "(prefers-color-scheme: dark)", color: "#161525" }] };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fa" dir="rtl" data-theme="light" suppressHydrationWarning className={`${vazirmatnLatin.variable} ${vazirmatn.variable}`}>
    <head><ThemeScript /></head>
    <body><a className="skip-link" href="#main-content">رفتن به محتوای اصلی</a>{children}</body>
  </html>;
}
