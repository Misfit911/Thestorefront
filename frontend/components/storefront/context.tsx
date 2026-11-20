"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { selectionQuantity, variantQuantity } from "@/lib/stock";
import { DEPARTMENTS, emptyFilters, type BagLine, type Department, type FilterState, type Gender, type KidsChoice, type KnownOrder, type OrderReceipt, type PriceBand, type StorefrontPayload } from "@/lib/types";

export type OverlayInput =
  | { type: "menu" }
  | { type: "product"; productId: string }
  | { type: "added"; productId: string; size: string | null; color: string | null }
  | { type: "bag" }
  | { type: "checkout" }
  | { type: "success"; receipt: OrderReceipt }
  | { type: "orders" }
  | { type: "favourites" }
  | { type: "filters" }
  | { type: "filter"; chip: "gender" | "kids" | "price" | "sale" | "size" | "color" };

export type Overlay = OverlayInput & { id: string };

type StoreValue = {
  data: StorefrontPayload;
  department: Department;
  chooseDepartment: (department: Department) => void;
  searchOpen: boolean;
  searchQuery: string;
  toggleSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (value: string) => void;
  filters: FilterState;
  setCategory: (category: string | null) => void;
  toggleGender: (gender: Gender) => void;
  toggleKids: (choice: KidsChoice) => void;
  togglePrice: (band: PriceBand) => void;
  toggleSale: () => void;
  toggleSize: (size: string) => void;
  toggleColor: (color: string) => void;
  clearFilters: () => void;
  member: { fullName: string; email: string } | null;
  setMember: (member: { fullName: string; email: string } | null) => void;
  accountOpen: boolean;
  toggleAccount: () => void;
  closeAccount: () => void;
  bag: BagLine[];
  bagCount: number;
  addToBag: (input: { productId: string; size: string | null; color: string | null }) => void;
  setQty: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clearBag: () => void;
  favourites: string[];
  toggleFavourite: (productId: string) => void;
  knownOrders: KnownOrder[];
  rememberOrder: (order: KnownOrder) => void;
  overlays: Overlay[];
  push: (overlay: OverlayInput) => void;
  back: () => void;
  toggleBag: () => void;
  showSuccess: (receipt: OrderReceipt) => void;
  goHome: () => void;
  scrollToCatalog: () => void;
  navDepartments: Department[];
  setNavDepartments: (departments: Department[]) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

function withId(overlay: OverlayInput): Overlay {
  return { ...overlay, id: crypto.randomUUID() };
}

function toggleItem<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function StoreProvider({ data, children }: { data: StorefrontPayload; children: React.ReactNode }) {
  const [department, setDepartment] = useState<Department>(() => {
    return (
      DEPARTMENTS.find((item) =>
        data.products.some((product) => product.departments.some((entry) => entry.department === item)),
      ) ?? "new"
    );
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [member, setMember] = useState<{ fullName: string; email: string } | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [bag, setBag] = useState<BagLine[]>([]);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [knownOrders, setKnownOrders] = useState<KnownOrder[]>([]);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [navDepartments, setNavDepartments] = useState<Department[]>([]);
  const [ready, setReady] = useState(false);
  const pushedRef = useRef(0);
  const suppressPopRef = useRef(0);

  useEffect(() => {
    const onPop = () => {
      if (suppressPopRef.current > 0) {
        suppressPopRef.current -= 1;
        return;
      }
      pushedRef.current = Math.max(0, pushedRef.current - 1);
      setOverlays((current) => current.slice(0, -1));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    try {
      setBag(JSON.parse(localStorage.getItem("nn-bag") || "[]"));
      setFavourites(JSON.parse(localStorage.getItem("nn-favourites") || "[]"));
      setKnownOrders(JSON.parse(localStorage.getItem("nn-orders") || "[]"));
    } catch {
      setBag([]);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("nn-bag", JSON.stringify(bag));
  }, [bag, ready]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("nn-favourites", JSON.stringify(favourites));
  }, [favourites, ready]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("nn-orders", JSON.stringify(knownOrders));
  }, [knownOrders, ready]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/members/me");
        if (!response.ok) return;
        const json = (await response.json()) as { member: { fullName: string; email: string } | null };
        if (!cancelled) setMember(json.member);
      } catch {
        // The shop stays usable when the member check cannot be reached.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (overlays.length === 0 && !accountOpen) return;
    const html = document.documentElement;
    const previousHtml = html.style.overflow;
    const previousBody = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = previousHtml;
      document.body.style.overflow = previousBody;
    };
  }, [accountOpen, overlays.length]);

  const value = useMemo<StoreValue>(() => {
    const scrollToCatalog = () => {
      window.setTimeout(() => {
        document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 40);
    };
    const pushHistory = () => {
      window.history.pushState({ nn: true }, "");
      pushedRef.current += 1;
    };
    const backHistory = () => {
      if (pushedRef.current > 0) {
        window.history.back();
        return;
      }
      setOverlays((current) => current.slice(0, -1));
    };
    const openOverlay = (overlay: OverlayInput) => {
      setOverlays((current) => [...current, withId(overlay)]);
      pushHistory();
    };
    const dismissOverlays = () => {
      const steps = pushedRef.current;
      if (steps > 0) {
        suppressPopRef.current = steps;
        pushedRef.current = 0;
        window.history.go(-steps);
        window.setTimeout(() => {
          suppressPopRef.current = 0;
        }, 0);
      }
      setOverlays([]);
    };
    return {
      data,
      department,
      chooseDepartment: (next) => {
        setDepartment(next);
        setFilters(emptyFilters);
        dismissOverlays();
        scrollToCatalog();
      },
      searchOpen,
      searchQuery,
      toggleSearch: () => {
        dismissOverlays();
        if (searchOpen) setSearchQuery("");
        else scrollToCatalog();
        setSearchOpen((open) => !open);
      },
      closeSearch: () => {
        setSearchOpen(false);
        setSearchQuery("");
      },
      setSearchQuery,
      filters,
      setCategory: (category) => setFilters((current) => ({ ...current, category: current.category === category ? null : category })),
      toggleGender: (gender) => setFilters((current) => ({ ...current, genders: toggleItem(current.genders, gender) })),
      toggleKids: (choice) => setFilters((current) => ({ ...current, kids: toggleItem(current.kids, choice) })),
      togglePrice: (band) => setFilters((current) => ({ ...current, prices: toggleItem(current.prices, band) })),
      toggleSale: () => setFilters((current) => ({ ...current, sale: !current.sale })),
      toggleSize: (size) => setFilters((current) => ({ ...current, sizes: toggleItem(current.sizes, size) })),
      toggleColor: (color) => setFilters((current) => ({ ...current, colors: toggleItem(current.colors, color) })),
      clearFilters: () => setFilters(emptyFilters),
      member,
      setMember,
      accountOpen,
      toggleAccount: () => setAccountOpen((open) => !open),
      closeAccount: () => setAccountOpen(false),
      bag,
      bagCount: bag.reduce((sum, line) => sum + line.quantity, 0),
      addToBag: ({ productId, size, color }) => {
        const product = data.products.find((item) => item.id === productId);
        const available = product ? selectionQuantity(product, color, size) : 0;
        if (available == null || available < 1) return;
        const key = `${productId}|${size ?? ""}|${color ?? ""}`;
        const existing = bag.find((line) => line.key === key);
        const nextQuantity = Math.min(10, available, (existing?.quantity ?? 0) + 1);
        if (existing && nextQuantity <= existing.quantity) return;
        setBag((current) => {
          const line = current.find((item) => item.key === key);
          if (!line) return [...current, { key, productId, size, color, quantity: 1 }];
          return current.map((item) => (item.key === key ? { ...item, quantity: Math.min(nextQuantity, item.quantity + 1) } : item));
        });
        openOverlay({ type: "added", productId, size, color });
      },
      setQty: (key, quantity) => {
        setBag((current) => {
          const line = current.find((item) => item.key === key);
          if (!line) return current;
          if (quantity <= 0) return current.filter((item) => item.key !== key);
          const product = data.products.find((item) => item.id === line.productId);
          const available = product ? variantQuantity(product.stock, line.color, line.size) : quantity;
          const next = Math.min(quantity, 10, Math.max(available, 0));
          if (next <= 0) return current.filter((item) => item.key !== key);
          return current.map((item) => (item.key === key ? { ...item, quantity: next } : item));
        });
      },
      removeLine: (key) => setBag((current) => current.filter((line) => line.key !== key)),
      clearBag: () => setBag([]),
      favourites,
      toggleFavourite: (productId) =>
        setFavourites((current) => (current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId])),
      knownOrders,
      rememberOrder: (order) =>
        setKnownOrders((current) => [order, ...current.filter((item) => item.orderId !== order.orderId)].slice(0, 20)),
      overlays,
      push: openOverlay,
      back: backHistory,
      toggleBag: () => {
        if (overlays.at(-1)?.type === "bag") {
          backHistory();
          return;
        }
        if (overlays.some((item) => item.type === "bag")) return;
        openOverlay({ type: "bag" });
      },
      showSuccess: (receipt) => {
        const extra = Math.max(0, pushedRef.current - 1);
        if (pushedRef.current === 0) pushHistory();
        else if (extra > 0) {
          suppressPopRef.current = extra;
          pushedRef.current = 1;
          window.history.go(-extra);
        }
        setOverlays([withId({ type: "success", receipt })]);
      },
      goHome: () => {
        dismissOverlays();
        setSearchOpen(false);
        setSearchQuery("");
        window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
      },
      scrollToCatalog,
      navDepartments,
      setNavDepartments,
    };
  }, [accountOpen, bag, data, department, favourites, filters, knownOrders, member, navDepartments, overlays, searchOpen, searchQuery]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("Store is unavailable");
  return value;
}
