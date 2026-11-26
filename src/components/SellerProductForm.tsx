"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { describeProductPhoto } from "@/app/actions/ai";
import {
  saveProduct,
  type SellerAddonInput,
  type SellerImageInput,
  type SellerOptionGroupInput,
} from "@/app/actions/seller";
import type { Category, ProductFull } from "@/lib/types";

const DEFAULT_GROUPS: SellerOptionGroupInput[] = [
  {
    name: "Colour",
    kind: "swatch",
    values: [{ label: "Cream Naples", priceDelta: 0, swatchHex: "#E8DEC6", isDefault: true }],
  },
  {
    name: "Size",
    kind: "choice",
    values: [{ label: "Small Single 2FT6", priceDelta: 90, swatchHex: "", isDefault: true }],
  },
  {
    name: "Storage",
    kind: "choice",
    values: [{ label: "No Storage", priceDelta: 0, swatchHex: "", isDefault: true }],
  },
  {
    name: "Headboard",
    kind: "choice",
    values: [{ label: 'FREE 26" Headboard', priceDelta: 0, swatchHex: "", isDefault: true }],
  },
  {
    name: "Base",
    kind: "choice",
    values: [{ label: "Standard Base (holds 50 stone)", priceDelta: 0, swatchHex: "", isDefault: true }],
  },
];

const PRAGUE_PRESET: {
  title: string;
  slug: string;
  description: string;
  basePrice: string;
  compareAtPrice: string;
  groups: SellerOptionGroupInput[];
  addons: SellerAddonInput[];
} = {
  title: "Prague Divan Bed – Cream Naples",
  slug: "prague-divan-bed",
  description:
    "A divan bed with a floor-standing channel headboard and a firm sprung base. Choose your fabric, size, storage and base strength, and add professional assembly if you want it set up for you.",
  basePrice: "269.99",
  compareAtPrice: "539.98",
  groups: [
    {
      name: "Colour",
      kind: "swatch",
      values: [
        { label: "Cream Naples", priceDelta: 0, swatchHex: "#E8DEC6", isDefault: true },
        { label: "Charcoal Coniston", priceDelta: 0, swatchHex: "#4A4D52", isDefault: false },
        { label: "Silver Plush Velvet", priceDelta: 0, swatchHex: "#B9BDC4", isDefault: false },
        { label: "Seal Grey Naples", priceDelta: 0, swatchHex: "#8C8F94", isDefault: false },
        { label: "Armour Coniston", priceDelta: 0, swatchHex: "#6F7378", isDefault: false },
        { label: "Black Plush Velvet", priceDelta: 0, swatchHex: "#1F2023", isDefault: false },
        { label: "Steel Plush Velvet", priceDelta: 0, swatchHex: "#6D7F96", isDefault: false },
        { label: "Pink Plush Velvet", priceDelta: 0, swatchHex: "#D9A3B5", isDefault: false },
      ],
    },
    {
      name: "Size",
      kind: "choice",
      values: [
        { label: "Small Single 2FT6", priceDelta: 90, swatchHex: "", isDefault: true },
        { label: "Single 3FT", priceDelta: 95, swatchHex: "", isDefault: false },
        { label: "Small Double 4FT", priceDelta: 100, swatchHex: "", isDefault: false },
        { label: "Double 4FT6", priceDelta: 110, swatchHex: "", isDefault: false },
        { label: "King 5FT", priceDelta: 125, swatchHex: "", isDefault: false },
        { label: "Super King 6FT", priceDelta: 150, swatchHex: "", isDefault: false },
      ],
    },
    {
      name: "Storage",
      kind: "choice",
      values: [
        { label: "No Storage", priceDelta: 0, swatchHex: "", isDefault: true },
        { label: "2 Drawers Left Side", priceDelta: 50, swatchHex: "", isDefault: false },
        { label: "2 Drawers Right Side", priceDelta: 45, swatchHex: "", isDefault: false },
        { label: "2 Drawers Foot End", priceDelta: 155, swatchHex: "", isDefault: false },
        { label: "4 Drawers", priceDelta: 210, swatchHex: "", isDefault: false },
      ],
    },
    {
      name: "Headboard",
      kind: "choice",
      values: [
        { label: 'FREE 26" Headboard', priceDelta: 0, swatchHex: "", isDefault: true },
        { label: '54" Floor Standing Headboard', priceDelta: 10, swatchHex: "", isDefault: false },
      ],
    },
    {
      name: "Base",
      kind: "choice",
      values: [
        { label: "Standard Base (holds 50 stone)", priceDelta: 0, swatchHex: "", isDefault: true },
        { label: "Reinforced Base (holds 100 stone)", priceDelta: 25, swatchHex: "", isDefault: false },
      ],
    },
  ],
  addons: [{ name: "Professional Assembly", price: 39.99 }],
};

export default function SellerProductForm({
  sellerId,
  categories,
  product,
}: {
  sellerId: string;
  categories: Category[];
  product?: ProductFull;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(product?.title ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? categories[0]?.id ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [basePrice, setBasePrice] = useState(product ? String(product.base_price) : "");
  const [compareAtPrice, setCompareAtPrice] = useState(
    product?.compare_at_price ? String(product.compare_at_price) : ""
  );
  const [status, setStatus] = useState<"active" | "hidden">(product?.status ?? "active");

  const initialGroups: SellerOptionGroupInput[] = useMemo(() => {
    if (!product?.option_groups?.length) return DEFAULT_GROUPS;
    return [...product.option_groups]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((g) => ({
        name: g.name,
        kind: g.kind,
        values: [...g.option_values]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((v) => ({
            label: v.label,
            priceDelta: Number(v.price_delta),
            swatchHex: v.swatch_hex ?? "#E8DEC6",
            isDefault: v.is_default,
          })),
      }));
  }, [product]);

  const initialAddons: SellerAddonInput[] = useMemo(() => {
    if (!product?.product_addons?.length) return [{ name: "Professional Assembly", price: 39.99 }];
    return [...product.product_addons]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((a) => ({ name: a.name, price: Number(a.price) }));
  }, [product]);

  const initialImages: SellerImageInput[] = useMemo(() => {
    if (!product?.product_images?.length) return [];
    const valLabelById = new Map(
      product.option_groups.flatMap((g) => g.option_values.map((v) => [v.id, v.label] as const))
    );
    return [...product.product_images]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => ({
        url: img.url,
        alt: img.alt ?? "",
        colourLabel: img.option_value_id ? (valLabelById.get(img.option_value_id) ?? "") : "",
      }));
  }, [product]);

  const [groups, setGroups] = useState<SellerOptionGroupInput[]>(initialGroups);
  const [addons, setAddons] = useState<SellerAddonInput[]>(initialAddons);
  const [images, setImages] = useState<SellerImageInput[]>(initialImages);

  const colourLabels = useMemo(
    () =>
      groups
        .filter((g) => g.kind === "swatch")
        .flatMap((g) => g.values.map((v) => v.label.trim()).filter(Boolean)),
    [groups]
  );

  function loadPraguePreset() {
    setTitle(PRAGUE_PRESET.title);
    setSlug(PRAGUE_PRESET.slug);
    setDescription(PRAGUE_PRESET.description);
    setBasePrice(PRAGUE_PRESET.basePrice);
    setCompareAtPrice(PRAGUE_PRESET.compareAtPrice);
    setGroups(PRAGUE_PRESET.groups);
    setAddons(PRAGUE_PRESET.addons);
  }

  async function onUploadFiles(files: FileList | null, targetColourLabel = "") {
    if (!files?.length) return;
    setError(null);
    setUploading(true);
    try {
      const supabase = createBrowserClient();
      const uploaded: SellerImageInput[] = [];
      for (const file of Array.from(files)) {
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${sellerId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${cleanName}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, file);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        uploaded.push({
          url: data.publicUrl,
          alt: targetColourLabel ? `${title || "Bed"} – ${targetColourLabel}` : title || file.name,
          colourLabel: targetColourLabel,
        });
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  }

  async function onDescribePhoto(url: string) {
    setError(null);
    setAiNote(null);
    setAiLoading(true);
    try {
      const res = await describeProductPhoto(url);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTitle(res.title);
      if (!slug.trim()) {
        setSlug(
          res.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
        );
      }
      setDescription(res.description);
      setAiNote(
        `AI filled title & description${res.colourName ? ` (detected colour: ${res.colourName})` : ""}. Review before publishing.`
      );
    } finally {
      setAiLoading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveProduct({
        productId: product?.id,
        title,
        slug,
        categoryId,
        description,
        basePrice: Number(basePrice),
        compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
        status,
        groups,
        addons,
        images,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/seller");
      router.refresh();
    });
  }

  const field = "h-11 w-full rounded-xl border border-fog bg-white px-3 text-sm text-obsidian transition focus:border-ink";

  return (
    <form onSubmit={submit} className="animate-fade-up space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/seller" className="cursor-pointer text-sm font-medium text-muted underline hover:text-ink">
            ← Back to Seller Hub
          </Link>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {product ? "Edit product" : "Add new product"}
          </h1>
        </div>
        {!product && (
          <button
            type="button"
            onClick={loadPraguePreset}
            className="min-h-11 cursor-pointer rounded-xl border border-fog bg-white px-4 text-xs font-semibold text-ink transition hover:border-ink"
          >
            Fill Prague Divan example
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      {/* Core details */}
      <section className="grid gap-4 rounded-2xl bg-white/95 p-5 shadow-xs ring-1 ring-fog sm:grid-cols-2 sm:p-6">
        <h2 className="font-display text-lg font-bold sm:col-span-2">Product details</h2>

        <label className="grid gap-1 text-sm font-medium">
          Title
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Prague Divan Bed – Cream Naples"
            className={field}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium">
          URL slug
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="prague-divan-bed"
            className={field}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Category
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={`${field} cursor-pointer`}>
            <option value="">Uncategorised</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Listing status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value === "hidden" ? "hidden" : "active")}
            className={`${field} cursor-pointer`}
          >
            <option value="active">Active (visible to buyers)</option>
            <option value="hidden">Hidden (draft)</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Base price (£)
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            placeholder="269.99"
            className={field}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Compare-at price (£)
          <input
            type="number"
            step="0.01"
            min="0"
            value={compareAtPrice}
            onChange={(e) => setCompareAtPrice(e.target.value)}
            placeholder="539.98"
            className={field}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium sm:col-span-2">
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span>Description</span>
            {images[0]?.url && (
              <button
                type="button"
                disabled={aiLoading}
                onClick={() => onDescribePhoto(images[0].url)}
                className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg bg-glow/40 px-3 text-xs font-bold text-obsidian transition hover:bg-glow disabled:cursor-not-allowed disabled:opacity-60"
              >
                {aiLoading ? "Analysing photo..." : "✨ Auto-fill title & description from photo"}
              </button>
            )}
          </span>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the headboard, divan base, fabric feel, and options..."
            className="w-full rounded-xl border border-fog bg-white p-3 text-sm text-obsidian transition focus:border-ink"
          />
          {aiNote && <span className="text-xs font-medium text-ink">{aiNote}</span>}
        </label>
      </section>

      {/* Gallery photos */}
      <section className="space-y-4 rounded-2xl bg-white/95 p-5 shadow-xs ring-1 ring-fog sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold">Product photos</h2>
            <p className="text-xs text-muted">
              Upload photos (stored in Supabase Storage) or leave empty to use the colour-tinted bed gallery.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {images[0]?.url && (
              <button
                type="button"
                disabled={aiLoading}
                onClick={() => onDescribePhoto(images[0].url)}
                className="min-h-11 cursor-pointer rounded-xl bg-glow px-4 text-xs font-bold text-obsidian transition hover:bg-glow-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                {aiLoading ? "Analysing..." : "✨ Describe photo with AI"}
              </button>
            )}
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-ink px-4 text-xs font-semibold text-mist transition hover:bg-ink/90">
              {uploading ? "Uploading..." : "+ Upload photos"}
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
                onChange={(e) => onUploadFiles(e.target.files)}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        {images.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((img, i) => (
              <li key={`${img.url}-${i}`} className="flex items-center gap-3 rounded-xl border border-fog bg-mist/40 p-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt} className="size-16 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <select
                    value={img.colourLabel}
                    onChange={(e) =>
                      setImages((prev) => prev.map((x, idx) => (idx === i ? { ...x, colourLabel: e.target.value } : x)))
                    }
                    className="h-9 w-full cursor-pointer rounded-lg border border-fog bg-white px-2 text-xs"
                  >
                    <option value="">All colours</option>
                    {colourLabels.map((lbl) => (
                      <option key={lbl} value={lbl}>
                        {lbl}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={aiLoading}
                      onClick={() => onDescribePhoto(img.url)}
                      className="cursor-pointer text-xs font-semibold text-ink underline disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      ✨ Describe
                    </button>
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      className="cursor-pointer text-xs font-semibold text-red-700 underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Dynamic Variation Option Groups */}
      <section className="space-y-4 rounded-2xl bg-white/95 p-5 shadow-xs ring-1 ring-fog sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold">Variation options & prices</h2>
            <p className="text-xs text-muted">
              Every option group, colour swatch, and extra price (£) entered here drives the buyer product page live.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setGroups((g) => [
                ...g,
                { name: "", kind: "choice", values: [{ label: "", priceDelta: 0, swatchHex: "#E8DEC6", isDefault: true }] },
              ])
            }
            className="min-h-10 cursor-pointer rounded-xl bg-ink px-4 text-xs font-semibold text-mist transition hover:bg-ink/90"
          >
            + Add option group
          </button>
        </div>

        <div className="space-y-4">
          {groups.map((grp, gi) => (
            <div key={gi} className="rounded-2xl border border-fog bg-mist/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={grp.name}
                  onChange={(e) =>
                    setGroups((prev) => prev.map((g, idx) => (idx === gi ? { ...g, name: e.target.value } : g)))
                  }
                  placeholder="Group name (e.g. Colour, Size, Storage)"
                  className="h-10 min-w-[180px] flex-1 rounded-xl border border-fog bg-white px-3 text-sm font-semibold"
                />
                <select
                  value={grp.kind}
                  onChange={(e) =>
                    setGroups((prev) =>
                      prev.map((g, idx) =>
                        idx === gi
                          ? { ...g, kind: e.target.value === "swatch" ? "swatch" : "choice" }
                          : g
                      )
                    )
                  }
                  className="h-10 cursor-pointer rounded-xl border border-fog bg-white px-3 text-xs font-semibold"
                >
                  <option value="swatch">Colour swatches</option>
                  <option value="choice">Choice cards</option>
                </select>
                {groups.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setGroups((prev) => prev.filter((_, idx) => idx !== gi))}
                    className="min-h-10 cursor-pointer rounded-xl px-3 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    Remove group
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {grp.values.map((val, vi) => {
                  const trimmedLabel = val.label.trim();
                  const colourImgs =
                    grp.kind === "swatch" && trimmedLabel
                      ? images.filter((img) => img.colourLabel.trim().toLowerCase() === trimmedLabel.toLowerCase())
                      : [];
                  const primaryColourImg = colourImgs[0];

                  return (
                    <div key={vi} className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-2.5 ring-1 ring-fog/80">
                      {grp.kind === "swatch" && (
                        <>
                          <input
                            type="color"
                            aria-label="Swatch colour"
                            value={val.swatchHex || "#E8DEC6"}
                            onChange={(e) =>
                              setGroups((prev) =>
                                prev.map((g, idx) =>
                                  idx === gi
                                    ? {
                                        ...g,
                                        values: g.values.map((v, vIdx) =>
                                          vIdx === vi ? { ...v, swatchHex: e.target.value } : v
                                        ),
                                      }
                                    : g
                                )
                              )
                            }
                            className="size-10 shrink-0 cursor-pointer rounded-lg border border-fog bg-white p-0.5"
                          />
                          {primaryColourImg ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={primaryColourImg.url}
                              alt={trimmedLabel}
                              className="size-10 shrink-0 rounded-lg object-cover ring-1 ring-fog"
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="grid size-10 shrink-0 place-items-center rounded-lg border border-dashed border-fog text-[10px] text-muted"
                            >
                              Img
                            </span>
                          )}
                        </>
                      )}
                      <input
                        value={val.label}
                        onChange={(e) => {
                          const oldLabel = val.label.trim().toLowerCase();
                          const nextLabel = e.target.value;
                          setGroups((prev) =>
                            prev.map((g, idx) =>
                              idx === gi
                                ? {
                                    ...g,
                                    values: g.values.map((v, vIdx) =>
                                      vIdx === vi ? { ...v, label: nextLabel } : v
                                    ),
                                  }
                                : g
                            )
                          );
                          if (grp.kind === "swatch" && oldLabel) {
                            setImages((prev) =>
                              prev.map((img) =>
                                img.colourLabel.trim().toLowerCase() === oldLabel
                                  ? { ...img, colourLabel: nextLabel.trim() }
                                  : img
                              )
                            );
                          }
                        }}
                        placeholder={grp.kind === "swatch" ? "e.g. Cream Naples" : "e.g. King 5FT"}
                        className="h-10 min-w-[150px] flex-1 rounded-lg border border-fog px-3 text-sm"
                      />
                      {grp.kind === "swatch" && (
                        <label
                          title={trimmedLabel ? `Upload real bed photo for ${trimmedLabel}` : "Enter colour name first"}
                          className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${
                            trimmedLabel
                              ? "cursor-pointer bg-mist text-ink ring-1 ring-fog hover:ring-ink"
                              : "cursor-not-allowed bg-mist/50 text-muted opacity-60"
                          }`}
                        >
                          {uploading
                            ? "Uploading..."
                            : colourImgs.length > 0
                              ? `+ Photo (${colourImgs.length})`
                              : "Upload photo"}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            disabled={uploading || !trimmedLabel}
                            onChange={(e) => onUploadFiles(e.target.files, trimmedLabel)}
                            className="sr-only"
                          />
                        </label>
                      )}
                      <label className="flex items-center gap-1.5 text-xs text-muted">
                        +£
                        <input
                          type="number"
                          step="0.01"
                          value={val.priceDelta}
                          onChange={(e) =>
                            setGroups((prev) =>
                              prev.map((g, idx) =>
                                idx === gi
                                  ? {
                                      ...g,
                                      values: g.values.map((v, vIdx) =>
                                        vIdx === vi ? { ...v, priceDelta: Number(e.target.value) } : v
                                      ),
                                    }
                                  : g
                              )
                            )
                          }
                          className="h-10 w-24 rounded-lg border border-fog px-2.5 text-sm text-obsidian"
                        />
                      </label>
                      <label className="flex cursor-pointer items-center gap-1.5 px-2 text-xs font-medium">
                        <input
                          type="radio"
                          name={`default-${gi}`}
                          checked={val.isDefault}
                          onChange={() =>
                            setGroups((prev) =>
                              prev.map((g, idx) =>
                                idx === gi
                                  ? {
                                      ...g,
                                      values: g.values.map((v, vIdx) => ({ ...v, isDefault: vIdx === vi })),
                                    }
                                  : g
                              )
                            )
                          }
                          className="size-4 cursor-pointer accent-ink"
                        />
                        Default
                      </label>
                      {grp.values.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setGroups((prev) =>
                              prev.map((g, idx) =>
                                idx === gi ? { ...g, values: g.values.filter((_, vIdx) => vIdx !== vi) } : g
                              )
                            )
                          }
                          className="min-h-9 cursor-pointer rounded-lg px-2.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() =>
                  setGroups((prev) =>
                    prev.map((g, idx) =>
                      idx === gi
                        ? {
                            ...g,
                            values: [
                              ...g.values,
                              { label: "", priceDelta: 0, swatchHex: "#dcbc98", isDefault: false },
                            ],
                          }
                        : g
                    )
                  )
                }
                className="min-h-9 cursor-pointer rounded-lg bg-white px-3 text-xs font-semibold text-ink ring-1 ring-fog transition hover:ring-ink"
              >
                + Add {grp.name || "option"} value
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Add-ons */}
      <section className="space-y-3 rounded-2xl bg-white/95 p-5 shadow-xs ring-1 ring-fog sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">Optional add-ons</h2>
          <button
            type="button"
            onClick={() => setAddons((a) => [...a, { name: "", price: 0 }])}
            className="min-h-9 cursor-pointer rounded-xl bg-white px-3 text-xs font-semibold text-ink ring-1 ring-fog hover:ring-ink"
          >
            + Add add-on
          </button>
        </div>
        {addons.map((a, ai) => (
          <div key={ai} className="flex flex-wrap items-center gap-2">
            <input
              value={a.name}
              onChange={(e) => setAddons((prev) => prev.map((x, idx) => (idx === ai ? { ...x, name: e.target.value } : x)))}
              placeholder="Professional Assembly"
              className="h-10 min-w-[200px] flex-1 rounded-xl border border-fog bg-white px-3 text-sm"
            />
            <label className="flex items-center gap-1.5 text-xs text-muted">
              £
              <input
                type="number"
                step="0.01"
                min="0"
                value={a.price}
                onChange={(e) =>
                  setAddons((prev) => prev.map((x, idx) => (idx === ai ? { ...x, price: Number(e.target.value) } : x)))
                }
                className="h-10 w-24 rounded-xl border border-fog bg-white px-2.5 text-sm text-obsidian"
              />
            </label>
            <button
              type="button"
              onClick={() => setAddons((prev) => prev.filter((_, idx) => idx !== ai))}
              className="min-h-10 cursor-pointer rounded-xl px-3 text-xs font-semibold text-red-700 hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        ))}
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 cursor-pointer rounded-xl bg-glow px-6 font-bold text-obsidian shadow-xs transition hover:bg-glow-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving..." : product ? "Save changes" : "Publish product"}
        </button>
        <Link
          href="/seller"
          className="inline-flex min-h-12 cursor-pointer items-center rounded-xl border border-fog bg-white px-5 text-sm font-semibold text-ink hover:border-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
