export type Department = string;

export const GENDERS = ["men", "women", "unisex"] as const;
export type Gender = (typeof GENDERS)[number];

export type PriceBand = "under-5000" | "5000-10000" | "10000-20000" | "over-20000";
export type KidsChoice = "kids" | "adult";

export type StoreSettings = {
  companyName: string;
  logo: string;
  description: string;
  socialUrl: string;
  announcement: string;
  pickupAddress: string;
  deliveryFeeCents: number;
  freeDeliveryThresholdCents: number;
  slug: string;
  subscriptionStatus: string;
  adminAccessEnabled: boolean;
  phone: string;
  email: string;
  location: string;
  hoursDays: string;
  hoursOpen: string;
  hoursClose: string;
  plan: string;
  trialEndsAt: string | null;
  setupPaid: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  mtaaniAccount: string;
  mpesaShortcode: string;
  mpesaPasskey: string;
  mpesaConsumerKey: string;
  mpesaConsumerSecret: string;
  stripePublishableKey: string;
  stripeSecretKey: string;
};

export type FooterItem = { id: string; kind: string; title: string; body: string; sort: number };
export type HelpItem = { id: string; question: string; answer: string; sort: number };
export type StockAlert = { id: string; productId: string; colorName: string; sizeLabel: string };

export type MainCategory = {
  id: string;
  slug: string;
  name: string;
  sort: number;
};

export type Hero = {
  id: string;
  slot: string;
  department: string | null;
  sort: number;
  eyebrow: string;
  headline: string;
  image: string;
  buttonLabel: string;
};

export type Highlight = { id: string; image: string; sort: number };
export type Category = { id: string; name: string; department: Department; sort: number };
export type ProductColor = { id: string; name: string; hex: string; sort: number };
export type ProductSize = { id: string; label: string; sort: number; inStock: boolean };
export type ProductStock = { colorName: string; sizeLabel: string; quantity: number; hidden?: boolean };
export type ProductImage = { id: string; image: string; alt: string; colorId: string | null; sort: number };
export type ProductDepartment = { department: Department; category: string };

export type Product = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  deliveryReturns: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  badge: string | null;
  gender: Gender;
  kids: boolean;
  active: boolean;
  membersOnly: boolean;
  departments: ProductDepartment[];
  colors: ProductColor[];
  sizes: ProductSize[];
  stock: ProductStock[];
  images: ProductImage[];
};

export type StorefrontPayload = {
  storeId: string;
  settings: StoreSettings;
  departments: MainCategory[];
  heroes: Hero[];
  highlights: Highlight[];
  categories: Category[];
  products: Product[];
  footer: FooterItem[];
  help: HelpItem[];
  payments: {
    stripe: boolean;
    stripePublishableKey: string | null;
    mpesa: boolean;
  };
  fulfillmentOptions: {
    pickup: boolean;
    delivery: boolean;
    mtaani: boolean;
  };
};

export type FilterState = {
  category: string | null;
  genders: Gender[];
  kids: KidsChoice[];
  prices: PriceBand[];
  sale: boolean;
  sizes: string[];
  colors: string[];
};

export type BagLine = {
  key: string;
  productId: string;
  size: string | null;
  color: string | null;
  quantity: number;
};

export type KnownOrder = {
  orderId: string;
  orderNumber: string;
  email: string;
};

export type OrderReceiptItem = {
  name: string;
  subtitle: string;
  size: string | null;
  color: string | null;
  quantity: number;
  unitPriceCents: number;
  image: string;
};

export type OrderReceipt = {
  orderId: string;
  orderNumber: string;
  status: string;
  statusDetail: string | null;
  email: string;
  fullName: string;
  phone: string;
  fulfillment: "delivery" | "pickup";
  area: string | null;
  street: string | null;
  note: string | null;
  pickupAddress: string | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  paymentMethod: string;
  mpesaReceipt: string | null;
  createdAt: string;
  items: OrderReceiptItem[];
};

export const emptyFilters: FilterState = {
  category: null,
  genders: [],
  kids: [],
  prices: [],
  sale: false,
  sizes: [],
  colors: [],
};

export function departmentLabel(department: string, departments: { slug: string; name: string }[] = []) {
  return departments.find((item) => item.slug === department)?.name ?? department;
}

export function departmentHeading(department: string, departments: { slug: string; name: string }[] = []) {
  return departmentLabel(department, departments);
}
