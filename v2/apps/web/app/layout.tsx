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
  title: "SearchAnyCars.com — Find Your Perfect Used Car",
  description:
    "India's trusted used car broker marketplace. Browse verified listings, compare prices, and find your dream car.",
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
