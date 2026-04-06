import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { SiteHeader } from "../src/components/SiteHeader";
import { SiteFooter } from "../src/components/SiteFooter";
import { MobileNav } from "../src/components/MobileNav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://searchanycars.com'),
  title: {
    default: 'SearchAnyCars — Buy Certified Used Cars in India',
    template: '%s | SearchAnyCars',
  },
  description: 'Find certified pre-owned cars from trusted dealers across India. 200+ point inspection, 1-year warranty, 7-day money back guarantee.',
  keywords: ['used cars', 'second hand cars', 'India', 'buy car online', 'certified pre-owned', 'used car warranty'],
  authors: [{ name: 'SearchAnyCars' }],
  creator: 'SearchAnyCars',
  publisher: 'SearchAnyCars',
  formatDetection: { telephone: true, email: true },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'SearchAnyCars',
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@searchanycars',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body>
        <Providers>
          <SiteHeader />
          {children}
          <SiteFooter />
          <MobileNav />
        </Providers>
      </body>
    </html>
  );
}
