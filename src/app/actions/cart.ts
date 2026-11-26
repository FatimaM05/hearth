"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type AddResult = { ok: true } | { ok: false; error: string; needsLogin?: boolean };

export async function addToCart(input: {
  productId: string;
  valueIds: string[];
  addonIds: string[];
  quantity: number;
}): Promise<AddResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Log in to add items to your basket.", needsLogin: true };

  const qty = Math.min(Math.max(Math.floor(Number(input.quantity)) || 1, 1), 10);

  // Validate the selection against the database: exactly one value per option group.
  const { data: g } = await supabase
    .from("option_groups")
    .select("id, option_values(id)")
    .eq("product_id", input.productId);
  const groups = (g ?? []) as unknown as { id: string; option_values: { id: string }[] }[];
  if (!groups.length) return { ok: false, error: "This product is not available." };
  if (input.valueIds.length !== groups.length) return { ok: false, error: "Choose an option in every group." };
  for (const grp of groups) {
    const ids = grp.option_values.map((v) => v.id);
    if (input.valueIds.filter((id) => ids.includes(id)).length !== 1)
      return { ok: false, error: "Choose an option in every group." };
  }

  const { data: a } = await supabase.from("product_addons").select("id").eq("product_id", input.productId);
  const validAddons = ((a ?? []) as { id: string }[]).map((x) => x.id);
  if (input.addonIds.some((id) => !validAddons.includes(id))) return { ok: false, error: "Invalid add-on." };

  // One line per unique combination of options + add-ons.
  const comboKey = `${input.productId}|${[...input.valueIds].sort().join(",")}|${[...input.addonIds].sort().join(",")}`;

  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", user.id)
    .eq("combo_key", comboKey)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: Math.min(existing.quantity + qty, 10) })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("cart_items").insert({
      user_id: user.id,
      product_id: input.productId,
      quantity: qty,
      option_value_ids: input.valueIds,
      addon_ids: input.addonIds,
      combo_key: comboKey,
    });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateQty(itemId: string, qty: number): Promise<void> {
  const supabase = await createClient();
  if (qty < 1) await supabase.from("cart_items").delete().eq("id", itemId);
  else await supabase.from("cart_items").update({ quantity: Math.min(qty, 10) }).eq("id", itemId);
  revalidatePath("/", "layout");
}

export async function removeItem(itemId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("cart_items").delete().eq("id", itemId);
  revalidatePath("/", "layout");
}
