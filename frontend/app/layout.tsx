import type { Metadata, Viewport } from "next";
import { Arimo } from "next/font/google";
import { circularFaviconUrl } from "@/lib/circular-favicon";
import { resolveImageSrc } from "@/lib/images";
import { loadPlatformSettings } from "@/lib/db/queries";
import "./globals.css";

const arimo = Arimo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arimo",
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  try {
    const platform = await loadPlatformSettings();
    const name = platform?.companyName || "Storefront";
    const icon = platform?.logo ? resolveImageSrc(platform.logo) : undefined;
    return {
      title: { absolute: name },
      description: `${name} - Your Online Patreon.`,
      applicationName: name,
      icons: icon ? { icon: [{ url: circularFaviconUrl(icon), type: "image/png" }] } : undefined,
      openGraph: { title: name, siteName: name, type: "website" },
    };
  } catch {
    return { title: { absolute: "Storefront" } };
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={arimo.className}>
      <body>{children}</body>
    </html>
  );
}
