import type { Quote, QuoteItem, QuoteSnapshot, QuoteTotals } from "../types";

export function lineTotal(item: Pick<QuoteItem, "quantity" | "unitPrice" | "discountAmount">): number {
  return Math.round(item.quantity * item.unitPrice) - item.discountAmount;
}

/** R7 — même calcul que compute_quote() en SQL. */
export function computeQuoteTotals(
  quote: Pick<Quote, "items" | "discountAmount" | "feesAmount" | "taxRate">,
): QuoteTotals {
  const subtotal = quote.items.reduce((s, i) => s + lineTotal(i), 0);
  const totalHt = subtotal - quote.discountAmount + quote.feesAmount;
  const taxAmount = Math.round((totalHt * quote.taxRate) / 100);
  return {
    subtotal,
    discount: quote.discountAmount,
    fees: quote.feesAmount,
    totalHt,
    taxRate: quote.taxRate,
    taxAmount,
    totalTtc: totalHt + taxAmount,
  };
}

export function buildSnapshot(quote: Quote, version: number, validUntil: string): QuoteSnapshot {
  return {
    ...computeQuoteTotals(quote),
    reference: quote.reference,
    currency: quote.currency,
    version,
    validUntil,
    clientNote: quote.clientNote,
    items: [...quote.items]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => ({
        label: i.label,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discountAmount,
        total: lineTotal(i),
      })),
  };
}
