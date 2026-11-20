import { formatKes } from "@/lib/money";
import { isMembersOnly, unitPriceCents, type PricedProduct } from "@/lib/pricing";

export function ProductPrice({
  product,
  member,
  quantity = 1,
  tone = "plain",
}: {
  product: PricedProduct;
  member: boolean;
  quantity?: number;
  tone?: "card" | "sheet" | "plain";
}) {
  const guestDeal = isMembersOnly(product) && !member;
  const pay = unitPriceCents(product, member) * quantity;
  const mainClass =
    tone === "card" ? "mt-2 text-[15px] font-medium" : tone === "sheet" ? "mt-2 text-lg" : "font-medium";
  const sale =
    !product.membersOnly && product.compareAtPriceCents != null && product.compareAtPriceCents > product.priceCents;
  return (
    <div>
      <p className={mainClass}>{formatKes(pay)}</p>
      {guestDeal ? (
        <p className="text-sm">
          <span>{formatKes(product.priceCents * quantity)}</span>{" "}
          <span className="font-medium text-member">Members only</span>
        </p>
      ) : sale && product.compareAtPriceCents ? (
        <p className="text-sm text-muted line-through">{formatKes(product.compareAtPriceCents * quantity)}</p>
      ) : null}
    </div>
  );
}
