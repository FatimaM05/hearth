"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loadCart } from "@/lib/cart";
import { createClient } from "@/lib/supabase/server";

export type CheckoutState = { error?: string } | undefined;

export async function placeOrder(_: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const shippingName = String(formData.get("shipping_name") ?? "").trim();
  const shippingAddress = String(formData.get("shipping_address") ?? "").trim();
  const shippingPhone = String(formData.get("shipping_phone") ?? "").trim();

  if (!shippingName || !shippingAddress) {
    return { error: "Please enter your delivery name and address." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/checkout");

  const lines = await loadCart(supabase, user.id);
  if (lines.length === 0) return { error: "Your basket is empty." };

  const total = Math.round(lines.reduce((n, l) => n + l.unit * l.quantity, 0) * 100) / 100;

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      buyer_id: user.id,
      total,
      shipping_name: shippingName,
      shipping_address: shippingAddress,
      shipping_phone: shippingPhone || null,
    })
    .select("id")
    .single();

  if (orderErr) return { error: orderErr.message };

  const items = lines.map((l) => ({
    order_id: order.id,
    buyer_id: user.id,
    seller_id: l.sellerId,
    product_id: l.productId,
    title: l.title,
    selections: l.selections,
    addons: l.addons,
    swatch_hex: l.hex,
    unit_price: l.unit,
    quantity: l.quantity,
    status: "new",
  }));

  const { error: itemsErr } = await supabase.from("order_items").insert(items);
  if (itemsErr) return { error: itemsErr.message };

  await supabase.from("cart_items").delete().eq("user_id", user.id);

  revalidatePath("/", "layout");
  revalidatePath("/orders");
  revalidatePath("/seller");
  redirect("/orders");
}
