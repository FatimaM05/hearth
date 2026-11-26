import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import CheckoutForm from "@/components/CheckoutForm";
import { loadCart } from "@/lib/cart";
import { gbp } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading checkout...</p>}>
      <CheckoutContent />
    </Suspense>
  );
}

async function CheckoutContent() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/checkout");

  const lines = await loadCart(supabase, user.id);
  if (lines.length === 0) redirect("/cart");

  const total = lines.reduce((n, l) => n + l.unit * l.quantity, 0);

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <Link href="/cart" className="cursor-pointer text-sm font-medium text-muted underline hover:text-ink">
          ← Back to basket
        </Link>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">Checkout</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <CheckoutForm totalLabel={gbp(total)} />

        <aside className="h-fit rounded-2xl bg-white/95 p-5 shadow-xs ring-1 ring-fog lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-bold">Order summary</h2>
          <ul className="mt-3 divide-y divide-fog/60">
            {lines.map((l) => (
              <li key={l.id} className="py-3 text-sm">
                <div className="flex justify-between gap-2 font-semibold">
                  <span>
                    {l.title} × {l.quantity}
                  </span>
                  <span>{gbp(l.unit * l.quantity)}</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {[...l.selections.map((s) => s.label), ...l.addons.map((a) => a.name)].join(" · ")}
                </p>
              </li>
            ))}
          </ul>
          <dl className="mt-3 grid grid-cols-2 border-t border-fog pt-3 text-sm">
            <dt className="font-semibold">Total</dt>
            <dd className="text-right text-xl font-bold">{gbp(total)}</dd>
          </dl>
        </aside>
      </div>
    </div>
  );
}
