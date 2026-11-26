-- HEARTH marketplace: run this whole file once in Supabase -> SQL Editor.
create extension if not exists pgcrypto;

-- PROFILES -------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  shop_name text,
  role text not null default 'buyer' check (role in ('buyer','seller','admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_seller() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'seller' and is_active);
$$;

create or replace function public.seller_active(sid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = sid and role = 'seller' and is_active);
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, shop_name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'shop_name',
    case when new.raw_user_meta_data->>'role' = 'seller' then 'seller' else 'buyer' end
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- CATALOGUE ------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  slug text not null unique,
  description text,
  base_price numeric(10,2) not null check (base_price >= 0),
  compare_at_price numeric(10,2) check (compare_at_price >= 0),
  status text not null default 'active' check (status in ('active','hidden')),
  admin_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  kind text not null default 'choice' check (kind in ('swatch','choice')),
  sort_order int not null default 0
);

create table public.option_values (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.option_groups(id) on delete cascade,
  label text not null,
  price_delta numeric(10,2) not null default 0,
  swatch_hex text,
  sort_order int not null default 0,
  is_default boolean not null default false
);

create table public.product_addons (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  sort_order int not null default 0
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  option_value_id uuid references public.option_values(id) on delete set null,
  url text not null,
  alt text,
  sort_order int not null default 0
);

-- CART AND ORDERS ------------------------------------------------------
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null check (quantity > 0),
  option_value_ids uuid[] not null,
  addon_ids uuid[] not null default '{}',
  combo_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, combo_key)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id),
  total numeric(10,2) not null,
  shipping_name text not null,
  shipping_address text not null,
  shipping_phone text,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id),
  seller_id uuid not null references public.profiles(id),
  product_id uuid references public.products(id) on delete set null,
  title text not null,
  selections jsonb not null default '[]',
  addons jsonb not null default '[]',
  swatch_hex text,
  unit_price numeric(10,2) not null,
  quantity int not null check (quantity > 0),
  status text not null default 'new' check (status in ('new','confirmed','shipped','delivered')),
  updated_at timestamptz not null default now()
);

-- Only these columns may be edited by normal users (admin-only fields stay locked)
revoke update on public.profiles from authenticated;
grant update (full_name, shop_name) on public.profiles to authenticated;
revoke update on public.products from authenticated;
grant update (category_id, title, slug, description, base_price, compare_at_price, status) on public.products to authenticated;
revoke update on public.order_items from authenticated;
grant update (status, updated_at) on public.order_items to authenticated;

-- ADMIN HELPERS (security definer, role-checked) ------------------------
create or replace function public.admin_set_seller_active(uid uuid, active boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update public.profiles set is_active = active where id = uid and role = 'seller';
end $$;

create or replace function public.admin_set_product_hidden(pid uuid, hidden boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update public.products set admin_hidden = hidden where id = pid;
end $$;

-- ROW LEVEL SECURITY ---------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.option_groups enable row level security;
alter table public.option_values enable row level security;
alter table public.product_addons enable row level security;
alter table public.product_images enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "profiles: own, sellers, admin" on public.profiles for select
  using (id = auth.uid() or role = 'seller' or public.is_admin());
create policy "profiles: update own" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

create policy "categories: public read" on public.categories for select using (true);
create policy "categories: admin write" on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

create policy "products: visible" on public.products for select
  using ((status = 'active' and not admin_hidden and public.seller_active(seller_id))
         or seller_id = auth.uid() or public.is_admin());
create policy "products: seller insert" on public.products for insert
  with check (seller_id = auth.uid() and public.is_seller());
create policy "products: seller update" on public.products for update
  using (seller_id = auth.uid()) with check (seller_id = auth.uid());
create policy "products: seller delete" on public.products for delete
  using (seller_id = auth.uid());

-- child tables: public read, owner (seller of the product) write
create policy "option_groups: read" on public.option_groups for select using (true);
create policy "option_groups: owner write" on public.option_groups for all to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.seller_id = auth.uid()))
  with check (exists (select 1 from public.products p where p.id = product_id and p.seller_id = auth.uid()));

create policy "option_values: read" on public.option_values for select using (true);
create policy "option_values: owner write" on public.option_values for all to authenticated
  using (exists (select 1 from public.option_groups g join public.products p on p.id = g.product_id
                 where g.id = group_id and p.seller_id = auth.uid()))
  with check (exists (select 1 from public.option_groups g join public.products p on p.id = g.product_id
                      where g.id = group_id and p.seller_id = auth.uid()));

create policy "product_addons: read" on public.product_addons for select using (true);
create policy "product_addons: owner write" on public.product_addons for all to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.seller_id = auth.uid()))
  with check (exists (select 1 from public.products p where p.id = product_id and p.seller_id = auth.uid()));

create policy "product_images: read" on public.product_images for select using (true);
create policy "product_images: owner write" on public.product_images for all to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.seller_id = auth.uid()))
  with check (exists (select 1 from public.products p where p.id = product_id and p.seller_id = auth.uid()));

create policy "cart: own" on public.cart_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "orders: buyer, seller, admin read" on public.orders for select to authenticated
  using (buyer_id = auth.uid() or public.is_admin()
         or exists (select 1 from public.order_items oi where oi.order_id = orders.id and oi.seller_id = auth.uid()));
create policy "orders: buyer insert" on public.orders for insert to authenticated
  with check (buyer_id = auth.uid());

create policy "order_items: read" on public.order_items for select to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin());
create policy "order_items: buyer insert" on public.order_items for insert to authenticated
  with check (buyer_id = auth.uid());
create policy "order_items: seller update status" on public.order_items for update to authenticated
  using (seller_id = auth.uid() or public.is_admin());

-- STORAGE (product photos) ---------------------------------------------
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product images: public read" on storage.objects for select
  using (bucket_id = 'product-images');
create policy "product images: seller upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "product images: seller update" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "product images: seller delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
