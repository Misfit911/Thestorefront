"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DEPARTMENTS, departmentLabel, type Department, type StorefrontPayload } from "@/lib/types";
import { MediaImage } from "@/components/media-image";
import { Catalog, HeroPanel } from "@/components/storefront/catalog";
import { StoreProvider, useStore } from "@/components/storefront/context";
import { Footer } from "@/components/storefront/footer";
import { Newsletter } from "@/components/storefront/newsletter";
import { IconBag, IconClose, IconMenu, IconSearch, IconUser } from "@/components/storefront/icons";
import { MemberDialog } from "@/components/storefront/member-dialog";
import { Overlays } from "@/components/storefront/overlays";

export function Storefront({ data }: { data: StorefrontPayload }) {
  return (
    <StoreProvider data={data}>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const store = useStore();
  const handled = useRef(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLButtonElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const navMeasureRef = useRef<HTMLDivElement>(null);
  const announcementRef = useRef<HTMLDivElement>(null);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const slotRef = useRef<HTMLDivElement>(null);
  const [announcementHeight, setAnnouncementHeight] = useState(0);
  const [slide, setSlide] = useState(0);
  const [slideShift, setSlideShift] = useState(100);
  const [slideSmooth, setSlideSmooth] = useState(false);
  const hero1 = store.data.heroes.find((hero) => hero.slot === "hero1");
  const hero2 = store.data.heroes.find((hero) => hero.slot === "hero2");
  const menuOpen = store.overlays.at(-1)?.type === "menu";
  const menuHidesAnnouncement = menuOpen && isMobile;
  const barShown = announcementVisible && !menuHidesAnnouncement;
  const { searchOpen, closeSearch } = store;

  useEffect(() => {
    if (!searchOpen) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (searchRef.current?.contains(target) || searchButtonRef.current?.contains(target)) return;
      closeSearch();
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [closeSearch, searchOpen]);

  useLayoutEffect(() => {
    const header = headerRef.current;
    const slot = slotRef.current;
    const measure = navMeasureRef.current;
    if (!header || !slot || !measure) return;

    let shownKey = "";
    const fit = () => {
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      setIsMobile((current) => (current === mobile ? current : mobile));
      const widths = new Map<Department, number>();
      for (const node of measure.querySelectorAll<HTMLElement>("[data-department]")) {
        const id = node.dataset.department;
        if (id) widths.set(id as Department, node.offsetWidth);
      }
      const gap = 16;
      let shown = mobile ? [] : [...DEPARTMENTS];
      if (!mobile) {
        while (shown.length > 0) {
          const needed = shown.reduce((total, id) => total + (widths.get(id) ?? 0), 0) + gap * (shown.length - 1);
          if (needed + 24 <= slot.clientWidth) break;
          shown = shown.slice(0, -1);
        }
      }
      const next = shown.join();
      if (next === shownKey) return;
      shownKey = next;
      store.setNavDepartments(shown);
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  const messages = store.data.settings.announcement
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const showAnnouncement = messages.length > 0 && !searchOpen;
  const message = messages[slide % Math.max(messages.length, 1)] ?? "";

  useLayoutEffect(() => {
    const node = announcementRef.current;
    if (!node || !showAnnouncement) {
      setAnnouncementHeight(0);
      return;
    }
    const measure = () => {
      const navBottom = headerRef.current?.getBoundingClientRect().bottom ?? 64;
      const top = Number.parseFloat(getComputedStyle(node).top);
      const overlap = Number.isFinite(top) ? Math.max(0, navBottom - top) : 0;
      setAnnouncementHeight(Math.max(0, node.offsetHeight - overlap));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [message, showAnnouncement]);

  useEffect(() => {
    if (messages.length === 0) return;
    setSlideSmooth(false);
    setSlideShift(100);
    let enterFrame = 0;
    const start = requestAnimationFrame(() => {
      enterFrame = requestAnimationFrame(() => {
        setSlideSmooth(true);
        setSlideShift(0);
      });
    });
    if (messages.length < 2) {
      return () => {
        cancelAnimationFrame(start);
        cancelAnimationFrame(enterFrame);
      };
    }
    const leave = window.setTimeout(() => setSlideShift(-100), 4200);
    const advance = window.setTimeout(() => setSlide((current) => (current + 1) % messages.length), 4700);
    return () => {
      cancelAnimationFrame(start);
      cancelAnimationFrame(enterFrame);
      window.clearTimeout(leave);
      window.clearTimeout(advance);
    };
  }, [slide, messages.length]);

  useLayoutEffect(() => {
    const header = headerRef.current;
    const bar = announcementRef.current;
    let frame = 0;
    let running = true;
    const place = () => {
      const navBottom = header?.getBoundingClientRect().bottom ?? 64;
      const announced = showAnnouncement && barShown && bar ? bar.getBoundingClientRect().bottom : navBottom;
      document.documentElement.style.setProperty("--nn-sheet-top", `${Math.max(navBottom, announced)}px`);
    };
    const tick = () => {
      if (!running) return;
      place();
      frame = requestAnimationFrame(tick);
    };
    place();
    tick();
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
      place();
    };
    bar?.addEventListener("transitionend", stop);
    const timeout = window.setTimeout(stop, 360);
    return () => {
      stop();
      bar?.removeEventListener("transitionend", stop);
      window.clearTimeout(timeout);
    };
  }, [announcementHeight, barShown, showAnnouncement]);

  useEffect(() => {
    const positions = new WeakMap<EventTarget, number>();
    positions.set(window, window.scrollY);
    const onScroll = (event: Event) => {
      const target = event.target;
      let y = 0;
      let node: EventTarget;
      if (target instanceof Document) {
        y = window.scrollY;
        node = window;
      } else if (target instanceof HTMLElement) {
        y = target.scrollTop;
        node = target;
      } else {
        return;
      }
      const previous = positions.has(node) ? (positions.get(node) ?? y) : node === window ? window.scrollY : 0;
      positions.set(node, y);
      const delta = y - previous;
      if (Math.abs(delta) < 6) return;
      if (y <= 8) setAnnouncementVisible(true);
      else setAnnouncementVisible(delta < 0);
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, true);
  }, []);

  useEffect(() => {
    if (handled.current) return;
    const params = new URLSearchParams(window.location.search);
    const intent = params.get("payment_intent");
    if (params.get("redirect_status") !== "succeeded" || !intent) return;
    handled.current = true;
    void fetch("/api/checkout/stripe/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId: intent }),
    }).then(async (response) => {
      const receipt = await response.json();
      if (response.ok && receipt.status === "paid") {
        store.clearBag();
        store.rememberOrder({ orderId: receipt.orderId, orderNumber: receipt.orderNumber, email: receipt.email });
        store.showSuccess(receipt);
        window.history.replaceState({}, "", "/");
      }
    });
  }, [store]);

  return (
    <div className="min-h-screen bg-white">
      <h1 className="sr-only">{store.data.settings.companyName}</h1>
      <header ref={headerRef} className="fixed inset-x-0 top-0 z-50 grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center bg-white px-4">
        <button ref={logoRef} type="button" aria-label={store.data.settings.companyName} onClick={store.goHome} className="relative z-10">
          <MediaImage src={store.data.settings.logo} alt="" className="h-6 w-auto" />
        </button>
        <div ref={slotRef} className="flex min-w-0 items-center justify-center">
          <div ref={navMeasureRef} className="pointer-events-none absolute -left-[9999px] flex gap-4" aria-hidden="true">
            {DEPARTMENTS.map((department) => (
              <span key={department} data-department={department} className="border-b-2 border-transparent px-1 text-sm">
                {departmentLabel(department)}
              </span>
            ))}
          </div>
          <nav className={`items-center justify-center gap-4 ${store.navDepartments.length > 0 ? "hidden md:flex" : "hidden"}`}>
            {store.navDepartments.map((department) => (
              <button
                key={department}
                type="button"
                aria-current={store.department === department ? "true" : undefined}
                onClick={() => {
                  setAnnouncementVisible(false);
                  store.chooseDepartment(department);
                }}
                className={`border-b-2 px-1 text-sm ${store.department === department ? "border-ink" : "border-transparent"}`}
              >
                {departmentLabel(department)}
              </button>
            ))}
          </nav>
        </div>
        <div ref={actionsRef} className="relative z-10 flex items-center gap-2">
          <button ref={searchButtonRef} type="button" aria-label="Search" onClick={store.toggleSearch} className="p-1">
            <IconSearch />
          </button>
          <button
            type="button"
            aria-expanded={store.accountOpen}
            aria-label={store.member ? "Account" : "Sign in"}
            onClick={store.toggleAccount}
            className="relative p-1"
          >
            <IconUser />
            {store.member ? (
              <span className="absolute right-0.5 top-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
            ) : null}
          </button>
          <button type="button" aria-label={`Bag, ${store.bagCount} items`} onClick={store.toggleBag} className="relative p-1">
            <IconBag />
            {store.bagCount > 0 ? <span className="absolute -right-0.5 -top-1 text-[11px] font-semibold">{store.bagCount}</span> : null}
          </button>
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Menu"}
            onClick={() => (menuOpen ? store.back() : store.push({ type: "menu" }))}
            className="p-1"
          >
            {menuOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </header>
      <div className="pt-16">
      {store.searchOpen ? (
        <div ref={searchRef} className="sticky top-16 z-40 border-b border-line bg-white px-4 py-3">
          <label className="flex items-center gap-2 rounded-full bg-canvas px-4 py-2.5">
            <IconSearch className="h-5 w-5" />
            <input
              autoFocus
              value={store.searchQuery}
              onChange={(event) => store.setSearchQuery(event.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
        </div>
      ) : showAnnouncement ? (
        <>
          <div aria-hidden="true" style={{ height: announcementHeight }} />
          <div
            ref={announcementRef}
            className={`fixed inset-x-0 top-16 overflow-hidden border-b border-line bg-[#f5f5f5] px-6 py-3 text-center font-[Helvetica_Neue,Helvetica,Arial,sans-serif] text-[13px] font-bold leading-5 text-ink transition-transform duration-300 ease-out ${menuHidesAnnouncement ? "z-[35]" : "z-[45]"} ${barShown ? "translate-y-0" : "-translate-y-full pointer-events-none"}`}
          >
            <p
              className="mx-auto min-h-10   w-full max-w-3xl text-center"
              style={{
                transform: `translateX(${slideShift}%)`,
                transition: slideSmooth ? "transform 500ms ease-out" : "none",
              }}
            >
              {message}
            </p>
          </div>
        </>
      ) : null}
      {hero1 ? (
        <HeroPanel image={hero1.image} eyebrow={hero1.eyebrow} headline={hero1.headline} buttonLabel={hero1.buttonLabel} onShop={store.scrollToCatalog} />
      ) : null}
      {store.data.highlights.length > 0 ? (
        <div className="overflow-hidden py-3">
          <div className="marquee-track flex w-max gap-3">
            {[...store.data.highlights, ...store.data.highlights].map((highlight, index) => (
              <button key={`${highlight.id}-${index}`} type="button" onClick={store.scrollToCatalog} className="h-64 w-48 shrink-0 overflow-hidden md:h-80 md:w-60">
                <MediaImage src={highlight.image} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {hero2 ? (
        <HeroPanel image={hero2.image} eyebrow={hero2.eyebrow} headline={hero2.headline} buttonLabel={hero2.buttonLabel} onShop={store.scrollToCatalog} />
      ) : null}
      <Catalog />
      <Newsletter />
      <Footer settings={store.data.settings} flush />
      </div>
      <Overlays />
      <MemberDialog />
    </div>
  );
}
