export const DEPARTMENTS = ["new", "men", "women", "kids", "sport"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const GENDERS = ["men", "women", "unisex"] as const;
export type Gender = (typeof GENDERS)[number];

export type PriceBand = "under-5000" | "5000-10000" | "10000-20000" | "over-20000";
export type KidsChoice = "kids" | "adult";

export type StoreSettings = {
  companyName: string;
  logo: string;
  announcement: string;
  pickupAddress: string;
  deliveryFeeCents: number;
  freeDeliveryThresholdCents: number;
};

export type Hero = {
  id: string;
  slot: "hero1" | "hero2" | "hero3";
  department: Department | null;
  eyebrow: string;
  headline: string;
  image: string;
  buttonLabel: string;
};

export type Highlight = { id: string; image: string; sort: number };
export type Category = { id: string; name: string; department: Department; sort: number };
export type ProductColor = { id: string; name: string; hex: string; sort: number };
export type ProductSize = { id: string; label: string; sort: number; inStock: boolean };
export type ProductStock = { colorName: string; sizeLabel: string; quantity: number };
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
  settings: StoreSettings;
  heroes: Hero[];
  highlights: Highlight[];
  categories: Category[];
  products: Product[];
  payments: {
    stripe: boolean;
    stripePublishableKey: string | null;
    mpesa: boolean;
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

export function isDepartment(value: string): value is Department {
  return (DEPARTMENTS as readonly string[]).includes(value);
}

export function departmentHeading(department: Department) {
  switch (department) {
    case "new":
      return "New Nike Gear";
    case "men":
      return "Men's Nike Gear";
    case "women":
      return "Women's Nike Gear";
    case "kids":
      return "Kids' Nike Gear";
    case "sport":
      return "Sport Nike Gear";
  }
}

export function departmentLabel(department: Department) {
  switch (department) {
    case "new":
      return "New";
    case "men":
      return "Men";
    case "women":
      return "Women";
    case "kids":
      return "Kids";
    case "sport":
      return "Sport";
  }
}
