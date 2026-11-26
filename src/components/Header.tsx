import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";

const link =
  "inline-flex min-h-11 cursor-pointer items-center whitespace-nowrap rounded-lg px-2.5 text-sm font-medium transition-colors hover:bg-white/10 sm:px-3";

async function HeaderNav() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: "buyer" | "seller" | "admin" | null = null;
  let displayName = "";
  let count = 0;
  if (user) {
    const [profile, cart] = await Promise.all([
      supabase.from("profiles").select("role, full_name, shop_name").eq("id", user.id).maybeSingle(),
      supabase.from("cart_items").select("quantity").eq("user_id", user.id),
    ]);
    const r = profile.data?.role;
    role = r === "seller" || r === "admin" ? r : "buyer";
    displayName =
      role === "seller"
        ? profile.data?.shop_name || profile.data?.full_name || "Seller"
        : profile.data?.full_name || user.email?.split("@")[0] || "Account";
    count = ((cart.data ?? []) as { quantity: number }[]).reduce((n, i) => n + i.quantity, 0);
  }

  return (
    <nav className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
      {user && role && (
        <span
          title={`Signed in as ${role}`}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${
            role === "seller"
              ? "bg-glow text-ink"
              : role === "admin"
                ? "bg-white text-ink"
                : "bg-white/12 text-mist ring-1 ring-white/20"
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${
              role === "seller" || role === "admin" ? "bg-ink" : "bg-glow"
            }`}
          />
          <span className="uppercase tracking-wider text-[10px] opacity-80">{role}</span>
          <span aria-hidden="true">·</span>
          <span className="max-w-[110px] truncate">{displayName}</span>
        </span>
      )}

      {role === "seller" && (
        <Link href="/seller" className={link}>
          Seller Hub
        </Link>
      )}
      {role === "admin" && (
        <Link href="/admin" className={link}>
          Admin
        </Link>
      )}
      {user && role !== "seller" && role !== "admin" && (
        <Link href="/orders" className={link}>
          Orders
        </Link>
      )}
      {!user && (
        <>
          <Link href="/login" className={link}>
            Log in
          </Link>
          <Link href="/signup" className={link}>
            Sign up
          </Link>
        </>
      )}
      <Link href="/cart" className={link}>
        Basket
        {count > 0 && (
          <span className="ml-1.5 grid min-w-5 place-items-center rounded-full bg-glow px-1.5 text-xs font-bold text-ink">
            {count}
          </span>
        )}
      </Link>
      {user && (
        <form action={signOut}>
          <button className={link}>Log out</button>
        </form>
      )}
    </nav>
  );
}

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-fog/20 bg-obsidian/95 text-mist backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6">
        <Link
          href="/"
          className="cursor-pointer font-display text-2xl font-bold tracking-tight transition-opacity hover:opacity-90"
        >
          hearth<span className="text-glow">.</span>
        </Link>

        <form action="/" role="search" className="order-last w-full md:order-none md:max-w-md md:flex-1">
          <label htmlFor="q" className="sr-only">
            Search products
          </label>
          <input
            id="q"
            name="q"
            type="search"
            placeholder="Search beds, colours, sizes"
            className="h-11 w-full rounded-xl border-0 bg-white/10 px-4 text-sm text-mist placeholder:text-mist/60 focus:bg-white focus:text-ink"
          />
        </form>

        <Suspense fallback={<nav className="ml-auto flex min-h-11 items-center" aria-hidden="true" />}>
          <HeaderNav />
        </Suspense>
      </div>
    </header>
  );
}
