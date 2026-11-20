"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

export function BackLink({ onClick, label = "Back" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="text-sm text-ink underline underline-offset-4">
      {label}
    </button>
  );
}

export function Sheet({
  children,
  variant,
  onBack,
  active,
  label,
  coverNav = false,
  contained = false,
  zIndex = 30,
}: {
  children: React.ReactNode;
  variant: "full" | "third" | "side";
  onBack: () => void;
  active: boolean;
  label: string;
  coverNav?: boolean;
  contained?: boolean;
  zIndex?: number;
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!active) return;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onBackRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const fromSide = variant === "side";
  return (
    <div
      className={coverNav ? "fixed inset-0" : "fixed inset-x-0 bottom-0"}
      style={{ zIndex, top: coverNav ? 0 : "var(--nn-sheet-top, 4rem)" }}
    >
      <motion.button
        type="button"
        aria-label="Back"
        className="absolute inset-0 bg-black/40"
        onClick={active ? onBack : undefined}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={
          variant === "third"
            ? "absolute inset-x-0 bottom-0 max-h-full min-h-[34vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl outline-none"
            : variant === "side"
              ? "absolute inset-y-0 right-0 w-full overflow-y-auto bg-white outline-none md:w-[440px] md:shadow-2xl"
              : `absolute inset-0 bg-white outline-none ${contained ? "overflow-hidden" : "overflow-y-auto"}`
        }
        initial={reduce ? { opacity: 0 } : fromSide ? { x: "100%" } : { y: "100%" }}
        animate={reduce ? { opacity: 1 } : fromSide ? { x: 0 } : { y: 0 }}
        exit={reduce ? { opacity: 0 } : fromSide ? { x: "100%" } : { y: "100%" }}
        transition={reduce ? { duration: 0.01 } : { type: "spring", stiffness: 380, damping: 38 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
