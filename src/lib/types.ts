export type OptionValue = {
  id: string;
  group_id: string;
  label: string;
  price_delta: number;
  swatch_hex: string | null;
  sort_order: number;
  is_default: boolean;
};

export type OptionGroup = {
  id: string;
  product_id: string;
  name: string;
  kind: "swatch" | "choice";
  sort_order: number;
  option_values: OptionValue[];
};

export type Addon = { id: string; product_id: string; name: string; price: number; sort_order: number };

export type ProductImage = {
  id: string;
  product_id: string;
  option_value_id: string | null;
  url: string;
  alt: string | null;
  sort_order: number;
};

export type Category = { id: string; parent_id: string | null; name: string; slug: string };

export type Product = {
  id: string;
  seller_id: string;
  category_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  base_price: number;
  compare_at_price: number | null;
  status: "active" | "hidden";
  admin_hidden: boolean;
  created_at: string;
};

export type ProductFull = Product & {
  option_groups: OptionGroup[];
  product_addons: Addon[];
  product_images: ProductImage[];
  categories: { name: string; slug: string } | null;
};
