import type { OptionGroup } from "./types";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

export const sum = (xs: number[]) => xs.reduce((a, b) => a + Number(b), 0);

/** The default choice per group (is_default, else the first value). */
export function defaultSelection(groups: OptionGroup[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const g of groups) {
    const vals = [...g.option_values].sort((a, b) => a.sort_order - b.sort_order);
    const pick = vals.find((v) => v.is_default) ?? vals[0];
    if (pick) out[g.id] = pick.id;
  }
  return out;
}

/** Base price plus the price_delta of each selected option (no add-ons). */
export function optionSubtotal(base: number, groups: OptionGroup[], sel: Record<string, string>) {
  const deltas = groups.map((g) => Number(g.option_values.find((v) => v.id === sel[g.id])?.price_delta ?? 0));
  return r2(Number(base) + sum(deltas));
}

export function unitPrice(subtotal: number, addonPrices: number[]) {
  return r2(subtotal + sum(addonPrices));
}

/** Crossed-out price: scales with the options so the discount stays the same. */
export function comparePrice(subtotal: number, addonTotal: number, base: number, compareAt: number | null) {
  if (!compareAt || compareAt <= base) return null;
  return r2(subtotal * (compareAt / base) + addonTotal);
}

export function discountPct(base: number, compareAt: number | null) {
  if (!compareAt || compareAt <= base) return 0;
  return Math.round((1 - base / compareAt) * 100);
}
