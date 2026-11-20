"use client";

import { useState, type CSSProperties, type SyntheticEvent } from "react";
import { applyFilters, filterOptions, filtersActive } from "@/lib/catalog";
import { departmentHeading, type Product } from "@/lib/types";
import { MediaImage } from "@/components/media-image";
import { IconChevron, IconSliders } from "@/components/storefront/icons";
import { useStore } from "@/components/storefront/context";
import { ProductPrice } from "@/components/storefront/price";

function cardImage(product: Product, colorId: string | null) {
  return product.images.find((image) => image.colorId === colorId) ?? product.images[0];
}

function ProductCard({ product }: { product: Product }) {
  const { push, member } = useStore();
  const [colorId, setColorId] = useState<string | null>(product.colors[0]?.id ?? null);
  const image = cardImage(product, colorId);
  const open = () => push({ type: "product", productId: product.id });
  return (
    <article>
      <button type="button" onClick={open} className="block w-full text-left">
        <div className="aspect-square overflow-hidden bg-canvas">
          {image ? (
            <MediaImage src={image.image} alt={image.alt || product.name} className="h-full w-full object-cover" />
          ) : null}
        </div>
      </button>
      <div className="px-2 md:px-0">
        {product.colors.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {product.colors.map((entry) => (
              <button
                key={entry.id}
                type="button"
                aria-label={entry.name}
                aria-pressed={colorId === entry.id}
                onClick={() => setColorId(entry.id)}
                className={`h-6 w-6 rounded-full border ${colorId === entry.id ? "border-ink" : "border-line"}`}
                style={{ background: entry.hex }}
              />
            ))}
          </div>
        ) : null}
        <button type="button" onClick={open} className="block w-full text-left">
          {product.badge ? <p className={`text-sm font-semibold text-sale ${product.colors.length > 0 ? "mt-2" : "mt-3"}`}>{product.badge}</p> : <div className="mt-3 h-5" />}
          <h3 className="text-[15px] font-medium leading-snug">{product.name}</h3>
          <p className="text-sm text-muted">{product.subtitle}</p>
          <ProductPrice product={product} member={Boolean(member)} tone="card" />
        </button>
      </div>
    </article>
  );
}

export function Catalog() {
  const store = useStore();
  const { data, department, filters, searchQuery, setCategory, push, clearFilters } = store;
  const signedIn = Boolean(store.member);
  const products = applyFilters(data.products, department, filters, searchQuery, signedIn);
  const options = filterOptions(data.products, department, filters.category, signedIn);
  const categories = data.categories.filter((category) => category.department === department);
  const hero = data.heroes.find((item) => item.slot === "hero3" && item.department === department);
  const chips = [
    options.genders.length > 0 ? { id: "gender" as const, label: "Gender", active: filters.genders.length > 0 } : null,
    options.kids || options.adults ? { id: "kids" as const, label: "Kids", active: filters.kids.length > 0 } : null,
    options.prices.length > 0 ? { id: "price" as const, label: "Shop By Price", active: filters.prices.length > 0 } : null,
    options.sale ? { id: "sale" as const, label: "Sale & Offers", active: filters.sale } : null,
    options.sizes.length > 0 ? { id: "size" as const, label: "Size", active: filters.sizes.length > 0 } : null,
    options.colors.length > 0 ? { id: "color" as const, label: "Colour", active: filters.colors.length > 0 } : null,
  ].filter((chip) => chip !== null);

  return (
    <section id="catalog" className={`px-4 pb-0 pt-6 md:px-6 ${store.searchOpen ? "scroll-mt-32" : "scroll-mt-16"}`}>
      <h2 className="text-[28px] font-medium leading-tight tracking-tight">
        {departmentHeading(department)} ({products.length})
      </h2>
      <div className="no-scrollbar -mx-4 mt-5 flex gap-6 overflow-x-auto px-4 text-base">
        {categories.map((category) => {
          const selected = filters.category === category.name;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setCategory(category.name)}
              className={`shrink-0 border-b-2 pb-2 ${selected ? "border-ink font-medium" : "border-transparent text-ink"}`}
            >
              {category.name}
            </button>
          );
        })}
      </div>
      <div className="no-scrollbar -mx-4 mt-4 flex items-center gap-2 overflow-x-auto px-4 pb-2">
        <button
          type="button"
          aria-label="All filters"
          onClick={() => push({ type: "filters" })}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line"
        >
          <IconSliders />
        </button>
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => push({ type: "filter", chip: chip.id })}
            className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-sm ${chip.active ? "border-ink bg-ink text-white" : "border-line"}`}
          >
            {chip.label}
            <IconChevron className={chip.active ? "text-white" : ""} />
          </button>
        ))}
        {filtersActive(filters) || filters.category ? (
          <button type="button" onClick={clearFilters} className="shrink-0 px-2 text-sm underline underline-offset-4">
            Clear Filters
          </button>
        ) : null}
      </div>
      {products.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">No products match these filters.</p>
      ) : (
        <>
          <div className="-mx-4 mt-4 grid grid-cols-2 gap-x-1 gap-y-8 md:mx-0 md:grid-cols-3 md:gap-x-3 md:gap-y-10 lg:grid-cols-4">
            {products.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {products.length >= 4 && hero ? (
            <div className="-mx-4 my-8 md:-mx-6 md:my-10">
              <HeroPanel
                image={hero.image}
                eyebrow={hero.eyebrow}
                headline={hero.headline}
                buttonLabel={hero.buttonLabel}
                onShop={store.scrollToCatalog}
              />
            </div>
          ) : null}
          {products.length > 4 ? (
            <div className="-mx-4 grid grid-cols-2 gap-x-1 gap-y-8 md:mx-0 md:grid-cols-3 md:gap-x-3 md:gap-y-10 lg:grid-cols-4">
              {products.slice(4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

export function HeroPanel({
  image,
  eyebrow,
  headline,
  buttonLabel,
  onShop,
}: {
  image: string;
  eyebrow: string;
  headline: string;
  buttonLabel: string;
  onShop: () => void;
}) {
  const [ratio, setRatio] = useState<number | null>(null);
  function rememberSize(image: HTMLImageElement) {
    if (image.naturalWidth > 0 && image.naturalHeight > 0) setRatio(image.naturalWidth / image.naturalHeight);
  }
  return (
    <section
      className={`relative w-full @container ${ratio ? "md:h-[min(calc(100cqw/var(--hero-ratio)),100dvh)] md:overflow-hidden" : ""}`}
      style={ratio ? ({ "--hero-ratio": String(ratio) } as CSSProperties) : undefined}
    >
      <MediaImage
        src={image}
        alt=""
        ref={(node) => {
          if (node?.complete) rememberSize(node);
        }}
        onLoad={(event: SyntheticEvent<HTMLImageElement>) => rememberSize(event.currentTarget)}
        className={`block h-auto w-full ${ratio ? "md:absolute md:inset-0 md:h-full md:object-cover" : ""}`}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/15" />
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center px-6 pb-10 text-center text-white md:pb-14">
        <p className="text-base">{eyebrow}</p>
        <h2 className="mt-2 max-w-md whitespace-pre-line text-4xl font-black uppercase leading-[0.95] tracking-tight md:text-6xl">
          {headline}
        </h2>
        <button type="button" onClick={onShop} className="mt-5 rounded-full bg-white px-7 py-2 text-sm font-medium text-ink">
          {buttonLabel}
        </button>
      </div>
    </section>
  );
}
