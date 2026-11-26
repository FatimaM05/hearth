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
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">Beds built around you</h1>
      <Suspense fallback={<p className="mt-1 text-muted">Loading beds...</p>}>
        <Catalogue searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Catalogue({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  const sp = await searchParams;
  const supabase = await createClient();

  const [{ data: prods }, { data: cats }] = await Promise.all([
    supabase
      .from("products")
      .select("*, option_groups(*, option_values(*)), product_addons(*), product_images(*), categories(name, slug)")
      .eq("status", "active")
      .eq("admin_hidden", false)
      .order("created_at", { ascending: false }),
    supabase.from("categories").select("*").not("parent_id", "is", null).order("name"),
  ]);
  const all = (prods ?? []) as unknown as ProductFull[];
  const categories = (cats ?? []) as Category[];

  const rows = all.map((p) => {
    const groups = [...p.option_groups].sort((a, b) => a.sort_order - b.sort_order);
    const sel = defaultSelection(groups);
    const subtotal = optionSubtotal(p.base_price, groups, sel);
    const swatches = groups.find((g) => g.kind === "swatch")?.option_values ?? [];
    const defaultColour = swatches.find((v) => v.id === sel[groups.find((g) => g.kind === "swatch")?.id ?? ""]);
    return {
      p,
      price: subtotal,
      was: comparePrice(subtotal, 0, Number(p.base_price), p.compare_at_price),
      pct: discountPct(Number(p.base_price), p.compare_at_price),
      swatches: [...swatches].sort((a, b) => a.sort_order - b.sort_order),
      hex: defaultColour?.swatch_hex ?? "#E8DEC6",
      colourLabels: swatches.map((v) => v.label),
      sizeLabels: groups.filter((g) => isSize(g.name)).flatMap((g) => g.option_values.map((v) => v.label)),
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

  const field = "h-11 w-full rounded-xl border border-fog bg-white px-3 text-sm";
  const selectField = `${field} cursor-pointer`;
  const filtered = Boolean(q || sp.category || sp.colour || sp.size || sp.min || sp.max);

  return (
    <>
      <p className="mt-1 text-muted">
        {list.length} {list.length === 1 ? "product" : "products"}
        {filtered && " match your filters"}
      </p>

      <form
        method="get"
        className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 ring-1 ring-fog md:grid-cols-3 lg:grid-cols-6"
      >
        <label className="col-span-2 grid gap-1 text-xs text-muted md:col-span-1">
          Search
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Name or keyword" className={field} />
        </label>
        <label className="grid gap-1 text-xs text-muted">
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
        <label className="grid gap-1 text-xs text-muted">
          Colour
          <select name="colour" defaultValue={sp.colour ?? ""} className={selectField}>
            <option value="">Any</option>
            {colours.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="col-span-2 grid gap-1 text-xs text-muted md:col-span-1">
          Size
          <select name="size" defaultValue={sp.size ?? ""} className={selectField}>
            <option value="">Any</option>
            {sizes.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted">
          Min price (£)
          <input name="min" type="number" min="0" inputMode="numeric" defaultValue={sp.min ?? ""} className={field} />
        </label>
        <label className="grid gap-1 text-xs text-muted">
          Max price (£)
          <input name="max" type="number" min="0" inputMode="numeric" defaultValue={sp.max ?? ""} className={field} />
        </label>
        <div className="col-span-full flex flex-wrap gap-2">
          <button className="min-h-11 cursor-pointer rounded-xl bg-ink px-5 text-sm font-semibold text-mist">
            Apply filters
          </button>
          {filtered && (
            <Link
              href="/"
              className="inline-flex min-h-11 cursor-pointer items-center rounded-xl px-4 text-sm font-semibold underline"
            >
              Clear filters
            </Link>
          )}
        </div>
      </form>

      {list.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-white p-8 text-center ring-1 ring-fog">
          <p className="font-semibold">No products match those filters.</p>
          <Link href="/" className="mt-2 inline-block cursor-pointer underline">
            Show all products
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((r) => {
            const img = [...r.p.product_images].sort((a, b) => a.sort_order - b.sort_order)[0];
            return (
              <li key={r.p.id}>
                <Link
                  href={`/products/${r.p.slug}`}
                  className="block cursor-pointer overflow-hidden rounded-2xl bg-white ring-1 ring-fog transition-shadow hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3]">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img.url} alt={r.p.title} className="h-full w-full object-cover" />
                    ) : (
                      <BedArt color={r.hex} className="h-full w-full" />
                    )}
                    {r.pct > 0 && (
                      <span className="absolute left-3 top-3 rounded-lg bg-ink px-2.5 py-1 text-sm font-bold text-glow">
                        {r.pct}% OFF
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h2 className="font-display text-lg font-semibold leading-snug">{r.p.title}</h2>
                    <p className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold">{gbp(r.price)}</span>
                      {r.was && <s className="text-sm text-muted">{gbp(r.was)}</s>}
                    </p>
                    <div className="mt-3 flex items-center gap-1.5" aria-label={`${r.swatches.length} colours`}>
                      {r.swatches.slice(0, 8).map((v) => (
                        <span
                          key={v.id}
                          title={v.label}
                          className="size-4 rounded-full border border-black/10"
                          style={{ background: v.swatch_hex ?? "#ccc" }}
                        />
                      ))}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
