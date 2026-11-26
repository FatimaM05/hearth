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

function GroupIcon({ name, kind }: { name: string; kind: string }) {
  const n = name.trim().toLowerCase();
  const common = "size-5 shrink-0";
  if (kind === "swatch" || n.includes("colour") || n.includes("color")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={common} aria-hidden="true">
        <path d="M12 3a9 9 0 0 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.3-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3A3.7 3.7 0 0 0 21 10.7C21 6.4 17 3 12 3Z" />
        <circle cx="7.5" cy="11.5" r="1" fill="currentColor" />
        <circle cx="10.5" cy="7.5" r="1" fill="currentColor" />
        <circle cx="15" cy="8" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (n.includes("size")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={common} aria-hidden="true">
        <path d="M4 20 20 4v16H4Z" />
        <path d="M12 16v4M16 12v8" />
      </svg>
    );
  }
  if (n.includes("storage") || n.includes("drawer")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={common} aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M4 12h16M10 8h4M10 16h4" />
      </svg>
    );
  }
  if (n.includes("headboard")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={common} aria-hidden="true">
        <path d="M4 18V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11" />
        <path d="M2 18h20M8 5v13M12 5v13M16 5v13" />
      </svg>
    );
  }
  if (n.includes("base")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={common} aria-hidden="true">
        <rect x="3" y="9" width="18" height="8" rx="1.5" />
        <path d="M5 17v2M19 17v2M3 13h18" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={common} aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="1.5" fill="currentColor" />
      <circle cx="15" cy="12" r="1.5" fill="currentColor" />
      <circle cx="11" cy="17" r="1.5" fill="currentColor" />
    </svg>
  );
}

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
  const [activeTab, setActiveTab] = useState(0);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [slide, setSlide] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const track = useRef<HTMLDivElement>(null);

  const safeTab = Math.min(activeTab, Math.max(0, groups.length - 1));
  const activeGroup = groups[safeTab];

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
  const sortedImages = useMemo(
    () => [...product.product_images].sort((a, b) => a.sort_order - b.sort_order),
    [product.product_images]
  );

  const slides: Slide[] = useMemo(() => {
    const forColour = sortedImages.filter((i) => i.option_value_id && i.option_value_id === colourId);
    const general = sortedImages.filter((i) => !i.option_value_id);
    const chosen = [...forColour, ...general];
    if (chosen.length === 0) return [0, 1, 2, 3, 4].map((variant) => ({ kind: "art" as const, variant }));
    return chosen.map((i) => ({ kind: "img" as const, url: i.url, alt: i.alt ?? product.title }));
  }, [sortedImages, product.title, colourId]);
  const cur = Math.min(slide, slides.length - 1);

  function goTo(i: number) {
    const target = Math.max(0, Math.min(i, slides.length - 1));
    setSlide(target);
    const el = track.current;
    if (el) el.scrollTo({ left: el.clientWidth * target, behavior: "smooth" });
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
    "min-h-12 cursor-pointer rounded-xl bg-glow px-6 font-semibold text-ink shadow-sm transition-all duration-200 hover:bg-glow-deep active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="animate-fade-up pb-28 md:pb-4">
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted">
        <Link href="/" className="cursor-pointer transition-colors hover:text-ink hover:underline">
          Home
        </Link>
        {product.categories && (
          <>
            <span aria-hidden="true">/</span>
            <Link
              href={`/?category=${product.categories.slug}`}
              className="cursor-pointer transition-colors hover:text-ink hover:underline"
            >
              {product.categories.name}
            </Link>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span className="truncate font-medium text-ink">{baseName}</span>
      </nav>

      <div className="grid gap-6 md:grid-cols-[1.08fr_1fr] md:items-start lg:gap-8">
        {/* ---------- gallery ---------- */}
        <section aria-label="Product images" className="order-1 min-w-0 md:col-start-1 md:row-start-1">
          <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-fog">
            <div
              ref={track}
              onScroll={onScroll}
              className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
              <span className="pointer-events-none absolute left-3 top-3 rounded-lg bg-ink px-2.5 py-1 text-xs font-bold tracking-wide text-glow shadow-sm sm:text-sm">
                {pct}% OFF
              </span>
            )}

            {/* Click to expand + pagination dots (matching reference layout) */}
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom(true)}
                className="pointer-events-auto inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full bg-ink/85 px-3.5 py-1 text-xs font-semibold text-mist shadow-sm backdrop-blur-sm transition hover:bg-ink"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M11 8v6M8 11h6M20 20l-3.5-3.5" />
                </svg>
                Click To Expand
              </button>
              <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 backdrop-blur-sm">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Go to image ${i + 1}`}
                    onClick={() => goTo(i)}
                    className={`h-2 cursor-pointer rounded-full transition-all duration-300 ${
                      i === cur ? "w-5 bg-ink" : "w-2 bg-fog hover:bg-muted"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Thumbnail strip with prev/next slide controls */}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => goTo(cur - 1)}
              disabled={cur === 0}
              aria-label="Previous image"
              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border border-fog bg-white text-ink shadow-xs transition hover:border-ink disabled:cursor-not-allowed disabled:opacity-35"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <div className="flex flex-1 gap-2 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {slides.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Show image ${i + 1}`}
                  aria-current={i === cur}
                  className={`aspect-[4/3] w-20 shrink-0 cursor-pointer overflow-hidden rounded-xl ring-2 transition-all duration-200 ${
                    i === cur ? "ring-ink shadow-xs" : "ring-transparent opacity-65 hover:opacity-100"
                  }`}
                >
                  {renderSlide(s)}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => goTo(cur + 1)}
              disabled={cur === slides.length - 1}
              aria-label="Next image"
              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border border-fog bg-white text-ink shadow-xs transition hover:border-ink disabled:cursor-not-allowed disabled:opacity-35"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </section>

        {/* ---------- details + 5-tab sliding configurator ---------- */}
        <section className="order-2 min-w-0 md:col-start-2 md:row-span-2 md:row-start-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-muted ring-1 ring-fog">
              <span className="size-1.5 rounded-full bg-glow" />
              Sold by <strong className="font-semibold text-ink">{sellerName}</strong>
            </span>
          </div>

          <h1 className="mt-2 font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{title}</h1>

          <div className="mt-3 flex flex-wrap items-baseline gap-3">
            <span className="font-display text-3xl font-bold tracking-tight sm:text-4xl" aria-live="polite">
              {gbp(price)}
            </span>
            {was && <s className="text-lg text-muted">{gbp(was)}</s>}
            {pct > 0 && (
              <span className="rounded-lg bg-glow/25 px-2.5 py-1 text-xs font-bold text-ink">Save {pct}%</span>
            )}
          </div>

          {/* 5-Tab Sliding Option Configurator (matches reference layout) */}
          <div className="mt-5 overflow-hidden rounded-2xl border border-fog bg-white shadow-sm">
            {/* Tab Bar */}
            <div
              role="tablist"
              aria-label="Bed configuration options"
              className="flex overflow-x-auto border-b border-fog bg-mist/70 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-5"
            >
              {groups.map((g, idx) => {
                const isActive = idx === safeTab;
                const current = g.option_values.find((v) => v.id === sel[g.id]);
                const delta = Number(current?.price_delta ?? 0);
                return (
                  <button
                    key={g.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(idx)}
                    className={`group flex min-w-[92px] flex-1 shrink-0 cursor-pointer flex-col items-center justify-start gap-1 border-r border-fog/80 px-2 py-3 text-center transition-all duration-200 last:border-r-0 sm:min-w-0 ${
                      isActive
                        ? "bg-white text-ink shadow-[inset_0_-3px_0_0_var(--color-ink)]"
                        : "text-muted hover:bg-white/60 hover:text-ink"
                    }`}
                  >
                    <span
                      className={`transition-transform duration-200 ${
                        isActive ? "scale-105 text-ink" : "text-muted group-hover:text-ink"
                      }`}
                    >
                      <GroupIcon name={g.name} kind={g.kind} />
                    </span>
                    <span className="text-xs font-bold leading-none">{g.name}</span>
                    <span className="line-clamp-2 text-[11px] leading-tight text-muted">
                      {current?.label}
                      {delta > 0 ? ` (+${gbp(delta)})` : ""}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Group Label */}
            {activeGroup && (
              <div className="flex items-center justify-between border-b border-fog/60 px-4 py-2.5 text-sm">
                <div>
                  <span className="text-muted">{activeGroup.name}:</span>{" "}
                  <span className="font-semibold text-ink">
                    {activeGroup.option_values.find((v) => v.id === sel[activeGroup.id])?.label}
                  </span>
                </div>
                <span className="text-xs font-medium text-muted">
                  Step {safeTab + 1} of {groups.length}
                </span>
              </div>
            )}

            {/* Smooth Horizontal Sliding Panels */}
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: `translateX(-${safeTab * 100}%)` }}
              >
                {groups.map((g) => (
                  <div key={g.id} role="tabpanel" aria-label={g.name} className="w-full shrink-0 p-4">
                    {g.kind === "swatch" ? (
                      <div role="radiogroup" aria-label={g.name} className="grid grid-cols-2 gap-2.5 min-[420px]:grid-cols-3 sm:grid-cols-4">
                        {g.option_values.map((v) => {
                          const on = sel[g.id] === v.id;
                          const swatchImg = sortedImages.find((img) => img.option_value_id === v.id);
                          return (
                            <button
                              key={v.id}
                              type="button"
                              role="radio"
                              aria-checked={on}
                              aria-label={v.label}
                              title={v.label}
                              onClick={() => choose(g, v.id)}
                              className={`group relative flex cursor-pointer flex-col items-center rounded-xl p-1.5 text-center transition-all duration-200 ${
                                on
                                  ? "border-2 border-ink bg-mist/40 shadow-xs"
                                  : "border border-fog bg-white hover:border-muted"
                              }`}
                            >
                              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-mist">
                                {swatchImg ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={swatchImg.url}
                                    alt={swatchImg.alt ?? v.label}
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    draggable={false}
                                  />
                                ) : (
                                  <BedArt
                                    color={v.swatch_hex ?? "#E8DEC6"}
                                    variant={1}
                                    className="h-full w-full transition-transform duration-300 group-hover:scale-105"
                                  />
                                )}
                                <span
                                  className="absolute bottom-1.5 left-1.5 size-4 rounded-full border border-white/90 shadow-xs"
                                  style={{ background: v.swatch_hex ?? "#ccc" }}
                                />
                                {on && (
                                  <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-ink text-glow shadow-xs">
                                    <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5" aria-hidden="true">
                                      <path
                                        fillRule="evenodd"
                                        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.2 7.25a1 1 0 0 1-1.42 0l-3.3-3.32a1 1 0 1 1 1.42-1.41l2.59 2.606 6.49-6.534a1 1 0 0 1 1.414-.006Z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </span>
                                )}
                              </div>
                              <span className="mt-1.5 line-clamp-2 text-xs font-semibold leading-tight text-ink">
                                {v.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div role="radiogroup" aria-label={g.name} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {g.option_values.map((v) => {
                          const on = sel[g.id] === v.id;
                          const delta = Number(v.price_delta);
                          return (
                            <button
                              key={v.id}
                              type="button"
                              role="radio"
                              aria-checked={on}
                              onClick={() => choose(g, v.id)}
                              className={`flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-all duration-200 ${
                                on
                                  ? "border-ink bg-ink text-mist shadow-xs"
                                  : "border-fog bg-white text-ink hover:border-muted"
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block font-semibold leading-snug">{v.label}</span>
                                <span className={`text-xs ${on ? "text-mist/75" : "text-muted"}`}>
                                  {delta > 0 ? `+${gbp(delta)}` : "Included"}
                                </span>
                              </span>
                              <span
                                className={`grid size-5 shrink-0 place-items-center rounded-full border ${
                                  on ? "border-glow bg-glow text-ink" : "border-fog bg-white"
                                }`}
                              >
                                {on && <span className="size-2 rounded-full bg-ink" />}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step slide navigation footer */}
            {groups.length > 1 && (
              <div className="flex items-center justify-between border-t border-fog/70 bg-mist/40 px-4 py-2.5 text-xs">
                <button
                  type="button"
                  disabled={safeTab === 0}
                  onClick={() => setActiveTab((t) => Math.max(0, t - 1))}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-lg px-2.5 font-semibold text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  disabled={safeTab === groups.length - 1}
                  onClick={() => setActiveTab((t) => Math.min(groups.length - 1, t + 1))}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-lg bg-white px-3 font-semibold text-ink ring-1 ring-fog transition hover:ring-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {safeTab < groups.length - 1 ? `Next: ${groups[safeTab + 1].name} →` : "All options selected"}
                </button>
              </div>
            )}
          </div>

          {/* Quantity + Add to basket */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-xl border border-fog bg-white shadow-xs">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="size-12 cursor-pointer text-lg font-medium transition hover:bg-mist/60"
              >
                −
              </button>
              <span className="w-9 text-center font-semibold" aria-live="polite">
                {qty}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQty((q) => Math.min(10, q + 1))}
                className="size-12 cursor-pointer text-lg font-medium transition hover:bg-mist/60"
              >
                +
              </button>
            </div>

            <button onClick={add} disabled={pending} className={`${addBtn} hidden flex-1 md:inline-flex md:items-center md:justify-center md:gap-2`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden="true">
                <path d="M6 6h15l-1.5 9h-12L5 3H2" />
                <circle cx="9" cy="20" r="1.2" fill="currentColor" />
                <circle cx="18" cy="20" r="1.2" fill="currentColor" />
              </svg>
              {pending ? "Adding..." : `Add to basket · ${gbp(price * qty)}`}
            </button>
          </div>

          <p aria-live="polite" className="mt-3 min-h-6 text-sm">
            {msg?.type === "ok" && (
              <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 ring-1 ring-fog">
                {msg.text}{" "}
                <Link href="/cart" className="cursor-pointer font-semibold underline">
                  View basket
                </Link>
              </span>
            )}
            {msg?.type === "error" && (
              <span className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-red-700 ring-1 ring-red-200">
                {msg.text}{" "}
                {msg.login && (
                  <Link href={`/login?next=/products/${product.slug}`} className="cursor-pointer font-semibold underline">
                    Log in
                  </Link>
                )}
              </span>
            )}
          </p>

          {product.description && (
            <p className="mt-4 max-w-prose leading-relaxed text-muted">{product.description}</p>
          )}
        </section>

        {/* ---------- Add-on cards (e.g. Professional Assembly, matching left column under gallery) ---------- */}
        {addons.length > 0 && (
          <section aria-label="Optional add-ons" className="order-3 grid gap-3 min-w-0 md:col-start-1 md:row-start-2">
            {addons.map((a) => {
              const on = addonIds.includes(a.id);
              const isAssembly = a.name.toLowerCase().includes("assembly");
              return (
                <div
                  key={a.id}
                  onClick={() => setAddonIds((ids) => (on ? ids.filter((x) => x !== a.id) : [...ids, a.id]))}
                  className={`flex cursor-pointer items-center gap-3.5 rounded-2xl border bg-white p-4 shadow-xs transition-all duration-200 ${
                    on ? "border-ink ring-1 ring-ink/15" : "border-fog hover:border-muted"
                  }`}
                >
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-mist text-ink">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-5" aria-hidden="true">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink">{a.name}</div>
                    <p className="text-xs leading-relaxed text-muted">
                      {isAssembly
                        ? "Our team will deliver your bed to your room and professionally assemble it for you."
                        : "Optional upgrade added directly to your order."}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-bold text-ink">{gbp(Number(a.price))}</span>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddonIds((ids) => (on ? ids.filter((x) => x !== a.id) : [...ids, a.id]));
                      }}
                      className={`min-h-11 min-w-[72px] cursor-pointer rounded-xl px-4 text-sm font-semibold transition-all duration-200 ${
                        on
                          ? "bg-ink text-mist"
                          : "bg-glow text-ink hover:bg-glow-deep"
                      }`}
                    >
                      {on ? "Added ✓" : "Add"}
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>

      {/* sticky mobile bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-fog bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          <div>
            <div className="font-display text-xl font-bold leading-none">{gbp(price * qty)}</div>
            {was && <s className="text-xs text-muted">{gbp(was * qty)}</s>}
          </div>
          <button onClick={add} disabled={pending} className={`${addBtn} flex-1`}>
            {pending ? "Adding..." : "Add to basket"}
          </button>
        </div>
      </div>

      {/* Zoom lightbox */}
      {zoom && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged image"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ink/90 p-4 backdrop-blur-xs"
          onClick={() => setZoom(false)}
        >
          <button
            onClick={() => setZoom(false)}
            className="absolute right-4 top-4 z-10 min-h-11 cursor-pointer rounded-xl bg-white px-4 text-sm font-semibold shadow-sm transition hover:bg-mist"
          >
            Close
          </button>
          <div
            className="aspect-[4/3] max-h-[75vh] w-full max-w-4xl overflow-hidden rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {renderSlide(slides[cur])}
          </div>
          <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSlide(Math.max(cur - 1, 0))}
              disabled={cur === 0}
              className="min-h-11 cursor-pointer rounded-xl bg-white px-5 text-sm font-semibold transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Previous
            </button>
            <button
              onClick={() => setSlide(Math.min(cur + 1, slides.length - 1))}
              disabled={cur === slides.length - 1}
              className="min-h-11 cursor-pointer rounded-xl bg-white px-5 text-sm font-semibold transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
