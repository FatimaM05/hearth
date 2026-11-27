import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import OrderStatusNotice from "@/components/OrderStatusNotice";
import { gbp } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

export default function OrdersPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading your orders...</p>}>
      <OrdersContent />
    </Suspense>
  );
}

type OrderRow = {
  id: string;
  total: number;
  shipping_name: string;
  shipping_address: string;
  created_at: string;
  order_items: {
    id: string;
    title: string;
    selections: { group: string; label: string }[];
    addons: { name: string }[];
    swatch_hex: string | null;
    unit_price: number;
    quantity: number;
    status: "new" | "confirmed" | "shipped" | "delivered";
  }[];
};

async function OrdersContent() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/orders");

  const { data } = await supabase
    .from("orders")
    .select(
      "id, total, shipping_name, shipping_address, created_at, order_items(id, title, selections, addons, swatch_hex, unit_price, quantity, status)"
    )
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  const orders = (data ?? []) as unknown as OrderRow[];
  const allItems = orders.flatMap((o) =>
    o.order_items.map((item) => ({ id: item.id, title: item.title, status: item.status }))
  );

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Your orders</h1>
        <Link
          href="/"
          className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-fog bg-white px-4 text-sm font-semibold hover:border-ink"
        >
          Browse beds
        </Link>
      </div>

      <OrderStatusNotice items={allItems} />

      {orders.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-xs ring-1 ring-fog">
          <p className="font-semibold">You have not placed any orders yet.</p>
          <Link
            href="/"
            className="mt-4 inline-flex min-h-12 cursor-pointer items-center rounded-xl bg-glow px-6 font-bold text-obsidian"
          >
            Explore divan beds
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id} className="rounded-2xl bg-white/95 p-5 shadow-xs ring-1 ring-fog">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fog/70 pb-3 text-sm">
                <div>
                  <span className="font-display font-bold">Order #{order.id.slice(0, 8)}</span>
                  <span className="ml-2 text-xs text-muted">
                    {new Date(order.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <span className="text-lg font-bold">{gbp(Number(order.total))}</span>
              </div>

              <ul className="divide-y divide-fog/50">
                {order.order_items.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3.5">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        {item.swatch_hex && (
                          <span
                            className="size-4 rounded-full border border-black/15"
                            style={{ background: item.swatch_hex }}
                          />
                        )}
                        <span className="font-display font-semibold">{item.title}</span>
                        <span className="text-xs text-muted">× {item.quantity}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        {item.selections?.map((s) => (
                          <span key={s.group} className="rounded-lg bg-mist px-2 py-0.5">
                            <span className="text-muted">{s.group}:</span> <strong>{s.label}</strong>
                          </span>
                        ))}
                        {item.addons?.map((a) => (
                          <span key={a.name} className="rounded-lg bg-glow/30 px-2 py-0.5 font-semibold">
                            + {a.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                          item.status === "delivered"
                            ? "bg-ink text-mist"
                            : item.status === "shipped" || item.status === "confirmed"
                              ? "bg-glow text-obsidian"
                              : "bg-mist text-ink ring-1 ring-fog"
                        }`}
                      >
                        {item.status}
                      </span>
                      <span className="font-semibold">{gbp(Number(item.unit_price) * item.quantity)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
