"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BedArt from "@/components/BedArt";
import { addToCart } from "@/app/actions/cart";
import { comparePrice, defaultSelection, discountPct, gbp, optionSubtotal, sum, unitPrice } from "@/lib/pricing";
import type { OptionGroup, ProductFull } from "@/lib/types";

type Slide = { kind: "img"; url: string; alt: string } | { kind: "art"; variant: number };
type Msg = { type: "ok" | "error"; text: string; login?: boolean } | null;

export default function ProductView({ product, sellerName }: { product: ProductFull; sellerName: string }) {
  const router = useRouter();

  const groups: OptionGroup[] = useMemo(
    () =>
      [...product.option_groups]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((g) => ({ ...g, option_values: [...g.option_values].sort((a, b) => a.sort_order - b.sort_order) })),
    [product.option_groups]
  );
  const addons = useMemo(
    () => [...product.product_addons].sort((a, b) => a.sort_order - b.sort_order),
    [product.product_addons]
  );

  const [sel, setSel] = useState<Record<string, string>>(() => defaultSelection(groups));
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [slide, setSlide] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const track = useRef<HTMLDivElement>(null);

  // ----- derived price and title (all numbers come from the database rows) -----
  const colourGroup = groups.find((g) => g.kind === "swatch");
  const colourId = colourGroup ? sel[colourGroup.id] : undefined;
  const colour = colourGroup?.option_values.find((v) => v.id === colourId);
  const subtotal = optionSubtotal(product.base_price, groups, sel);
  const addonTotal = sum(addons.filter((a) => addonIds.includes(a.id)).map((a) => Number(a.price)));
  const price = unitPrice(subtotal, addons.filter((a) => addonIds.includes(a.id)).map((a) => Number(a.price)));
  const was = comparePrice(subtotal, addonTotal, Number(product.base_price), product.compare_at_price);
  const pct = discountPct(Number(product.base_price), product.compare_at_price);
  const baseName = product.title.split(" – ")[0];
  const title = colour ? `${baseName} – ${colour.label}` : product.title;
  const hex = colour?.swatch_hex ?? "#E8DEC6";

  // ----- gallery -----
  const slides: Slide[] = useMemo(() => {
    const imgs = [...product.product_images].sort((a, b) => a.sort_order - b.sort_order);
    const forColour = imgs.filter((i) => i.option_value_id && i.option_value_id === colourId);
    const general = imgs.filter((i) => !i.option_value_id);
    const chosen = [...forColour, ...general];
    if (chosen.length === 0) return [0, 1, 2, 3, 4].map((variant) => ({ kind: "art" as const, variant }));
    return chosen.map((i) => ({ kind: "img" as const, url: i.url, alt: i.alt ?? product.title }));
  }, [product.product_images, product.title, colourId]);
  const cur = Math.min(slide, slides.length - 1);

  function goTo(i: number) {
    setSlide(i);
    const el = track.current;
    if (el) el.scrollTo({ left: el.clientWidth * i, behavior: "smooth" });
  }
  function onScroll() {
    const el = track.current;
    if (el && el.clientWidth) setSlide(Math.round(el.scrollLeft / el.clientWidth));
  }
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowRight") setSlide((s) => Math.min(s + 1, slides.length - 1));
      if (e.key === "ArrowLeft") setSlide((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom, slides.length]);

  const renderSlide = (s: Slide) =>
    s.kind === "img" ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={s.url} alt={s.alt} className="h-full w-full object-cover" draggable={false} />
    ) : (
      <BedArt color={hex} variant={s.variant} className="h-full w-full" />
    );

  // ----- actions -----
  function choose(g: OptionGroup, valueId: string) {
    setSel((s) => ({ ...s, [g.id]: valueId }));
    if (g.kind === "swatch") goTo(0);
  }
  function add() {
    setMsg(null);
    start(async () => {
      const res = await addToCart({ productId: product.id, valueIds: Object.values(sel), addonIds, quantity: qty });
      if (res.ok) {
        setMsg({ type: "ok", text: "Added to your basket." });
        router.refresh();
      } else {
        setMsg({ type: "error", text: res.error, login: res.needsLogin });
      }
    });
  }

  const addBtn =
    "min-h-12 cursor-pointer rounded-xl bg-glow px-6 font-semibold text-ink hover:bg-glow-deep disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="pb-28 md:pb-0">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
        <Link href="/" className="cursor-pointer underline">
          Home
        </Link>
        {product.categories && (
          <>
            {" / "}
            <Link href={`/?category=${product.categories.slug}`} className="cursor-pointer underline">
              {product.categories.name}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-8 md:grid-cols-[1.1fr_1fr]">
        {/* ---------- gallery ---------- */}
        <section aria-label="Product images" className="min-w-0">
          <div className="relative">
            <div
              ref={track}
              onScroll={onScroll}
              className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-2xl ring-1 ring-fog [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {slides.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setZoom(true)}
                  aria-label={`Enlarge image ${i + 1} of ${slides.length}`}
                  className="aspect-[4/3] w-full shrink-0 cursor-zoom-in snap-center"
                >
                  {renderSlide(s)}
                </button>
              ))}
            </div>
            {pct > 0 && (
              <span className="pointer-events-none absolute left-3 top-3 rounded-lg bg-ink px-2.5 py-1 text-sm font-bold text-glow">
                {pct}% OFF
              </span>
            )}
            <span className="pointer-events-none absolute bottom-3 right-3 rounded-lg bg-ink/70 px-2 py-0.5 text-xs text-mist">
              {cur + 1} / {slides.length}
            </span>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {slides.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === cur}
                className={`aspect-[4/3] w-20 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-2 ${
                  i === cur ? "ring-ink" : "ring-transparent opacity-70 hover:opacity-100"
                }`}
              >
                {renderSlide(s)}
              </button>
            ))}
          </div>
        </section>

        {/* ---------- details ---------- */}
        <section className="min-w-0">
          <h1 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-muted">Sold by {sellerName}</p>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold sm:text-4xl" aria-live="polite">
              {gbp(price)}
            </span>
            {was && <s className="text-lg text-muted">{gbp(was)}</s>}
          </div>

          <div className="mt-6 grid gap-6">
            {groups.map((g) => {
              const current = g.option_values.find((v) => v.id === sel[g.id]);
              return (
                <fieldset key={g.id}>
                  <legend className="mb-2 text-sm">
                    <span className="text-muted">{g.name}:</span>{" "}
                    <span className="font-semibold">{current?.label}</span>
                  </legend>
                  {g.kind === "swatch" ? (
                    <div role="radiogroup" aria-label={g.name} className="flex flex-wrap gap-2">
                      {g.option_values.map((v) => {
                        const on = sel[g.id] === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            aria-label={v.label}
                            title={v.label}
                            onClick={() => choose(g, v.id)}
                            className={`grid size-11 cursor-pointer place-items-center rounded-full border-2 ${
                              on ? "border-ink ring-2 ring-ink ring-offset-2" : "border-fog hover:border-muted"
                            }`}
                          >
                            <span
                              className="size-8 rounded-full border border-black/10"
                              style={{ background: v.swatch_hex ?? "#ccc" }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div role="radiogroup" aria-label={g.name} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {g.option_values.map((v) => {
                        const on = sel[g.id] === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => choose(g, v.id)}
                            className={`min-h-11 cursor-pointer rounded-xl border px-3 py-2 text-left text-sm ${
                              on ? "border-ink bg-ink text-mist" : "border-fog bg-white hover:border-muted"
                            }`}
                          >
                            <span className="block font-semibold">{v.label}</span>
                            <span className={on ? "text-mist/70" : "text-muted"}>
                              {Number(v.price_delta) > 0 ? `+${gbp(Number(v.price_delta))}` : "Included"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </fieldset>
              );
            })}

            {addons.map((a) => {
              const on = addonIds.includes(a.id);
              return (
                <label
                  key={a.id}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 ${
                    on ? "border-ink bg-white" : "border-fog bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => setAddonIds((ids) => (on ? ids.filter((x) => x !== a.id) : [...ids, a.id]))}
                    className="size-5 cursor-pointer accent-ink"
                  />
                  <span className="flex-1 text-sm font-semibold">{a.name}</span>
                  <span className="text-sm text-muted">+{gbp(Number(a.price))}</span>
                </label>
              );
            })}

            <div className="flex items-center gap-3">
              <span className="text-sm text-muted">Quantity</span>
              <div className="flex items-center rounded-xl border border-fog bg-white">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="size-11 cursor-pointer"
                >
                  −
                </button>
                <span className="w-8 text-center font-semibold" aria-live="polite">
                  {qty}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQty((q) => Math.min(10, q + 1))}
                  className="size-11 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <button onClick={add} disabled={pending} className={`${addBtn} mt-6 hidden w-full md:block`}>
            {pending ? "Adding" : `Add to basket · ${gbp(price * qty)}`}
          </button>

          <p aria-live="polite" className="mt-3 min-h-6 text-sm">
            {msg?.type === "ok" && (
              <span>
                {msg.text}{" "}
                <Link href="/cart" className="cursor-pointer font-semibold underline">
                  View basket
                </Link>
              </span>
            )}
            {msg?.type === "error" && (
              <span className="text-red-700">
                {msg.text}{" "}
                {msg.login && (
                  <Link href={`/login?next=/products/${product.slug}`} className="cursor-pointer font-semibold underline">
                    Log in
                  </Link>
                )}
              </span>
            )}
          </p>

          {product.description && <p className="mt-4 max-w-prose leading-relaxed text-muted">{product.description}</p>}
        </section>
      </div>

      {/* sticky mobile bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-fog bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          <div>
            <div className="font-display text-xl font-bold leading-none">{gbp(price * qty)}</div>
            {was && <s className="text-xs text-muted">{gbp(was * qty)}</s>}
          </div>
          <button onClick={add} disabled={pending} className={`${addBtn} flex-1`}>
            {pending ? "Adding" : "Add to basket"}
          </button>
        </div>
      </div>

      {zoom && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged image"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ink/90 p-4"
          onClick={() => setZoom(false)}
        >
          <button
            onClick={() => setZoom(false)}
            className="absolute right-4 top-4 z-10 min-h-11 cursor-pointer rounded-lg bg-white px-4 text-sm font-semibold"
          >
            Close
          </button>
          <div
            className="aspect-[4/3] max-h-[75vh] w-full max-w-4xl overflow-hidden rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {renderSlide(slides[cur])}
          </div>
          <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSlide(Math.max(cur - 1, 0))}
              disabled={cur === 0}
              className="min-h-11 cursor-pointer rounded-lg bg-white px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setSlide(Math.min(cur + 1, slides.length - 1))}
              disabled={cur === slides.length - 1}
              className="min-h-11 cursor-pointer rounded-lg bg-white px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
