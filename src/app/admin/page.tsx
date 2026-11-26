import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { toggleProductHidden, toggleSellerActive } from "@/app/actions/admin";
import { gbp } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading Admin Panel...</p>}>
      <AdminContent />
    </Suspense>
  );
}

async function AdminContent() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") {
    return (
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-xs ring-1 ring-fog">
        <h1 className="font-display text-2xl font-bold">Admin access required</h1>
        <p className="mt-2 text-sm text-muted">
          You are signed in as <strong>{profile?.role ?? "buyer"}</strong>. Log in with an admin account to moderate
          sellers and listings.
        </p>
        <Link href="/" className="mt-5 inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-glow px-5 text-sm font-bold text-obsidian">
          Back to home
        </Link>
      </div>
    );
  }

  const [{ data: sellers }, { data: products }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, shop_name, is_active, created_at").eq("role", "seller").order("created_at"),
    supabase.from("products").select("id, title, slug, base_price, status, admin_hidden, seller_id").order("created_at", { ascending: false }),
  ]);

  const sellerNameById = new Map((sellers ?? []).map((s) => [s.id, s.shop_name || s.full_name || "Seller"]));

  return (
    <div className="animate-fade-up space-y-8">
      <section className="rounded-3xl bg-ink p-6 text-mist shadow-sm sm:p-8">
        <span className="inline-flex rounded-full bg-glow px-3 py-1 text-xs font-bold uppercase tracking-wide text-obsidian">
          Admin Console
        </span>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">Marketplace moderation</h1>
        <p className="mt-1 text-sm text-mist/75">Approve or pause seller shops and show or hide listings.</p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold">Sellers ({sellers?.length ?? 0})</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {(sellers ?? []).map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/95 p-4 shadow-xs ring-1 ring-fog">
              <div>
                <div className="font-display font-bold">{s.shop_name || s.full_name || "Seller"}</div>
                <div className="text-xs text-muted">{s.full_name}</div>
              </div>
              <form action={toggleSellerActive.bind(null, s.id, !s.is_active)}>
                <button
                  className={`min-h-10 cursor-pointer rounded-xl px-4 text-xs font-bold transition ${
                    s.is_active
                      ? "bg-ink text-mist hover:bg-ink/90"
                      : "bg-glow text-obsidian hover:bg-glow-deep"
                  }`}
                >
                  {s.is_active ? "Active · Pause" : "Paused · Approve"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold">Listings ({products?.length ?? 0})</h2>
        <ul className="grid gap-3">
          {(products ?? []).map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/95 p-4 shadow-xs ring-1 ring-fog">
              <div>
                <div className="font-display font-bold">{p.title}</div>
                <div className="text-xs text-muted">
                  Seller: {sellerNameById.get(p.seller_id) ?? "Seller"} · {gbp(Number(p.base_price))} · Status: {p.status}
                </div>
              </div>
              <form action={toggleProductHidden.bind(null, p.id, !p.admin_hidden)}>
                <button
                  className={`min-h-10 cursor-pointer rounded-xl px-4 text-xs font-bold transition ${
                    p.admin_hidden
                      ? "bg-glow text-obsidian hover:bg-glow-deep"
                      : "bg-ink text-mist hover:bg-ink/90"
                  }`}
                >
                  {p.admin_hidden ? "Hidden · Restore" : "Visible · Hide"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
