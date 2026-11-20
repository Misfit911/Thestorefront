import { config } from "dotenv";
import { DEMO_DELIVERY_RETURNS } from "../policy";

config({ path: ".env.local" });

const RETURNS = DEMO_DELIVERY_RETURNS;

async function main() {
  const { db } = await import("./index");
  const schema = await import("./schema");
  const { eq } = await import("drizzle-orm");

  const existing = await db.select().from(schema.storeSettings);
  if (existing.length > 0) {
    console.log("Store already has settings. Seed skipped.");
    return;
  }

  await db.insert(schema.storeSettings).values({
    id: "default",
    companyName: "Nike Nairobi",
    logo: "/nike_logo.jpg",
    announcement:
      "Demonstration catalog. Delivery fees are calculated at checkout.\nPickup shows no delivery fee. Timing is confirmed only after payment.",
    pickupAddress: "Nike Nairobi, Westlands, Waiyaki Way, Nairobi",
    deliveryFeeCents: 45000,
    freeDeliveryThresholdCents: 1_500_000,
  });

  await db.insert(schema.heroes).values([
    {
      id: "hero1",
      slot: "hero1",
      department: null,
      eyebrow: "Nike Winter Essentials",
      headline: "Winter Heat\nJust Landed",
      image: "/screenshots/NEW/1.png",
      buttonLabel: "Shop",
    },
    {
      id: "hero2",
      slot: "hero2",
      department: null,
      eyebrow: "Nike Tech",
      headline: "Outlast Everything",
      image: "/screenshots/NEW/3.png",
      buttonLabel: "Shop",
    },
    {
      id: "hero3-new",
      slot: "hero3",
      department: "new",
      eyebrow: "Just In",
      headline: "Built For Nairobi",
      image: "/screenshots/MEN_WOMEN_KIDS_SPORT/main_hero.png",
      buttonLabel: "Shop",
    },
    {
      id: "hero3-men",
      slot: "hero3",
      department: "men",
      eyebrow: "Men",
      headline: "Run The City",
      image: "/screenshots/NEW/3.png",
      buttonLabel: "Shop",
    },
    {
      id: "hero3-women",
      slot: "hero3",
      department: "women",
      eyebrow: "Women",
      headline: "Train In Colour",
      image: "/screenshots/NEW/1.png",
      buttonLabel: "Shop",
    },
    {
      id: "hero3-kids",
      slot: "hero3",
      department: "kids",
      eyebrow: "Kids",
      headline: "Shoes For Growing Feet",
      image: "/screenshots/MEN_WOMEN_KIDS_SPORT/main_hero.png",
      buttonLabel: "Shop",
    },
    {
      id: "hero3-sport",
      slot: "hero3",
      department: "sport",
      eyebrow: "Sport",
      headline: "For Every Game",
      image: "/screenshots/NEW/3.png",
      buttonLabel: "Shop",
    },
  ]);

  await db.insert(schema.highlights).values([
    { id: "hl-1", image: "/screenshots/NEW/2.png", sort: 0 },
    { id: "hl-2", image: "/screenshots/MEN_WOMEN_KIDS_SPORT/main.png", sort: 1 },
    { id: "hl-3", image: "/screenshots/Product_view/1.png", sort: 2 },
    { id: "hl-4", image: "/screenshots/MEN_WOMEN_KIDS_SPORT/main_hero.png", sort: 3 },
  ]);

  const categoryRows = [
    ["new", ["Shoes", "Tops & T-Shirts", "Shorts", "Jackets"]],
    ["men", ["Shoes", "Tops & T-Shirts", "Shorts"]],
    ["women", ["Shoes", "Tops & T-Shirts", "Shorts", "Jackets"]],
    ["kids", ["Shoes", "Tops & T-Shirts"]],
    ["sport", ["Running", "Basketball", "Football", "Training"]],
  ] as const;

  await db.insert(schema.categories).values(
    categoryRows.flatMap(([department, names]) =>
      names.map((name, sort) => ({
        id: `cat-${department}-${sort}`,
        name,
        department,
        sort,
      })),
    ),
  );

  type SeedProduct = {
    id: string;
    name: string;
    subtitle: string;
    description: string;
    priceCents: number;
    compareAtPriceCents?: number;
    badge?: string;
    gender: "men" | "women" | "unisex";
    kids?: boolean;
    departments: { department: string; category: string }[];
    colors: { name: string; hex: string }[];
    sizes: { label: string; inStock?: boolean }[];
    images: string[];
  };

  const shoes = ["UK 5.5", "UK 6", "UK 6.5", "UK 7", "UK 7.5", "UK 8", "UK 8.5", "UK 9", "UK 9.5", "UK 10"];
  const apparel = ["S", "M", "L", "XL"];
  const kidsShoes = ["UK 10C", "UK 11C", "UK 12C", "UK 13C", "UK 1", "UK 2"];

  const catalog: SeedProduct[] = [
    {
      id: "prod-waffle",
      name: "Waffle Racer",
      subtitle: "Women's Shoes",
      description: "A low-profile racer with a cushioned ride for warm-ups around Nairobi and easy days off the track.",
      priceCents: 1_499_900,
      badge: "Just In",
      gender: "women",
      departments: [
        { department: "new", category: "Shoes" },
        { department: "women", category: "Shoes" },
      ],
      colors: [
        { name: "Burgundy", hex: "#5c2a2a" },
        { name: "Sail", hex: "#f4f1ea" },
      ],
      sizes: shoes.map((label) => ({ label })),
      images: ["/screenshots/MEN_WOMEN_KIDS_SPORT/main.png", "/screenshots/Product_view/1.png"],
    },
    {
      id: "prod-kd19",
      name: "KD19 'Aunt Pearl'",
      subtitle: "Basketball Shoes",
      description: "A lightweight basketball shoe with full-length cushioning for indoor courts and outdoor games.",
      priceCents: 1_899_900,
      compareAtPriceCents: 2_299_900,
      badge: "Highly Rated",
      gender: "men",
      departments: [
        { department: "new", category: "Shoes" },
        { department: "men", category: "Shoes" },
        { department: "sport", category: "Basketball" },
      ],
      colors: [
        { name: "Pink Foam", hex: "#d7a3b5" },
        { name: "Purple", hex: "#c7b6d8" },
        { name: "Hot Punch", hex: "#ff2f86" },
      ],
      sizes: shoes.map((label, index) => ({ label, inStock: index !== 1 })),
      images: ["/screenshots/Product_view/1.png", "/screenshots/Product_view/2.png", "/screenshots/Product_view/3.png"],
    },
    {
      id: "prod-pegasus",
      name: "Pegasus Run",
      subtitle: "Men's Road Running Shoes",
      description: "Responsive cushioning for daily kilometres, from Westlands hills to a flat waterfront run.",
      priceCents: 1_699_900,
      badge: "Just In",
      gender: "men",
      departments: [
        { department: "new", category: "Shoes" },
        { department: "men", category: "Shoes" },
        { department: "sport", category: "Running" },
      ],
      colors: [{ name: "Black", hex: "#111111" }, { name: "Volt", hex: "#d6ff3f" }],
      sizes: shoes.map((label) => ({ label })),
      images: ["/screenshots/Product_view/2.png"],
    },
    {
      id: "prod-jacket",
      name: "Windrunner Jacket",
      subtitle: "Women's Jacket",
      description: "A light shell for cool Nairobi mornings. Water-resistant fabric with a packable hood.",
      priceCents: 2_199_900,
      badge: "Just In",
      gender: "women",
      departments: [
        { department: "new", category: "Jackets" },
        { department: "women", category: "Jackets" },
      ],
      colors: [{ name: "Sand", hex: "#c2a57a" }, { name: "Black", hex: "#1c1c1c" }],
      sizes: apparel.map((label) => ({ label })),
      images: ["/screenshots/NEW/1.png"],
    },
    {
      id: "prod-kids-shoe",
      name: "Revolution Kids",
      subtitle: "Kids' Shoes",
      description: "A soft everyday trainer with a strap-friendly fit for school and weekend play.",
      priceCents: 799_900,
      badge: "Just In",
      gender: "unisex",
      kids: true,
      departments: [
        { department: "new", category: "Shoes" },
        { department: "kids", category: "Shoes" },
      ],
      colors: [{ name: "Blue", hex: "#2f6fed" }, { name: "Pink", hex: "#f3a6c8" }],
      sizes: kidsShoes.map((label) => ({ label })),
      images: ["/screenshots/Product_view/4.png"],
    },
    {
      id: "prod-tee",
      name: "Dri-FIT Tee",
      subtitle: "Men's Training Top",
      description: "Sweat-wicking cotton-touch jersey for gym sessions and warm afternoons.",
      priceCents: 499_900,
      gender: "men",
      departments: [{ department: "men", category: "Tops & T-Shirts" }],
      colors: [{ name: "White", hex: "#f7f7f7" }, { name: "Black", hex: "#111111" }],
      sizes: apparel.map((label) => ({ label })),
      images: ["/screenshots/NEW/2.png"],
    },
    {
      id: "prod-shorts",
      name: "Attack Short",
      subtitle: "Women's Shorts",
      description: "A brief training short with a comfortable inner brief and side pockets.",
      priceCents: 449_900,
      compareAtPriceCents: 699_900,
      badge: "Just In",
      gender: "women",
      departments: [
        { department: "new", category: "Shorts" },
        { department: "women", category: "Shorts" },
        { department: "sport", category: "Training" },
      ],
      colors: [{ name: "Black", hex: "#111111" }],
      sizes: apparel.map((label) => ({ label })),
      images: ["/screenshots/NEW/3.png"],
    },
    {
      id: "prod-kids-tee",
      name: "Kids Play Tee",
      subtitle: "Kids' T-Shirt",
      description: "A soft tee that stands up to the playground and washes clean.",
      priceCents: 349_900,
      gender: "unisex",
      kids: true,
      departments: [{ department: "kids", category: "Tops & T-Shirts" }],
      colors: [{ name: "Game Royal", hex: "#2456d6" }],
      sizes: ["XS", "S", "M", "L"].map((label) => ({ label })),
      images: ["/screenshots/MEN_WOMEN_KIDS_SPORT/main_hero.png"],
    },
    {
      id: "prod-football",
      name: "Mercurial Boot",
      subtitle: "Firm-Ground Football Boots",
      description: "A close-fitting boot for firm ground, with a textured upper for wet and dry pitches.",
      priceCents: 1_999_900,
      gender: "men",
      departments: [
        { department: "men", category: "Shoes" },
        { department: "sport", category: "Football" },
      ],
      colors: [{ name: "Volt", hex: "#e4ff4a" }, { name: "Black", hex: "#111111" }],
      sizes: shoes.map((label) => ({ label })),
      images: ["/screenshots/Product_view/3.png"],
    },
    {
      id: "prod-training",
      name: "Metcon Trainer",
      subtitle: "Training Shoes",
      description: "A stable trainer for lifts, classes, and short runs between sessions.",
      priceCents: 1_599_900,
      badge: "Just In",
      gender: "unisex",
      departments: [
        { department: "new", category: "Shoes" },
        { department: "women", category: "Shoes" },
        { department: "sport", category: "Training" },
      ],
      colors: [{ name: "Phantom", hex: "#6d6d6d" }],
      sizes: shoes.map((label) => ({ label })),
      images: ["/screenshots/Product_view/2.png"],
    },
  ];

  for (const product of catalog) {
    await db.insert(schema.products).values({
      id: product.id,
      name: product.name,
      subtitle: product.subtitle,
      description: product.description,
      deliveryReturns: RETURNS,
      priceCents: product.priceCents,
      compareAtPriceCents: product.compareAtPriceCents ?? null,
      badge: product.badge ?? null,
      gender: product.gender,
      kids: product.kids ?? false,
      active: true,
    });
    await db.insert(schema.productDepartments).values(
      product.departments.map((entry) => ({
        productId: product.id,
        department: entry.department,
        category: entry.category,
      })),
    );
    const colorIds: string[] = [];
    for (const [index, color] of product.colors.entries()) {
      const id = `${product.id}-color-${index}`;
      colorIds.push(id);
      await db.insert(schema.productColors).values({
        id,
        productId: product.id,
        name: color.name,
        hex: color.hex,
        sort: index,
      });
    }
    await db.insert(schema.productSizes).values(
      product.sizes.map((size, index) => ({
        id: `${product.id}-size-${index}`,
        productId: product.id,
        label: size.label,
        sort: index,
        inStock: size.inStock !== false,
      })),
    );
    await db.insert(schema.productInventory).values(
      product.colors.flatMap((color) =>
        product.sizes.map((size) => ({
          id: crypto.randomUUID(),
          productId: product.id,
          colorName: color.name,
          sizeLabel: size.label,
          quantity: size.inStock === false ? 0 : 4,
        })),
      ),
    );
    await db.insert(schema.productImages).values(
      product.images.map((image, index) => ({
        id: `${product.id}-image-${index}`,
        productId: product.id,
        colorId: colorIds[index] ?? colorIds[0] ?? null,
        image,
        alt: product.name,
        sort: index,
      })),
    );
  }

  const check = await db.select().from(schema.products).where(eq(schema.products.id, "prod-waffle"));
  console.log(`Seeded Nike Nairobi with ${check.length > 0 ? catalog.length : 0} products.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
