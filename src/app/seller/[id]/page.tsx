import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import SellerProductForm from "@/components/SellerProductForm";
import { createClient } from "@/lib/supabase/server";
import type { Category, ProductFull } from "@/lib/types";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-muted">Loading product...</p>}>
      <EditProductContent params={params} />
    </Suspense>
  );
}

async function EditProductContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/seller/${id}`);

  const [{ data: profile }, { data: cats }, { data: prod }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("categories").select("*").not("parent_id", "is", null).order("name"),
    supabase
      .from("products")
      .select("*, option_groups(*, option_values(*)), product_addons(*), product_images(*), categories(name, slug)")
      .eq("id", id)
      .eq("seller_id", user.id)
      .maybeSingle(),
  ]);

  if (profile?.role !== "seller") redirect("/seller");
  if (!prod) notFound();

  return (
    <SellerProductForm
      sellerId={user.id}
      categories={(cats ?? []) as Category[]}
      product={prod as unknown as ProductFull}
    />
  );
}
