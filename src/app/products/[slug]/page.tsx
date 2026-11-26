import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import ProductView from "@/components/ProductView";
import { createClient } from "@/lib/supabase/server";
import type { ProductFull } from "@/lib/types";

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<p className="text-muted">Loading product...</p>}>
      <ProductContent params={params} />
    </Suspense>
  );
}

async function ProductContent({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, option_groups(*, option_values(*)), product_addons(*), product_images(*), categories(name, slug)")
    .eq("slug", slug)
    .maybeSingle();
  const product = data as unknown as ProductFull | null;
  if (!product || product.status !== "active" || product.admin_hidden) notFound();

  const { data: seller } = await supabase
    .from("profiles")
    .select("shop_name, full_name")
    .eq("id", product.seller_id)
    .maybeSingle();

  return <ProductView product={product} sellerName={seller?.shop_name || seller?.full_name || "Demo Seller"} />;
}
