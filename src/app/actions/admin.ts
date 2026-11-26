"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function toggleSellerActive(uid: string, nextActive: boolean): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  await supabase.rpc("admin_set_seller_active", { uid, active: nextActive });
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function toggleProductHidden(pid: string, nextHidden: boolean): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  await supabase.rpc("admin_set_product_hidden", { pid, hidden: nextHidden });
  revalidatePath("/admin");
  revalidatePath("/");
}
