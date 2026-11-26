import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import BedArt from "@/components/BedArt";
import { removeItem, updateQty } from "@/app/actions/cart";
import { loadCart } from "@/lib/cart";
import { gbp } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

export default function CartPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading your basket...</p>}>
      <CartContent />
    </Suspense>
  );
}

async function CartContent() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/cart");

  const lines = await loadCart(supabase, user.id);
  const total = lines.reduce((n, l) => n + l.unit * l.quantity, 0);
  const step = "size-11 cursor-pointer rounded-lg border border-fog bg-white text-lg";

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center ring-1 ring-fog">
        <h1 className="font-display text-2xl font-bold">Your basket is empty</h1>
        <Link href="/" className="mt-4 inline-flex min-h-12 cursor-pointer items-center rounded-xl bg-glow px-6 font-semibold">
          Browse beds
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-up grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Your basket</h1>
        <ul className="mt-4 grid gap-4">
          {lines.map((l) => (
            <li key={l.id} className="flex flex-col gap-4 rounded-2xl bg-white/95 p-4 shadow-xs ring-1 ring-fog sm:flex-row">
              <div className="aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl sm:w-36">
                {l.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <BedArt color={l.hex ?? undefined} className="h-full w-full" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/products/${l.slug}`} className="cursor-pointer font-display text-lg font-semibold leading-snug underline-offset-2 hover:underline">
                  {l.title}
                </Link>
                <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
                  {l.selections.map((s) => (
                    <div key={s.group} className="contents">
                      <dt className="text-muted">{s.group}</dt>
                      <dd className="min-w-0 break-words">{s.label}</dd>
                    </div>
                  ))}
                  {l.addons.map((a) => (
                    <div key={a.name} className="contents">
                      <dt className="text-muted">Add-on</dt>
                      <dd className="min-w-0 break-words">{a.name}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1">
                    <form action={updateQty.bind(null, l.id, l.quantity - 1)}>
                      <button aria-label="Decrease quantity" className={step}>
                        −
                      </button>
                    </form>
                    <span className="w-8 text-center font-semibold">{l.quantity}</span>
                    <form action={updateQty.bind(null, l.id, l.quantity + 1)}>
                      <button aria-label="Increase quantity" className={step}>
                        +
                      </button>
                    </form>
                  </div>
                  <form action={removeItem.bind(null, l.id)}>
                    <button className="min-h-11 cursor-pointer px-2 text-sm underline">Remove</button>
                  </form>
                  <span className="ml-auto text-lg font-bold">{gbp(l.unit * l.quantity)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="h-fit rounded-2xl bg-white p-5 ring-1 ring-fog lg:sticky lg:top-24">
        <h2 className="font-display text-xl font-bold">Summary</h2>
        <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted">Items</dt>
          <dd className="text-right">{lines.reduce((n, l) => n + l.quantity, 0)}</dd>
          <dt className="text-muted">Delivery</dt>
          <dd className="text-right">Free</dd>
          <dt className="pt-2 font-semibold">Total</dt>
          <dd className="pt-2 text-right text-xl font-bold">{gbp(total)}</dd>
        </dl>
        <Link
          href="/checkout"
          className="mt-4 flex min-h-12 cursor-pointer items-center justify-center rounded-xl bg-glow font-semibold text-ink hover:bg-glow-deep"
        >
          Go to checkout
        </Link>
      </aside>
    </div>
  );
}
