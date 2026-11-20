import type { Metadata, Viewport } from "next";
import { Arimo } from "next/font/google";
import "./globals.css";

const arimo = Arimo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arimo",
});



export const metadata: Metadata = {
  title: {
    default: "Nike Nairobi",
    template: "%s · Nike Nairobi",
  },
  description:
    "Nike Nairobi is a store for shoes, clothing, and sport gear in Nairobi. Shop in Kenyan shillings, with delivery across Kenya or pickup in Westlands.",
  applicationName: "Nike Nairobi",
  openGraph: {
    title: "Nike Nairobi",
    description:
      "Shoes, clothing, and sport gear from the Nike store in Nairobi. Prices in KES, with delivery or in-store pickup.",
    locale: "en_KE",
    type: "website",
    siteName: "Nike Nairobi",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={arimo.className}>
      <body>{children}</body>
    </html>
  );
}
