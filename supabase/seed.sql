-- Run in Supabase -> SQL Editor.
-- Creates the pre-confirmed demo seller account (demo@hearth.com / demo1234) with no confirmation email,
-- and adds the Prague Divan Bed exactly as listed in the test (prices as numbers).
do $$
declare s uuid; furn uuid; cat uuid; p uuid; g uuid;
begin
  select id into s from auth.users where email = 'demo@hearth.com' limit 1;

  if s is null then
    s := gen_random_uuid();
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      s,
      'authenticated',
      'authenticated',
      'demo@hearth.com',
      crypt('demo1234', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Demo Seller","shop_name":"Hearth","role":"seller"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      s,
      jsonb_build_object('sub', s::text, 'email', 'demo@hearth.com', 'email_verified', true, 'phone_verified', false),
      'email',
      s::text,
      now(),
      now(),
      now()
    );
  else
    update auth.users
    set email_confirmed_at = coalesce(email_confirmed_at, now())
    where id = s;
  end if;

  insert into public.profiles (id, full_name, shop_name, role)
  values (s, 'Demo Seller', 'Hearth', 'seller')
  on conflict (id) do update
    set full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
        shop_name = coalesce(nullif(public.profiles.shop_name, ''), excluded.shop_name),
        role = 'seller';

  insert into public.categories (name, slug) values ('Furniture', 'furniture') on conflict (slug) do nothing;
  select id into furn from public.categories where slug = 'furniture';
  insert into public.categories (name, slug, parent_id) values ('Divan Beds', 'divan-beds', furn) on conflict (slug) do nothing;
  select id into cat from public.categories where slug = 'divan-beds';

  if exists (select 1 from public.products where slug = 'prague-divan-bed') then
    return;
  end if;

  insert into public.products (seller_id, category_id, title, slug, description, base_price, compare_at_price)
  values (s, cat, 'Prague Divan Bed – Cream Naples', 'prague-divan-bed',
    'A divan bed with a floor-standing channel headboard and a firm sprung base. Choose your fabric, size, storage and base strength, and add professional assembly if you want it set up for you.',
    269.99, 539.98)
  returning id into p;

  insert into public.option_groups (product_id, name, kind, sort_order) values (p, 'Colour', 'swatch', 0) returning id into g;
  insert into public.option_values (group_id, label, price_delta, swatch_hex, sort_order, is_default) values
    (g, 'Cream Naples',        0, '#E8DEC6', 0, true),
    (g, 'Charcoal Coniston',   0, '#4A4D52', 1, false),
    (g, 'Silver Plush Velvet', 0, '#B9BDC4', 2, false),
    (g, 'Seal Grey Naples',    0, '#8C8F94', 3, false),
    (g, 'Armour Coniston',     0, '#6F7378', 4, false),
    (g, 'Black Plush Velvet',  0, '#1F2023', 5, false),
    (g, 'Steel Plush Velvet',  0, '#6D7F96', 6, false),
    (g, 'Pink Plush Velvet',   0, '#D9A3B5', 7, false);

  insert into public.option_groups (product_id, name, kind, sort_order) values (p, 'Size', 'choice', 1) returning id into g;
  insert into public.option_values (group_id, label, price_delta, sort_order, is_default) values
    (g, 'Small Single 2FT6', 90, 0, true),
    (g, 'Single 3FT',        95, 1, false),
    (g, 'Small Double 4FT', 100, 2, false),
    (g, 'Double 4FT6',      110, 3, false),
    (g, 'King 5FT',         125, 4, false),
    (g, 'Super King 6FT',   150, 5, false);

  insert into public.option_groups (product_id, name, kind, sort_order) values (p, 'Storage', 'choice', 2) returning id into g;
  insert into public.option_values (group_id, label, price_delta, sort_order, is_default) values
    (g, 'No Storage',            0, 0, true),
    (g, '2 Drawers Left Side',  50, 1, false),
    (g, '2 Drawers Right Side', 45, 2, false),
    (g, '2 Drawers Foot End',  155, 3, false),
    (g, '4 Drawers',           210, 4, false);

  insert into public.option_groups (product_id, name, kind, sort_order) values (p, 'Headboard', 'choice', 3) returning id into g;
  insert into public.option_values (group_id, label, price_delta, sort_order, is_default) values
    (g, 'FREE 26" Headboard',             0, 0, true),
    (g, '54" Floor Standing Headboard',  10, 1, false);

  insert into public.option_groups (product_id, name, kind, sort_order) values (p, 'Base', 'choice', 4) returning id into g;
  insert into public.option_values (group_id, label, price_delta, sort_order, is_default) values
    (g, 'Standard Base (holds 50 stone)',    0, 0, true),
    (g, 'Reinforced Base (holds 100 stone)', 25, 1, false);

  insert into public.product_addons (product_id, name, price, sort_order) values (p, 'Professional Assembly', 39.99, 0);
end $$;
