import type { SupabaseClient } from "@supabase/supabase-js";
import { unitPrice } from "./pricing";

export type CartLine = {
  id: string;
  quantity: number;
  productId: string;
  sellerId: string;
  slug: string;
  title: string;
  unit: number;
  selections: { group: string; label: string; delta: number }[];
  addons: { name: string; price: number }[];
  hex: string | null;
  imageUrl: string | null;
};

type RawItem = {
  id: string;
  quantity: number;
  option_value_ids: string[];
  addon_ids: string[];
  product: {
    id: string;
    title: string;
    slug: string;
    seller_id: string;
    base_price: number;
    product_images: { url: string; sort_order: number }[];
  } | null;
};
type RawValue = {
  id: string;
  label: string;
  price_delta: number;
  swatch_hex: string | null;
  option_groups: { name: string; kind: string; sort_order: number };
};
type RawAddon = { id: string; name: string; price: number };

/** Loads the cart and recomputes every price from the database (never trusts the browser). */
export async function loadCart(supabase: SupabaseClient, userId: string): Promise<CartLine[]> {
  const { data } = await supabase
    .from("cart_items")
    .select(
      "id, quantity, option_value_ids, addon_ids, product:products(id, title, slug, seller_id, base_price, product_images(url, sort_order))"
    )
    .eq("user_id", userId)
    .order("created_at");
  const items = ((data ?? []) as unknown as RawItem[]).filter((i) => i.product);

  const valueIds = [...new Set(items.flatMap((i) => i.option_value_ids))];
  const addonIds = [...new Set(items.flatMap((i) => i.addon_ids))];

  let values: RawValue[] = [];
  if (valueIds.length) {
    const res = await supabase
      .from("option_values")
      .select("id, label, price_delta, swatch_hex, option_groups(name, kind, sort_order)")
      .in("id", valueIds);
    values = (res.data ?? []) as unknown as RawValue[];
  }
  let addons: RawAddon[] = [];
  if (addonIds.length) {
    const res = await supabase.from("product_addons").select("id, name, price").in("id", addonIds);
    addons = (res.data ?? []) as unknown as RawAddon[];
  }
  const valueById = new Map(values.map((v) => [v.id, v]));
  const addonById = new Map(addons.map((a) => [a.id, a]));

  return items.map((i) => {
    const p = i.product!;
    const chosen = i.option_value_ids
      .map((id) => valueById.get(id))
      .filter((v): v is RawValue => Boolean(v))
      .sort((a, b) => a.option_groups.sort_order - b.option_groups.sort_order);
    const chosenAddons = i.addon_ids.map((id) => addonById.get(id)).filter((a): a is RawAddon => Boolean(a));
    const subtotal = Number(p.base_price) + chosen.reduce((n, v) => n + Number(v.price_delta), 0);
    const colour = chosen.find((v) => v.option_groups.kind === "swatch");
    const baseName = p.title.split(" – ")[0];
    const image = [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
    return {
      id: i.id,
      quantity: i.quantity,
      productId: p.id,
      sellerId: p.seller_id,
      slug: p.slug,
      title: colour ? `${baseName} – ${colour.label}` : p.title,
      unit: unitPrice(subtotal, chosenAddons.map((a) => Number(a.price))),
      selections: chosen.map((v) => ({
        group: v.option_groups.name,
        label: v.label,
        delta: Number(v.price_delta),
      })),
      addons: chosenAddons.map((a) => ({ name: a.name, price: Number(a.price) })),
      hex: colour?.swatch_hex ?? null,
      imageUrl: image?.url ?? null,
    };
  });
}
