import Script from "next/script";
import { ApplyForm } from "@/components/apply-form";
import { CookieBar } from "@/components/cookie-bar";
import { MediaImage } from "@/components/media-image";
import { loadPlatformSettings } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let logo = "";
  let name = "Customs Kenya - Your Online Patreon";
  try {
    const platform = await loadPlatformSettings();
    logo = platform?.logo || "/customs_kenya_logo.png";
    name = platform?.companyName || name;
  } catch {
    logo = "/customs_kenya_logo.png";
  }
  return (
    <main className="min-h-screen bg-[#071422] text-white">
      <section className="mx-auto max-w-5xl px-6 py-16">
        {logo ? <MediaImage src={logo} alt={name} className="mb-6 h-20 w-auto" /> : null}
        <p className="text-sm uppercase tracking-[0.18em] text-[#9fd7e2]">{name}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-medium leading-tight md:text-6xl">From DMs to instant orders.</h1>
        <p className="mt-5 max-w-2xl text-lg text-[#d5e4ee]">
          Customs Kenya gives social media sellers a live catalogue and a checkout their customers can use without asking “Is this available?”
        </p>
        <p className="mt-4 max-w-2xl text-[#d5e4ee]">
          Pick a package and use it free for 30 days. Link and Growth setup are optional. Custom Brand includes setup because we load the catalogue with you.
        </p>
        <div className="mt-10">
          <link rel="stylesheet" href="/Packages/packages.css" />
          <div id="ck-packages" suppressHydrationWarning />
          <Script src="/Packages/packages.js" strategy="afterInteractive" />
        </div>
        <ApplyForm />
        <p className="mt-10 text-sm text-[#9fd7e2]">
          Have any questions? Send an email at{" "}
          <a className="underline" href="mailto:customsnairobi@gmail.com">customsnairobi@gmail.com</a>
          {" "}or call{" "}
          <a className="underline" href="https://wa.me/254704416016" target="_blank" rel="noopener noreferrer">0704416016</a>.
        </p>
      </section>
      <CookieBar />
    </main>
  );
}
