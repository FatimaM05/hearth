import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import BedArt from "@/components/BedArt";
import { createClient } from "@/lib/supabase/server";
import { comparePrice, defaultSelection, discountPct, gbp, optionSubtotal } from "@/lib/pricing";
import type { Category, ProductFull } from "@/lib/types";

type SP = { q?: string; category?: string; colour?: string; size?: string; min?: string; max?: string };

const isSize = (name: string) => name.trim().toLowerCase() === "size";

export default function Home({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-72 animate-pulse rounded-3xl bg-ink/80" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-white/70 ring-1 ring-fog" />
            ))}
          </div>
        </div>
      }
    >
      <HomeContent searchParams={searchParams} />
    </Suspense>
  );
}

async function HomeContent({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  const sp = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: prods, error: prodErr }, { data: cats }, profileRes, cartRes] = await Promise.all([
    supabase
      .from("products")
      .select("*, option_groups(*, option_values(*)), product_addons(*), product_images(*), categories(name, slug)")
      .eq("status", "active")
      .eq("admin_hidden", false)
      .order("created_at", { ascending: false }),
    supabase.from("categories").select("*").not("parent_id", "is", null).order("name"),
    user
      ? supabase.from("profiles").select("role, full_name, shop_name").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from("cart_items").select("quantity").eq("user_id", user.id)
      : Promise.resolve({ data: null }),
  ]);

  const role: "buyer" | "seller" | "admin" | null = user
    ? profileRes.data?.role === "seller"
      ? "seller"
      : profileRes.data?.role === "admin"
        ? "admin"
        : "buyer"
    : null;

  const accountLabel =
    role === "seller"
      ? profileRes.data?.shop_name || profileRes.data?.full_name || "Seller"
      : profileRes.data?.full_name || user?.email?.split("@")[0] || "Account";

  const basketCount = ((cartRes.data ?? []) as { quantity: number }[]).reduce((n, i) => n + i.quantity, 0);

  const all = (prods ?? []) as unknown as ProductFull[];
  const categories = (cats ?? []) as Category[];

  const rows = all.map((p) => {
    const groups = [...p.option_groups].sort((a, b) => a.sort_order - b.sort_order);
    const sel = defaultSelection(groups);
    const subtotal = optionSubtotal(p.base_price, groups, sel);
    const swatches = groups.find((g) => g.kind === "swatch")?.option_values ?? [];
    const defaultColour = swatches.find((v) => v.id === sel[groups.find((g) => g.kind === "swatch")?.id ?? ""]);
    const sortedImgs = [...p.product_images].sort((a, b) => a.sort_order - b.sort_order);
    const cardImg =
      sortedImgs.find((i) => defaultColour && i.option_value_id === defaultColour.id) ??
      sortedImgs.find((i) => !i.option_value_id) ??
      sortedImgs[0];
    const sizeVals = groups.filter((g) => isSize(g.name)).flatMap((g) => g.option_values.map((v) => v.label));
    return {
      p,
      price: subtotal,
      was: comparePrice(subtotal, 0, Number(p.base_price), p.compare_at_price),
      pct: discountPct(Number(p.base_price), p.compare_at_price),
      swatches: [...swatches].sort((a, b) => a.sort_order - b.sort_order),
      hex: defaultColour?.swatch_hex ?? "#E8DEC6",
      cardImg,
      colourLabels: swatches.map((v) => v.label),
      sizeLabels: sizeVals,
    };
  });

  const colours = [...new Set(rows.flatMap((r) => r.colourLabels))].sort();
  const sizes = [...new Set(rows.flatMap((r) => r.sizeLabels))];

  const q = sp.q?.trim().toLowerCase();
  const min = sp.min ? Number(sp.min) : null;
  const max = sp.max ? Number(sp.max) : null;
  const list = rows.filter(
    (r) =>
      (!q || r.p.title.toLowerCase().includes(q) || (r.p.description ?? "").toLowerCase().includes(q)) &&
      (!sp.category || r.p.categories?.slug === sp.category) &&
      (!sp.colour || r.colourLabels.includes(sp.colour)) &&
      (!sp.size || r.sizeLabels.includes(sp.size)) &&
      (min === null || r.price >= min) &&
      (max === null || r.price <= max)
  );

  const field = "h-11 w-full rounded-xl border border-fog bg-white px-3 text-sm transition focus:border-ink";
  const selectField = `${field} cursor-pointer`;
  const filtered = Boolean(q || sp.category || sp.colour || sp.size || sp.min || sp.max);

  return (
    <div className="animate-fade-up space-y-8">
      {/* Role-aware editorial hero */}
      <section className="relative overflow-hidden rounded-3xl bg-ink p-6 text-mist shadow-sm sm:p-8 lg:p-10">
        <div
          aria-hidden="true"
          className="animate-float-slow pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-glow/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="animate-float-reverse pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-white/5 blur-3xl"
        />

        <div className="relative grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-glow">
              <span className="size-1.5 rounded-full bg-glow" />
              {role === "seller"
                ? `Seller Studio · ${accountLabel}`
                : role === "admin"
                  ? `Admin Console · ${accountLabel}`
                  : role === "buyer"
                    ? `Welcome back, ${accountLabel} · Buyer`
                    : "Hearth Atelier · Made-to-order divan beds"}
            </span>

            <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              {role === "seller" ? (
                <>
                  Manage <span className="text-glow">{accountLabel}</span>, or preview your storefront.
                </>
              ) : role === "admin" ? (
                <>
                  Moderate sellers & <span className="text-glow">marketplace</span> listings.
                </>
              ) : role === "buyer" ? (
                <>
                  Find your next bed, <span className="text-glow">priced live</span> as you build.
                </>
              ) : (
                <>
                  Crafted comfort, <span className="text-glow">priced live</span> as you build.
                </>
              )}
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-mist/75 sm:text-base">
              {role === "seller"
                ? "Add new bed listings with custom fabric swatches, size deltas and storage options, or update incoming buyer orders."
                : role === "admin"
                  ? "Approve or pause seller shops and control listing visibility across the Hearth marketplace."
                  : "Pick your upholstery fabric, divan size, storage drawers, headboard height and base support — every selection updates your price in real time."}
            </p>

            {/* Role-specific primary actions (never show Sign Up / Log In when signed in!) */}
            <div className="mt-6 flex flex-wrap gap-3">
              {role === "seller" ? (
                <>
                  <Link
                    href="/seller"
                    className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-glow px-5 text-sm font-bold text-obsidian shadow-sm transition hover:bg-glow-deep"
                  >
                    Open Seller Hub →
                  </Link>
                  <Link
                    href="/seller/new"
                    className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-semibold text-mist ring-1 ring-white/20 transition hover:bg-white/15"
                  >
                    + Add New Product
                  </Link>
                </>
              ) : role === "admin" ? (
                <>
                  <Link
                    href="/admin"
                    className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-glow px-5 text-sm font-bold text-obsidian shadow-sm transition hover:bg-glow-deep"
                  >
                    Open Admin Panel →
                  </Link>
                  <a
                    href="#catalogue"
                    className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-semibold text-mist ring-1 ring-white/20 transition hover:bg-white/15"
                  >
                    Browse Storefront ↓
                  </a>
                </>
              ) : role === "buyer" ? (
                <>
                  <a
                    href="#catalogue"
                    className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-glow px-5 text-sm font-bold text-obsidian shadow-sm transition hover:bg-glow-deep"
                  >
                    Browse collection ↓
                  </a>
                  <Link
                    href="/cart"
                    className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-semibold text-mist ring-1 ring-white/20 transition hover:bg-white/15"
                  >
                    My Basket{basketCount > 0 ? ` (${basketCount})` : ""}
                  </Link>
                  <Link
                    href="/orders"
                    className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-semibold text-mist ring-1 ring-white/20 transition hover:bg-white/15"
                  >
                    My Orders →
                  </Link>
                </>
              ) : (
                <>
                  <a
                    href="#catalogue"
                    className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-glow px-5 text-sm font-bold text-obsidian shadow-sm transition hover:bg-glow-deep"
                  >
                    Explore collection ↓
                  </a>
                  <Link
                    href="/signup"
                    className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-semibold text-mist ring-1 ring-white/20 transition hover:bg-white/15"
                  >
                    Buyer or Seller Sign Up →
                  </Link>
                </>
              )}
            </div>

            <dl className="mt-7 grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
              <div>
                <dt className="text-xs text-mist/60">Fabrics</dt>
                <dd className="font-display text-lg font-bold text-mist sm:text-xl">8+ Swatches</dd>
              </div>
              <div>
                <dt className="text-xs text-mist/60">Divan sizes</dt>
                <dd className="font-display text-lg font-bold text-mist sm:text-xl">2FT6 – 6FT</dd>
              </div>
              <div>
                <dt className="text-xs text-mist/60">Launch offer</dt>
                <dd className="font-display text-lg font-bold text-glow sm:text-xl">Up to 50% OFF</dd>
              </div>
            </dl>
          </div>

          {/* Floating faceless preview card */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="overflow-hidden rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-xs">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                <BedArt color="#dcbc98" variant={1} className="h-full w-full" />
                <span className="absolute left-3 top-3 rounded-lg bg-ink/90 px-2.5 py-1 text-xs font-bold text-glow">
                  50% OFF
                </span>
                <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 rounded-xl bg-ink/85 px-3.5 py-2.5 text-xs backdrop-blur-md">
                  <div>
                    <div className="font-semibold text-mist">Channel Divan · Storage Open</div>
                    <div className="text-mist/70">8 fabrics · 6 sizes · 5 storage options</div>
                  </div>
                  <span className="rounded-lg bg-glow px-2.5 py-1 font-bold text-obsidian">Live Price</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3-step customisation strip */}
      <section aria-label="How Hearth works" className="grid gap-4 sm:grid-cols-3">
        {[
          {
            step: "01",
            title: "Choose your fabric",
            desc: "Tap colour swatches to preview the divan bed tint and update the title instantly.",
          },
          {
            step: "02",
            title: "Tailor size & storage",
            desc: "Slide smoothly through Size, Drawers, Headboard and Base options.",
          },
          {
            step: "03",
            title: "Direct from sellers",
            desc: "Clear buyer ordering and seller fulfilment on one shared Hearth marketplace.",
          },
        ].map((item) => (
          <div
            key={item.step}
            className="rounded-2xl bg-white/90 p-5 shadow-xs ring-1 ring-fog backdrop-blur-xs transition hover:ring-ink/30"
          >
            <span className="inline-flex rounded-lg bg-ink px-2.5 py-1 text-xs font-bold text-glow">{item.step}</span>
            <h2 className="mt-3 font-display text-lg font-bold tracking-tight">{item.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{item.desc}</p>
          </div>
        ))}
      </section>

      {/* Catalogue & Filters */}
      <section id="catalogue" className="scroll-mt-24 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {role === "seller" ? "Live storefront preview" : "Featured beds"}
            </h2>
            <p className="text-sm text-muted">
              {list.length} {list.length === 1 ? "product" : "products"}
              {filtered && " match your filters"}
            </p>
          </div>
        </div>

        {prodErr && (
          <div role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
            Could not load products: {prodErr.message}
          </div>
        )}

        <form
          method="get"
          className="grid grid-cols-2 gap-3 rounded-2xl bg-white/90 p-4 shadow-xs ring-1 ring-fog backdrop-blur-md md:grid-cols-3 lg:grid-cols-6"
        >
          <label className="col-span-2 grid gap-1 text-xs font-medium text-muted md:col-span-1">
            Search
            <input name="q" defaultValue={sp.q ?? ""} placeholder="Name or keyword" className={field} />
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted">
            Category
            <select name="category" defaultValue={sp.category ?? ""} className={selectField}>
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted">
            Colour
            <select name="colour" defaultValue={sp.colour ?? ""} className={selectField}>
              <option value="">Any</option>
              {colours.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="col-span-2 grid gap-1 text-xs font-medium text-muted md:col-span-1">
            Size
            <select name="size" defaultValue={sp.size ?? ""} className={selectField}>
              <option value="">Any</option>
              {sizes.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted">
            Min price (£)
            <input name="min" type="number" min="0" inputMode="numeric" defaultValue={sp.min ?? ""} className={field} />
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted">
            Max price (£)
            <input name="max" type="number" min="0" inputMode="numeric" defaultValue={sp.max ?? ""} className={field} />
          </label>
          <div className="col-span-full flex flex-wrap items-center gap-2">
            <button className="min-h-11 cursor-pointer rounded-xl bg-ink px-5 text-sm font-semibold text-mist transition hover:bg-ink/90">
              Apply filters
            </button>
            {filtered && (
              <Link
                href="/#catalogue"
                className="inline-flex min-h-11 cursor-pointer items-center rounded-xl px-4 text-sm font-semibold underline"
              >
                Clear filters
              </Link>
            )}
          </div>
        </form>

        {list.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-xs ring-1 ring-fog">
            <p className="font-semibold">
              {filtered ? "No products match those filters." : "No active products listed yet."}
            </p>
            {filtered && (
              <Link href="/#catalogue" className="mt-2 inline-block cursor-pointer underline">
                Show all products
              </Link>
            )}
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((r) => {
              const img = r.cardImg;
              return (
                <li key={r.p.id}>
                  <Link
                    href={`/products/${r.p.slug}`}
                    className="group block cursor-pointer overflow-hidden rounded-2xl bg-white shadow-xs ring-1 ring-fog transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-mist">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img.url}
                          alt={r.p.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <BedArt
                          color={r.hex}
                          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                      {r.pct > 0 && (
                        <span className="absolute left-3 top-3 rounded-lg bg-ink px-2.5 py-1 text-xs font-bold tracking-wide text-glow shadow-xs sm:text-sm">
                          {r.pct}% OFF
                        </span>
                      )}
                      {r.p.categories && (
                        <span className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-ink backdrop-blur-xs">
                          {r.p.categories.name}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-display text-lg font-semibold leading-snug">{r.p.title}</h3>
                      <p className="mt-1.5 flex items-baseline gap-2">
                        <span className="text-xl font-bold">{gbp(r.price)}</span>
                        {r.was && <s className="text-sm text-muted">{gbp(r.was)}</s>}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5" aria-label={`${r.swatches.length} colours`}>
                          {r.swatches.slice(0, 8).map((v) => (
                            <span
                              key={v.id}
                              title={v.label}
                              className="size-4 rounded-full border border-black/10 transition-transform group-hover:scale-105"
                              style={{ background: v.swatch_hex ?? "#ccc" }}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-semibold text-muted transition-colors group-hover:text-ink">
                          {r.sizeLabels.length} sizes · Customise →
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Bottom section tailored by auth state (no Sign Up/Log In cards when already signed in!) */}
      {!user ? (
        <section aria-label="Buyer and Seller accounts" className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-2xl bg-white/95 p-6 shadow-xs ring-1 ring-fog">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink">
                <span className="size-1.5 rounded-full bg-ink" />
                Buyer Account
              </span>
              <h2 className="mt-3 font-display text-xl font-bold tracking-tight">Built for effortless bed shopping</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Browse customisable beds, save multiple configurations to your basket, check out, and track order
                progress from New to Delivered.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/signup"
                className="inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-ink px-4 text-sm font-semibold text-mist transition hover:bg-ink/90"
              >
                Sign up as Buyer
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-fog bg-white px-4 text-sm font-semibold text-ink transition hover:border-ink"
              >
                Buyer Log in
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl bg-ink p-6 text-mist shadow-xs">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-glow px-3 py-1 text-xs font-bold uppercase tracking-wide text-obsidian">
                <span className="size-1.5 rounded-full bg-obsidian" />
                Seller Account
              </span>
              <h2 className="mt-3 font-display text-xl font-bold tracking-tight">Run your own bed storefront</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-mist/75">
                Publish products with custom swatches, size deltas, drawer options, add-ons and photos, and update
                buyer order statuses from your Seller Hub.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/signup"
                className="inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-glow px-4 text-sm font-bold text-obsidian transition hover:bg-glow-deep"
              >
                Open Seller Shop
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-white/10 px-4 text-sm font-semibold text-mist ring-1 ring-white/20 transition hover:bg-white/15"
              >
                Seller Log in
              </Link>
            </div>
          </div>
        </section>
      ) : role === "seller" ? (
        <section aria-label="Seller workspace shortcuts" className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-2xl bg-white/95 p-6 shadow-xs ring-1 ring-fog">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink">
                Listings
              </span>
              <h2 className="mt-3 font-display text-xl font-bold tracking-tight">Add or edit bed listings</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Create new divan beds, configure colour swatches, size/storage deltas, add-ons and gallery photos.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/seller/new"
                className="inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-glow px-4 text-sm font-bold text-obsidian transition hover:bg-glow-deep"
              >
                + Add new product
              </Link>
              <Link
                href="/seller"
                className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-fog bg-white px-4 text-sm font-semibold text-ink transition hover:border-ink"
              >
                View all listings
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl bg-ink p-6 text-mist shadow-xs">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-glow px-3 py-1 text-xs font-bold uppercase tracking-wide text-obsidian">
                Fulfilment
              </span>
              <h2 className="mt-3 font-display text-xl font-bold tracking-tight">Manage incoming orders</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-mist/75">
                Review buyer option selections and move orders through New, Confirmed, Shipped, and Delivered.
              </p>
            </div>
            <div className="mt-4">
              <Link
                href="/seller"
                className="inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-glow px-4 text-sm font-bold text-obsidian transition hover:bg-glow-deep"
              >
                Go to Seller Hub →
              </Link>
            </div>
          </div>
        </section>
      ) : role === "admin" ? (
        <section aria-label="Admin shortcuts" className="rounded-2xl bg-ink p-6 text-mist shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex rounded-full bg-glow px-3 py-1 text-xs font-bold uppercase tracking-wide text-obsidian">
                Admin Controls
              </span>
              <h2 className="mt-2 font-display text-xl font-bold">Moderate sellers & listings</h2>
              <p className="mt-1 text-sm text-mist/75">Approve or pause seller shops and hide or restore listings.</p>
            </div>
            <Link
              href="/admin"
              className="inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-glow px-5 text-sm font-bold text-obsidian transition hover:bg-glow-deep"
            >
              Open Admin Panel →
            </Link>
          </div>
        </section>
      ) : (
        <section aria-label="Buyer workspace shortcuts" className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-2xl bg-white/95 p-6 shadow-xs ring-1 ring-fog">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink">
                Basket
              </span>
              <h2 className="mt-3 font-display text-xl font-bold tracking-tight">Ready to check out?</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Review your configured beds, quantities, and add-ons in your basket before placing your order.
              </p>
            </div>
            <div className="mt-4">
              <Link
                href="/cart"
                className="inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-glow px-4 text-sm font-bold text-obsidian transition hover:bg-glow-deep"
              >
                Open Basket{basketCount > 0 ? ` (${basketCount})` : ""} →
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl bg-ink p-6 text-mist shadow-xs">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-glow px-3 py-1 text-xs font-bold uppercase tracking-wide text-obsidian">
                Orders
              </span>
              <h2 className="mt-3 font-display text-xl font-bold tracking-tight">Track your deliveries</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-mist/75">
                View your placed orders, saved bed configurations, and live fulfilment updates from sellers.
              </p>
            </div>
            <div className="mt-4">
              <Link
                href="/orders"
                className="inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-glow px-4 text-sm font-bold text-obsidian transition hover:bg-glow-deep"
              >
                View My Orders →
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
