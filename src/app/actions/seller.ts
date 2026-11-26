"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SellerOptionValueInput = {
  label: string;
  priceDelta: number;
  swatchHex: string;
  isDefault: boolean;
};

export type SellerOptionGroupInput = {
  name: string;
  kind: "swatch" | "choice";
  values: SellerOptionValueInput[];
};

export type SellerAddonInput = {
  name: string;
  price: number;
};

export type SellerImageInput = {
  url: string;
  alt: string;
  colourLabel: string;
};

export type SaveProductInput = {
  productId?: string;
  title: string;
  slug: string;
  categoryId: string;
  description: string;
  basePrice: number;
  compareAtPrice: number | null;
  status: "active" | "hidden";
  groups: SellerOptionGroupInput[];
  addons: SellerAddonInput[];
  images: SellerImageInput[];
};

type SaveResult = { ok: true; id: string; slug: string } | { ok: false; error: string };

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export async function saveProduct(input: SaveProductInput): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please log in as a seller first." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "seller") return { ok: false, error: "Only seller accounts can manage products." };
  if (!profile.is_active) return { ok: false, error: "Your seller account is currently paused by an admin." };

  const title = input.title.trim();
  const slug = slugify(input.slug || title);
  const basePrice = Number(input.basePrice);
  const compareAtPrice =
    input.compareAtPrice !== null && Number(input.compareAtPrice) > 0 ? Number(input.compareAtPrice) : null;

  if (!title) return { ok: false, error: "Product title is required." };
  if (!slug) return { ok: false, error: "A valid URL slug is required." };
  if (Number.isNaN(basePrice) || basePrice < 0) return { ok: false, error: "Base price must be 0 or greater." };

  const cleanGroups = input.groups
    .map((g) => ({
      name: g.name.trim(),
      kind: g.kind === "swatch" ? ("swatch" as const) : ("choice" as const),
      values: g.values
        .map((v) => ({
          label: v.label.trim(),
          priceDelta: Number(v.priceDelta) || 0,
          swatchHex: g.kind === "swatch" ? v.swatchHex || "#E8DEC6" : null,
          isDefault: Boolean(v.isDefault),
        }))
        .filter((v) => v.label.length > 0),
    }))
    .filter((g) => g.name.length > 0 && g.values.length > 0);

  if (cleanGroups.length === 0) {
    return { ok: false, error: "Add at least one option group with one value." };
  }

  let productId = input.productId;

  if (productId) {
    // Only update columns granted to authenticated in schema.sql
    const { data: updated, error } = await supabase
      .from("products")
      .update({
        category_id: input.categoryId || null,
        title,
        slug,
        description: input.description.trim() || null,
        base_price: basePrice,
        compare_at_price: compareAtPrice,
        status: input.status === "hidden" ? "hidden" : "active",
      })
      .eq("id", productId)
      .eq("seller_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!updated) return { ok: false, error: "Product not found or you do not own it." };

    await Promise.all([
      supabase.from("option_groups").delete().eq("product_id", productId),
      supabase.from("product_addons").delete().eq("product_id", productId),
      supabase.from("product_images").delete().eq("product_id", productId),
    ]);
  } else {
    const { data: created, error } = await supabase
      .from("products")
      .insert({
        seller_id: user.id,
        category_id: input.categoryId || null,
        title,
        slug,
        description: input.description.trim() || null,
        base_price: basePrice,
        compare_at_price: compareAtPrice,
        status: input.status === "hidden" ? "hidden" : "active",
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };
    productId = created.id;
  }

  const swatchValueIdByLabel = new Map<string, string>();

  for (let gi = 0; gi < cleanGroups.length; gi++) {
    const grp = cleanGroups[gi];
    const { data: grpRow, error: grpErr } = await supabase
      .from("option_groups")
      .insert({
        product_id: productId,
        name: grp.name,
        kind: grp.kind,
        sort_order: gi,
      })
      .select("id")
      .single();

    if (grpErr) return { ok: false, error: grpErr.message };

    const hasDefault = grp.values.some((v) => v.isDefault);
    const valueRows = grp.values.map((v, vi) => ({
      group_id: grpRow.id,
      label: v.label,
      price_delta: v.priceDelta,
      swatch_hex: v.swatchHex,
      sort_order: vi,
      is_default: hasDefault ? v.isDefault : vi === 0,
    }));

    const { data: insertedVals, error: valErr } = await supabase
      .from("option_values")
      .insert(valueRows)
      .select("id, label");

    if (valErr) return { ok: false, error: valErr.message };
    if (grp.kind === "swatch") {
      for (const iv of insertedVals ?? []) {
        swatchValueIdByLabel.set(iv.label.toLowerCase(), iv.id);
      }
    }
  }

  const cleanAddons = input.addons
    .map((a, idx) => ({
      product_id: productId,
      name: a.name.trim(),
      price: Math.max(0, Number(a.price) || 0),
      sort_order: idx,
    }))
    .filter((a) => a.name.length > 0);

  if (cleanAddons.length > 0) {
    const { error: addonErr } = await supabase.from("product_addons").insert(cleanAddons);
    if (addonErr) return { ok: false, error: addonErr.message };
  }

  const cleanImages = input.images
    .map((img, idx) => ({
      product_id: productId,
      option_value_id: img.colourLabel
        ? (swatchValueIdByLabel.get(img.colourLabel.trim().toLowerCase()) ?? null)
        : null,
      url: img.url.trim(),
      alt: img.alt.trim() || title,
      sort_order: idx,
    }))
    .filter((img) => img.url.length > 0);

  if (cleanImages.length > 0) {
    const { error: imgErr } = await supabase.from("product_images").insert(cleanImages);
    if (imgErr) return { ok: false, error: imgErr.message };
  }

  revalidatePath("/");
  revalidatePath(`/products/${slug}`);
  revalidatePath("/seller");
  return { ok: true, id: productId!, slug };
}

export async function updateOrderItemStatus(itemId: string, formData: FormData): Promise<void> {
  const status = String(formData.get("status") ?? "");
  if (!["new", "confirmed", "shipped", "delivered"].includes(status)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/seller");

  await supabase
    .from("order_items")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("seller_id", user.id);

  revalidatePath("/seller");
  revalidatePath("/orders");
}
