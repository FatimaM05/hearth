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
    <div className="animate-fade-up space-y-8">
      {/* Sleek editorial hero with faceless bed showcase */}
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
              Hearth Atelier · Made-to-order divan beds
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Crafted comfort, <span className="text-glow">priced live</span> as you build.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-mist/75 sm:text-base">
              Pick your upholstery fabric, divan size, storage drawers, headboard height and base support — every
              selection updates your price in real time.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#catalogue"
                className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-glow px-5 text-sm font-bold text-ink shadow-sm transition hover:bg-glow-deep"
              >
                Explore collection
                <span aria-hidden="true">↓</span>
              </a>
              <Link
                href="/signup"
                className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-semibold text-mist ring-1 ring-white/20 transition hover:bg-white/15"
              >
                Buyer or Seller Sign Up →
              </Link>
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
                  <span className="rounded-lg bg-glow px-2.5 py-1 font-bold text-ink">Live Price</span>
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

      <Suspense
        fallback={
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-white/70 ring-1 ring-fog" />
            ))}
          </div>
        }
      >
        <Catalogue searchParams={searchParams} />
      </Suspense>

      {/* Buyer vs Seller role clarity strip */}
      <section aria-label="Buyer and Seller accounts" className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col justify-between rounded-2xl bg-white/95 p-6 shadow-xs ring-1 ring-fog">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink">
              <span className="size-1.5 rounded-full bg-ink" />
              Buyer Account
            </span>
            <h2 className="mt-3 font-display text-xl font-bold tracking-tight">Built for effortless bed shopping</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Browse customisable beds, save multiple configurations to your basket, check out, and track order progress
              from New to Delivered.
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-glow px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink">
              <span className="size-1.5 rounded-full bg-ink" />
              Seller Account
            </span>
            <h2 className="mt-3 font-display text-xl font-bold tracking-tight">Run your own bed storefront</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-mist/75">
              Publish products with custom swatches, size deltas, drawer options, add-ons and photos, and update buyer
              order statuses from your Seller Hub.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/signup"
              className="inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-glow px-4 text-sm font-bold text-ink transition hover:bg-glow-deep"
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
    </div>
  );
}

async function Catalogue({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  const sp = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: prods }, { data: cats }, profileRes] = await Promise.all([
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
  ]);

  const role = profileRes.data?.role ?? null;
  const accountLabel =
    role === "seller"
      ? profileRes.data?.shop_name || profileRes.data?.full_name || "Seller"
      : profileRes.data?.full_name || user?.email?.split("@")[0] || "Buyer";

  const all = (prods ?? []) as unknown as ProductFull[];
  const categories = (cats ?? []) as Category[];

  const rows = all.map((p) => {
    const groups = [...p.option_groups].sort((a, b) => a.sort_order - b.sort_order);
    const sel = defaultSelection(groups);
    const subtotal = optionSubtotal(p.base_price, groups, sel);
    const swatches = groups.find((g) => g.kind === "swatch")?.option_values ?? [];
    const defaultColour = swatches.find((v) => v.id === sel[groups.find((g) => g.kind === "swatch")?.id ?? ""]);
    const sizeVals = groups.filter((g) => isSize(g.name)).flatMap((g) => g.option_values.map((v) => v.label));
    return {
      p,
      price: subtotal,
      was: comparePrice(subtotal, 0, Number(p.base_price), p.compare_at_price),
      pct: discountPct(Number(p.base_price), p.compare_at_price),
      swatches: [...swatches].sort((a, b) => a.sort_order - b.sort_order),
      hex: defaultColour?.swatch_hex ?? "#E8DEC6",
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
    <section id="catalogue" className="scroll-mt-24 space-y-5">
      {/* Role-aware account indicator bar */}
      {user && role && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 ring-1 ${
            role === "seller"
              ? "bg-glow/15 text-ink ring-glow/60"
              : role === "admin"
                ? "bg-ink text-mist ring-ink"
                : "bg-white/95 text-ink ring-fog"
          }`}
        >
          <div className="flex flex-wrap items-center gap-2.5 text-sm">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
                role === "seller"
                  ? "bg-glow text-ink"
                  : role === "admin"
                    ? "bg-white text-ink"
                    : "bg-ink text-mist"
              }`}
            >
              {role} mode
            </span>
            <span>
              Signed in as <strong>{accountLabel}</strong>{" "}
              {role === "seller"
                ? "— you are previewing the live buyer storefront."
                : role === "admin"
                  ? "— marketplace moderation enabled."
                  : "— configure any bed and add it to your basket."}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {role === "seller" ? (
              <Link
                href="/seller"
                className="inline-flex min-h-10 cursor-pointer items-center rounded-xl bg-ink px-4 text-xs font-semibold text-mist transition hover:bg-ink/90"
              >
                Open Seller Hub →
              </Link>
            ) : role === "admin" ? (
              <Link
                href="/admin"
                className="inline-flex min-h-10 cursor-pointer items-center rounded-xl bg-glow px-4 text-xs font-bold text-ink transition hover:bg-glow-deep"
              >
                Open Admin Panel →
              </Link>
            ) : (
              <Link
                href="/cart"
                className="inline-flex min-h-10 cursor-pointer items-center rounded-xl bg-glow px-4 text-xs font-bold text-ink transition hover:bg-glow-deep"
              >
                View Basket →
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Featured beds</h2>
          <p className="text-sm text-muted">
            {list.length} {list.length === 1 ? "product" : "products"}
            {filtered && " match your filters"}
          </p>
        </div>
      </div>

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
          <p className="font-semibold">No products match those filters.</p>
          <Link href="/#catalogue" className="mt-2 inline-block cursor-pointer underline">
            Show all products
          </Link>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((r) => {
            const img = [...r.p.product_images].sort((a, b) => a.sort_order - b.sort_order)[0];
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
  );
}
