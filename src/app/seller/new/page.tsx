import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import SellerProductForm from "@/components/SellerProductForm";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

export default function NewProductPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading product form...</p>}>
      <NewProductContent />
    </Suspense>
  );
}

async function NewProductContent() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/seller/new");

  const [{ data: profile }, { data: cats }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("categories").select("*").not("parent_id", "is", null).order("name"),
  ]);

  if (profile?.role !== "seller") redirect("/seller");

  return <SellerProductForm sellerId={user.id} categories={(cats ?? []) as Category[]} />;
}
