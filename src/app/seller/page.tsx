import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { updateOrderItemStatus } from "@/app/actions/seller";
import { gbp } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

export default function SellerPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading Seller Hub...</p>}>
      <SellerDashboard />
    </Suspense>
  );
}

type OrderRow = {
  id: string;
  order_id: string;
  title: string;
  selections: { group: string; label: string }[];
  addons: { name: string }[];
  swatch_hex: string | null;
  unit_price: number;
  quantity: number;
  status: "new" | "confirmed" | "shipped" | "delivered";
  orders: { shipping_name: string; shipping_address: string; shipping_phone: string | null; created_at: string } | null;
};

async function SellerDashboard() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/seller");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, shop_name, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "seller") {
    return (
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-xs ring-1 ring-fog">
        <h1 className="font-display text-2xl font-bold">Seller Hub is for Seller accounts</h1>
        <p className="mt-2 text-sm text-muted">
          You are currently signed in as a <strong>{profile?.role ?? "buyer"}</strong>. Log in with{" "}
          <code>demo@hearth.com</code> or create a seller account to add products and manage orders.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-glow px-5 text-sm font-bold text-obsidian">
            Switch account
          </Link>
          <Link href="/" className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-fog px-5 text-sm font-semibold">
            Back to shop
          </Link>
        </div>
      </div>
    );
  }

  const [{ data: products }, { data: orderItems }] = await Promise.all([
    supabase
      .from("products")
      .select("id, title, slug, base_price, compare_at_price, status, admin_hidden, created_at")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("order_items")
      .select(
        "id, order_id, title, selections, addons, swatch_hex, unit_price, quantity, status, orders(shipping_name, shipping_address, shipping_phone, created_at)"
      )
      .eq("seller_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);

  const items = (orderItems ?? []) as unknown as OrderRow[];

  return (
    <div className="animate-fade-up space-y-8">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-ink p-6 text-mist shadow-sm sm:p-8">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-glow px-3 py-1 text-xs font-bold uppercase tracking-wide text-obsidian">
            Seller Hub · {profile.shop_name || profile.full_name}
          </span>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">Manage products & orders</h1>
          <p className="mt-1 text-sm text-mist/75">
            Add beds with custom swatches and pricing, edit existing listings, and update incoming order statuses.
          </p>
        </div>
        <Link
          href="/seller/new"
          className="inline-flex min-h-12 cursor-pointer items-center rounded-xl bg-glow px-5 text-sm font-bold text-obsidian shadow-xs transition hover:bg-glow-deep"
        >
          + Add new product
        </Link>
      </section>

      {!profile.is_active && (
        <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          Your seller account is currently paused by an admin; your listings are hidden from buyers until approved.
        </div>
      )}

      {/* Products list */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Your listings ({products?.length ?? 0})</h2>
        </div>

        {!products?.length ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-xs ring-1 ring-fog">
            <p className="font-semibold">No products added yet.</p>
            <Link
              href="/seller/new"
              className="mt-3 inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-glow px-5 text-sm font-bold text-obsidian"
            >
              Add your first product
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {products.map((p) => (
              <li key={p.id} className="flex flex-col justify-between gap-4 rounded-2xl bg-white/95 p-5 shadow-xs ring-1 ring-fog">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                        p.status === "active" && !p.admin_hidden
                          ? "bg-ink text-mist"
                          : "bg-mist text-muted ring-1 ring-fog"
                      }`}
                    >
                      {p.admin_hidden ? "Hidden by admin" : p.status}
                    </span>
                    <span className="text-xs text-muted">/{p.slug}</span>
                  </div>
                  <h3 className="mt-2 font-display text-lg font-bold">{p.title}</h3>
                  <p className="mt-1 flex items-baseline gap-2">
                    <span className="text-lg font-bold">{gbp(Number(p.base_price))}</span>
                    {p.compare_at_price && <s className="text-sm text-muted">{gbp(Number(p.compare_at_price))}</s>}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/seller/${p.id}`}
                    className="inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-ink px-4 text-xs font-semibold text-mist transition hover:bg-ink/90"
                  >
                    Edit options & photos
                  </Link>
                  <Link
                    href={`/products/${p.slug}`}
                    className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-fog bg-white px-4 text-xs font-semibold text-ink transition hover:border-ink"
                  >
                    View as buyer →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Incoming Orders */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold">Incoming orders ({items.length})</h2>
        {items.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-sm text-muted shadow-xs ring-1 ring-fog">
            No orders received yet. When a buyer checks out, their bed configuration and status controls appear here.
          </div>
        ) : (
          <ul className="grid gap-4">
            {items.map((item) => (
              <li key={item.id} className="rounded-2xl bg-white/95 p-5 shadow-xs ring-1 ring-fog">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.swatch_hex && (
                        <span
                          className="size-4 rounded-full border border-black/15"
                          style={{ background: item.swatch_hex }}
                        />
                      )}
                      <h3 className="font-display text-lg font-bold">{item.title}</h3>
                      <span className="text-sm font-semibold text-muted">× {item.quantity}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {item.selections?.map((s) => (
                        <span key={s.group} className="rounded-lg bg-mist px-2.5 py-1">
                          <span className="text-muted">{s.group}:</span> <strong>{s.label}</strong>
                        </span>
                      ))}
                      {item.addons?.map((a) => (
                        <span key={a.name} className="rounded-lg bg-glow/30 px-2.5 py-1 font-semibold">
                          + {a.name}
                        </span>
                      ))}
                    </div>

                    {item.orders && (
                      <p className="text-xs text-muted">
                        Ship to: <strong className="text-obsidian">{item.orders.shipping_name}</strong> ·{" "}
                        {item.orders.shipping_address}
                        {item.orders.shipping_phone ? ` · ${item.orders.shipping_phone}` : ""}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="text-lg font-bold">{gbp(Number(item.unit_price) * item.quantity)}</span>
                    <form action={updateOrderItemStatus.bind(null, item.id)} className="flex items-center gap-2">
                      <select
                        name="status"
                        defaultValue={item.status}
                        aria-label="Order status"
                        className="h-10 cursor-pointer rounded-xl border border-fog bg-white px-3 text-xs font-semibold capitalize"
                      >
                        <option value="new">New</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                      </select>
                      <button className="min-h-10 cursor-pointer rounded-xl bg-glow px-3.5 text-xs font-bold text-obsidian transition hover:bg-glow-deep">
                        Update
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
