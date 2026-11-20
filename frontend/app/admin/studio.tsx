"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addCategoryAction,
  addHighlightAction,
  deleteCategoryAction,
  deleteHighlightAction,
  deleteProductAction,
  logoutAction,
  moveHighlightAction,
  saveHeroAction,
  saveProductAction,
  saveSettingsAction,
  setProductActiveAction,
} from "@/app/admin/actions";
import { OrdersPanel } from "@/app/admin/orders-panel";
import { ImageField } from "@/components/image-field";
import { MediaImage } from "@/components/media-image";
import { DEMO_DELIVERY_RETURNS } from "@/lib/policy";
import { stockCombinations } from "@/lib/stock";
import { DEPARTMENTS, departmentLabel, type Department, type Gender, type Hero, type Product, type StorefrontPayload } from "@/lib/types";

type Tab = "store" | "orders" | "heroes" | "highlights" | "categories" | "products";

export function Studio({ data }: { data: StorefrontPayload }) {
  const [tab, setTab] = useState<Tab>("store");
  return (
    <div className="min-h-screen overflow-x-clip bg-[#f6f6f6]">
      <header className="flex items-center justify-between bg-ink px-5 py-4 text-white">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/70">Nike Nairobi</p>
          <h1 className="text-xl font-medium">Studio</h1>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="text-sm underline underline-offset-4">Sign out</button>
        </form>
      </header>
      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        {(
          [
            ["store", "Store"],
            ["orders", "Orders"],
            ["heroes", "Heroes"],
            ["highlights", "Highlights"],
            ["categories", "Categories"],
            ["products", "Products"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-full px-4 py-2 text-sm ${tab === id ? "bg-ink text-white" : "bg-white"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="mx-auto min-w-0 max-w-3xl px-4 pb-16 [&_form]:min-w-0 [&_input]:max-w-full [&_input]:min-w-0 [&_select]:max-w-full [&_textarea]:max-w-full">
        {tab === "store" ? <StoreForm data={data} /> : null}
        {tab === "orders" ? <OrdersPanel /> : null}
        {tab === "heroes" ? <HeroForms heroes={data.heroes} /> : null}
        {tab === "highlights" ? <Highlights data={data} /> : null}
        {tab === "categories" ? <Categories data={data} /> : null}
        {tab === "products" ? <Products data={data} /> : null}
      </div>
    </div>
  );
}

function savedNote(result: { error?: string }) {
  return result.error ?? "Saved";
}

function Notice({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="mt-3 text-sm text-sale">{message}</p>;
}

function StoreForm({ data }: { data: StorefrontPayload }) {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: data.settings.companyName,
    logo: data.settings.logo,
    announcement: data.settings.announcement,
    pickupAddress: data.settings.pickupAddress,
    deliveryFeeKes: String(data.settings.deliveryFeeCents / 100),
    freeDeliveryThresholdKes: String(data.settings.freeDeliveryThresholdCents / 100),
  });
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      className="space-y-3 min-w-0 overflow-hidden rounded-2xl bg-white p-4 sm:p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await saveSettingsAction({
          ...form,
          deliveryFeeKes: Number(form.deliveryFeeKes),
          freeDeliveryThresholdKes: Number(form.freeDeliveryThresholdKes),
        });
        setMessage(savedNote(result));
        router.refresh();
      }}
    >
      <h2 className="text-lg font-medium">Store</h2>
      <label className="block text-sm">Company name<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} /></label>
      <ImageField label="Logo" value={form.logo} onChange={(logo) => setForm({ ...form, logo })} />
      <label className="block text-md">Announcement<span className="mt-1 block text-xs font-normal text-muted">One announcement per line. They take turns in the bar.</span><textarea className="mt-1 w-full rounded-lg border border-line px-3 py-2" rows={4} value={form.announcement} onChange={(event) => setForm({ ...form, announcement: event.target.value })} /></label>
      <label className="block text-sm">Pickup address<textarea className="mt-1 w-full rounded-lg border border-line px-3 py-2" rows={2} value={form.pickupAddress} onChange={(event) => setForm({ ...form, pickupAddress: event.target.value })} /></label>
      <label className="block text-sm">Delivery fee (KES)<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.deliveryFeeKes} onChange={(event) => setForm({ ...form, deliveryFeeKes: event.target.value })} /></label>
      <label className="block text-sm">Free delivery from (KES)<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.freeDeliveryThresholdKes} onChange={(event) => setForm({ ...form, freeDeliveryThresholdKes: event.target.value })} /></label>
      <button className="rounded-full bg-ink px-5 py-2 text-sm text-white" type="submit">Save store</button>
      <Notice message={message} />
    </form>
  );
}

function HeroForms({ heroes }: { heroes: Hero[] }) {
  return (
    <div className="space-y-4">
      {heroes.map((hero) => (
        <HeroForm key={hero.id} hero={hero} />
      ))}
    </div>
  );
}

function HeroForm({ hero }: { hero: Hero }) {
  const router = useRouter();
  const [form, setForm] = useState(hero);
  const [message, setMessage] = useState<string | null>(null);
  const title = hero.slot === "hero3" ? `Hero 3 · ${hero.department ? departmentLabel(hero.department) : ""}` : hero.slot === "hero1" ? "Hero 1" : "Hero 2";
  return (
    <form
      className="space-y-3 min-w-0 overflow-hidden rounded-2xl bg-white p-4 sm:p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await saveHeroAction({
          id: form.id,
          eyebrow: form.eyebrow,
          headline: form.headline,
          image: form.image,
          buttonLabel: form.buttonLabel,
        });
        setMessage(savedNote(result));
        router.refresh();
      }}
    >
      <h2 className="text-lg font-medium">{title}</h2>
      <label className="block text-sm">Eyebrow<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.eyebrow} onChange={(event) => setForm({ ...form, eyebrow: event.target.value })} /></label>
      <label className="block text-sm">Headline<textarea className="mt-1 w-full rounded-lg border border-line px-3 py-2" rows={2} value={form.headline} onChange={(event) => setForm({ ...form, headline: event.target.value })} /></label>
      <label className="block text-sm">Button<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.buttonLabel} onChange={(event) => setForm({ ...form, buttonLabel: event.target.value })} /></label>
      <ImageField label="Background image" value={form.image} onChange={(image) => setForm({ ...form, image })} />
      <button className="rounded-full bg-ink px-5 py-2 text-sm text-white" type="submit">Save hero</button>
      <Notice message={message} />
    </form>
  );
}

function Highlights({ data }: { data: StorefrontPayload }) {
  const router = useRouter();
  const [image, setImage] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const items = [...data.highlights].sort((a, b) => a.sort - b.sort);
  return (
    <div className="space-y-4 min-w-0 overflow-hidden rounded-2xl bg-white p-4 sm:p-5">
      <h2 className="text-lg font-medium">Highlight strip</h2>
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center gap-3 border-t border-line py-3">
          <MediaImage src={item.image} alt="" className="h-20 w-16 object-cover" />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="text-sm underline"
              disabled={index === 0}
              onClick={async () => {
                const ids = items.map((entry) => entry.id);
                const swapped = [...ids];
                [swapped[index - 1], swapped[index]] = [swapped[index], swapped[index - 1]];
                await moveHighlightAction(swapped);
                router.refresh();
              }}
            >
              Up
            </button>
            <button
              type="button"
              className="text-sm underline"
              onClick={async () => {
                await deleteHighlightAction(item.id);
                router.refresh();
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
      <ImageField label="New highlight" value={image} onChange={setImage} />
      <button
        type="button"
        className="rounded-full bg-ink px-5 py-2 text-sm text-white"
        onClick={async () => {
          const result = await addHighlightAction(image);
          setMessage(result.error ?? "Added");
          if ("ok" in result) setImage("");
          router.refresh();
        }}
      >
        Add highlight
      </button>
      <Notice message={message} />
    </div>
  );
}

function Categories({ data }: { data: StorefrontPayload }) {
  const router = useRouter();
  const [department, setDepartment] = useState<Department>("new");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl bg-white p-4 sm:p-5">
      <h2 className="text-lg font-medium">Categories</h2>
      {DEPARTMENTS.map((entry) => (
        <div key={entry} className="mt-4">
          <h3 className="font-medium">{departmentLabel(entry)}</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {data.categories
              .filter((category) => category.department === entry)
              .map((category) => (
                <li key={category.id} className="flex items-center justify-between border-b border-line py-2">
                  {category.name}
                  <button
                    type="button"
                    className="underline"
                    onClick={async () => {
                      await deleteCategoryAction(category.id);
                      router.refresh();
                    }}
                  >
                    Delete
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ))}
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <select className="rounded-lg border border-line px-3 py-2" value={department} onChange={(event) => setDepartment(event.target.value as Department)}>
          {DEPARTMENTS.map((entry) => (
            <option key={entry} value={entry}>{departmentLabel(entry)}</option>
          ))}
        </select>
        <input className="rounded-lg border border-line px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} placeholder="Category name" />
        <button
          type="button"
          className="rounded-full bg-ink px-4 py-2 text-sm text-white"
          onClick={async () => {
            const result = await addCategoryAction({ name, department });
            setMessage(result.error ?? "Added");
            if ("ok" in result) setName("");
            router.refresh();
          }}
        >
          Add
        </button>
      </div>
      <Notice message={message} />
    </div>
  );
}

function blankProduct(): ProductDraft {
  return {
    name: "",
    subtitle: "",
    description: "",
    deliveryReturns: DEMO_DELIVERY_RETURNS,
    priceKes: "",
    compareAtKes: "",
    membersOnly: false,
    badge: "",
    gender: "unisex",
    kids: false,
    active: true,
    departments: [{ department: "new", category: "Shoes" }],
    colors: [{ name: "Black", hex: "#111111" }],
    sizes: [{ label: "M" }],
    stock: [{ colorName: "Black", sizeLabel: "M", quantity: 4 }],
    images: [{ image: "", alt: "", colorName: "Black" }],
  };
}

type ProductDraft = {
  id?: string;
  name: string;
  subtitle: string;
  description: string;
  deliveryReturns: string;
  priceKes: string;
  compareAtKes: string;
  membersOnly: boolean;
  badge: string;
  gender: Gender;
  kids: boolean;
  active: boolean;
  departments: { department: Department; category: string }[];
  colors: { name: string; hex: string }[];
  sizes: { label: string }[];
  stock: { colorName: string; sizeLabel: string; quantity: number }[];
  images: { image: string; alt: string; colorName: string }[];
};

function fromProduct(product: Product): ProductDraft {
  return {
    id: product.id,
    name: product.name,
    subtitle: product.subtitle,
    description: product.description,
    deliveryReturns: product.deliveryReturns,
    priceKes: String(product.priceCents / 100),
    compareAtKes: product.compareAtPriceCents ? String(product.compareAtPriceCents / 100) : "",
    membersOnly: product.membersOnly,
    badge: product.badge ?? "",
    gender: product.gender,
    kids: product.kids,
    active: product.active,
    departments: product.departments,
    colors: product.colors.map((color) => ({ name: color.name, hex: color.hex })),
    sizes: product.sizes.map((size) => ({ label: size.label })),
    stock: product.stock,
    images: product.images.map((image) => ({
      image: image.image,
      alt: image.alt,
      colorName: product.colors.find((color) => color.id === image.colorId)?.name ?? "",
    })),
  };
}

function Products({ data }: { data: StorefrontPayload }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ProductDraft | null>(null);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  if (editing) return <ProductForm initial={editing} onDone={() => setEditing(null)} />;
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Products</h2>
        <button type="button" className="rounded-full bg-ink px-4 py-2 text-sm text-white" onClick={() => setEditing(blankProduct())}>
          New product
        </button>
      </div>
      <ul className="mt-4 divide-y divide-line">
        {data.products.map((product) => {
          const visible = visibility[product.id] ?? product.active;
          return (
            <li key={product.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div className="min-w-0">
                <p className="break-words font-medium">{product.name}</p>
                <label className="mt-1 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={async (event) => {
                      const active = event.target.checked;
                      setVisibility((current) => ({ ...current, [product.id]: active }));
                      setVisibilityError(null);
                      const result = await setProductActiveAction(product.id, active);
                      if ("error" in result && result.error) {
                        setVisibility((current) => ({ ...current, [product.id]: !active }));
                        setVisibilityError(result.error);
                        return;
                      }
                      router.refresh();
                    }}
                  />
                  Visible on the storefront
                </label>
                <p className="text-muted">{product.membersOnly ? "Members only · " : ""}KES {product.priceCents / 100}</p>
              </div>
              <div className="flex shrink-0 gap-3">
                <button type="button" className="underline" onClick={() => setEditing(fromProduct(product))}>Edit</button>
                <button
                  type="button"
                  className="underline"
                  onClick={async () => {
                    if (!window.confirm(`Delete ${product.name}?`)) return;
                    await deleteProductAction(product.id);
                    router.refresh();
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {visibilityError ? <p className="mt-3 text-sm text-sale">{visibilityError}</p> : null}
    </div>
  );
}

type ImageGroup = { colorName: string; alt: string; links: string[] };

function toImageGroups(images: ProductDraft["images"]): ImageGroup[] {
  const groups: ImageGroup[] = [];
  for (const image of images) {
    const existing = groups.find((group) => group.colorName === image.colorName && group.alt === image.alt);
    if (existing) existing.links.push(image.image);
    else groups.push({ colorName: image.colorName, alt: image.alt, links: [image.image] });
  }
  return groups.length > 0 ? groups : [{ colorName: "", alt: "", links: [""] }];
}

function imagesFromGroups(groups: ImageGroup[]) {
  const rows = groups.flatMap((group) =>
    group.links
      .map((image) => image.trim())
      .filter(Boolean)
      .map((image) => ({ image, alt: group.alt, colorName: group.colorName || null })),
  );
  return rows.length > 0 ? rows : [{ image: "", alt: "", colorName: null }];
}

function ProductForm({ initial, onDone }: { initial: ProductDraft; onDone: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [imageGroups, setImageGroups] = useState(() => toImageGroups(initial.images));
  const [message, setMessage] = useState<string | null>(null);

  function patchList<T>(key: "departments" | "colors" | "sizes" | "images", index: number, patch: Partial<T>) {
    setForm((current) => {
      const list = [...current[key]] as T[];
      list[index] = { ...list[index], ...patch };
      return { ...current, [key]: list };
    });
  }

  return (
    <form
      className="space-y-3 min-w-0 overflow-hidden rounded-2xl bg-white p-4 sm:p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await saveProductAction({
          id: form.id,
          name: form.name,
          subtitle: form.subtitle,
          description: form.description,
          deliveryReturns: form.deliveryReturns,
          priceKes: Number(form.priceKes),
          compareAtKes: form.compareAtKes.trim() ? Number(form.compareAtKes) : null,
          membersOnly: form.membersOnly,
          badge: form.badge.trim() ? form.badge.trim() : null,
          gender: form.gender,
          kids: form.kids,
          active: form.active,
          departments: form.departments,
          colors: form.colors,
          sizes: form.sizes,
          stock: stockCombinations(form.colors, form.sizes, form.stock),
          images: imagesFromGroups(imageGroups),
        });
        setMessage(savedNote(result));
        if ("ok" in result) {
          router.refresh();
          onDone();
        }
      }}
    >
      <button type="button" className="text-sm underline" onClick={onDone}>Back to products</button>
      <h2 className="text-lg font-medium">{form.id ? "Edit product" : "New product"}</h2>
      <label className="block text-sm">Name<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
      <label className="block text-sm">Subtitle<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} /></label>
      <label className="block text-sm">Price in KES<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.priceKes} onChange={(event) => setForm({ ...form, priceKes: event.target.value })} /></label>
      <label className="block text-sm">Compare-at price in KES<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.compareAtKes} onChange={(event) => setForm({ ...form, compareAtKes: event.target.value })} /></label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.membersOnly} onChange={(event) => setForm({ ...form, membersOnly: event.target.checked })} />
        Members only
      </label>
      <p className="text-sm text-muted">Members pay the set price. Everyone else pays the compare-at price.</p>
      <label className="block text-sm">Badge<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.badge} onChange={(event) => setForm({ ...form, badge: event.target.value })} /></label>
      <label className="block text-sm">Gender
        <select className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value as Gender })}>
          <option value="men">Men</option>
          <option value="women">Women</option>
          <option value="unisex">Unisex</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.kids} onChange={(event) => setForm({ ...form, kids: event.target.checked })} /> Kids product</label>
      <label className="block text-sm">Description<textarea className="mt-1 w-full rounded-lg border border-line px-3 py-2" rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
      <label className="block text-sm">Delivery and returns<textarea className="mt-1 w-full rounded-lg border border-line px-3 py-2" rows={3} value={form.deliveryReturns} onChange={(event) => setForm({ ...form, deliveryReturns: event.target.value })} /></label>

      <div>
        <p className="text-sm font-medium">Departments</p>
        {form.departments.map((entry, index) => (
          <div key={`${entry.department}-${index}`} className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <select className="rounded-lg border border-line px-2 py-2 text-sm" value={entry.department} onChange={(event) => patchList("departments", index, { department: event.target.value as Department })}>
              {DEPARTMENTS.map((department) => <option key={department} value={department}>{departmentLabel(department)}</option>)}
            </select>
            <input className="rounded-lg border border-line px-2 py-2 text-sm" value={entry.category} onChange={(event) => patchList("departments", index, { category: event.target.value })} />
            <button type="button" className="text-sm underline" onClick={() => setForm({ ...form, departments: form.departments.filter((_, item) => item !== index) })}>Remove</button>
          </div>
        ))}
        <button type="button" className="mt-2 text-sm underline" onClick={() => setForm({ ...form, departments: [...form.departments, { department: "men", category: "Shoes" }] })}>Add department</button>
      </div>

      <div>
        <p className="text-sm font-medium">Colours</p>
        {form.colors.map((color, index) => (
          <div key={`${color.name}-${index}`} className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_auto]">
            <input className="rounded-lg border border-line px-2 py-2 text-sm" value={color.name} onChange={(event) => patchList("colors", index, { name: event.target.value })} />
            <input className="rounded-lg border border-line px-2 py-2 text-sm" value={color.hex} onChange={(event) => patchList("colors", index, { hex: event.target.value })} />
            <button type="button" className="text-sm underline" onClick={() => setForm({ ...form, colors: form.colors.filter((_, item) => item !== index) })}>Remove</button>
          </div>
        ))}
        <button type="button" className="mt-2 text-sm underline" onClick={() => setForm({ ...form, colors: [...form.colors, { name: "", hex: "#111111" }] })}>Add colour</button>
      </div>

      <div>
        <p className="text-sm font-medium">Sizes</p>
        {form.sizes.map((size, index) => (
          <div key={`${size.label}-${index}`} className="mt-2 flex flex-wrap items-center gap-2">
            <input className="flex-1 rounded-lg border border-line px-2 py-2 text-sm" value={size.label} onChange={(event) => patchList("sizes", index, { label: event.target.value })} />
            <button type="button" className="text-sm underline" onClick={() => setForm({ ...form, sizes: form.sizes.filter((_, item) => item !== index) })}>Remove</button>
          </div>
        ))}
        <button type="button" className="mt-2 text-sm underline" onClick={() => setForm({ ...form, sizes: [...form.sizes, { label: "" }] })}>Add size</button>
      </div>

      <div>
        <p className="text-sm font-medium">Stock by colour and size</p>
        <p className="mt-1 text-xs text-muted">Available to sell for that colour and size. Checkout will not sell more than this. An unpaid checkout holds the quantity, and cancelling the order puts it back.</p>
        {stockCombinations(form.colors, form.sizes, form.stock).map((row) => (
          <label key={`${row.colorName}|${row.sizeLabel}`} className="mt-2 grid grid-cols-1 items-center gap-2 text-sm sm:grid-cols-[minmax(0,1fr)_6rem]">
            <span>{[row.colorName, row.sizeLabel].filter(Boolean).join(" / ") || "Default"}</span>
            <input
              type="number"
              min={0}
              className="rounded-lg border border-line px-2 py-2"
              value={row.quantity}
              onChange={(event) => {
                const quantity = Math.max(0, Math.floor(Number(event.target.value) || 0));
                setForm((current) => {
                  const next = stockCombinations(current.colors, current.sizes, current.stock).map((entry) =>
                    entry.colorName === row.colorName && entry.sizeLabel === row.sizeLabel ? { ...entry, quantity } : entry,
                  );
                  return { ...current, stock: next };
                });
              }}
            />
          </label>
        ))}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Images</p>
        <p className="text-xs text-muted">One colour and alt text can have several image links.</p>
        {imageGroups.map((group, index) => (
          <div key={`image-group-${index}`} className="space-y-2 rounded-xl border border-line p-3">
            <input
              className="w-full rounded-lg border border-line px-2 py-2 text-sm"
              placeholder="Colour name these images belong to"
              value={group.colorName}
              onChange={(event) => {
                const colorName = event.target.value;
                setImageGroups((current) => current.map((entry, item) => (item === index ? { ...entry, colorName } : entry)));
              }}
            />
            <input
              className="w-full rounded-lg border border-line px-2 py-2 text-sm"
              placeholder="Alt text"
              value={group.alt}
              onChange={(event) => {
                const alt = event.target.value;
                setImageGroups((current) => current.map((entry, item) => (item === index ? { ...entry, alt } : entry)));
              }}
            />
            {group.links.map((link, linkIndex) => (
              <div key={`image-link-${index}-${linkIndex}`}>
                <ImageField
                  label={group.links.length > 1 ? `Image link ${linkIndex + 1}` : "Image link or upload"}
                  value={link}
                  onChange={(value) => {
                    setImageGroups((current) =>
                      current.map((entry, item) =>
                        item === index ? { ...entry, links: entry.links.map((itemLink, itemIndex) => (itemIndex === linkIndex ? value : itemLink)) } : entry,
                      ),
                    );
                  }}
                />
                {group.links.length > 1 ? (
                  <button
                    type="button"
                    className="mt-2 text-sm underline"
                    onClick={() => {
                      setImageGroups((current) =>
                        current.map((entry, item) =>
                          item === index ? { ...entry, links: entry.links.filter((_, itemIndex) => itemIndex !== linkIndex) } : entry,
                        ),
                      );
                    }}
                  >
                    Remove link
                  </button>
                ) : null}
              </div>
            ))}
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                className="text-sm underline"
                onClick={() => {
                  setImageGroups((current) =>
                    current.map((entry, item) => (item === index ? { ...entry, links: [...entry.links, ""] } : entry)),
                  );
                }}
              >
                Add image link
              </button>
              <button
                type="button"
                className="text-sm underline"
                onClick={() => setImageGroups((current) => current.filter((_, item) => item !== index))}
              >
                Remove images
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="text-sm underline"
          onClick={() => setImageGroups((current) => [...current, { colorName: "", alt: "", links: [""] }])}
        >
          Add image
        </button>
      </div>

      <div className="flex gap-3">
        <button className="rounded-full bg-ink px-5 py-2 text-sm text-white" type="submit">Save product</button>
        {form.id ? (
          <button
            type="button"
            className="text-sm underline"
            onClick={async () => {
              if (!form.id) return;
              if (!window.confirm("Delete this product?")) return;
              await deleteProductAction(form.id);
              router.refresh();
              onDone();
            }}
          >
            Delete product
          </button>
        ) : null}
      </div>
      <Notice message={message} />
    </form>
  );
}
