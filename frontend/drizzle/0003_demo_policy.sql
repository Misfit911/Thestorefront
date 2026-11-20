UPDATE "products"
SET "delivery_returns" = 'This demonstration does not promise a delivery day or a pickup time. The fee, or free delivery, is the amount shown at checkout. Pickup shows no delivery fee. An unworn item may be brought back to the store within 30 days with the order number. The shop decides whether to accept the return.'
WHERE "delivery_returns" ILIKE '%2 to 5 days%'
	OR "delivery_returns" ILIKE '%same day%'
	OR "delivery_returns" ILIKE '%confirmed by the shop after payment%';
