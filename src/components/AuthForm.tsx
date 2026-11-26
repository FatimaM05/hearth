"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import BedArt from "@/components/BedArt";
import { signIn, signUp, type AuthState } from "@/app/actions/auth";

type DemoKind = "buyer" | "seller" | "admin";

const DEMOS: Record<DemoKind, { label: string; badge: string; email: string; hex: string; variant: number }> = {
  buyer: { label: "Buyer", badge: "Shop & track", email: "buyer@hearth.com", hex: "#b9bba8", variant: 0 },
  seller: { label: "Seller", badge: "Manage shop", email: "demo@hearth.com", hex: "#dcbc98", variant: 1 },
  admin: { label: "Admin", badge: "Moderate", email: "admin@hearth.com", hex: "#E8DEC6", variant: 4 },
};

export default function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === "login" ? signIn : signUp,
    undefined
  );
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [demo, setDemo] = useState<DemoKind | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const field =
    "h-12 w-full rounded-xl border border-fog bg-white px-4 text-base text-ink transition focus:border-ink";

  function fillDemo(kind: DemoKind) {
    setDemo(kind);
    setEmail(DEMOS[kind].email);
    setPassword("demo1234");
  }

  const activeKind: DemoKind = mode === "signup" ? role : demo ?? "buyer";
  const preview = DEMOS[activeKind];
  const isSellerView = activeKind === "seller";

  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup";

  return (
    <div className="animate-fade-up mx-auto grid max-w-5xl overflow-hidden rounded-3xl bg-white/95 shadow-sm ring-1 ring-fog backdrop-blur-md lg:grid-cols-[1.02fr_1fr]">
      {/* Left faceless aesthetic showcase panel */}
      <aside className="relative flex flex-col justify-between overflow-hidden bg-ink p-6 text-mist sm:p-8 lg:p-10">
        <div
          aria-hidden="true"
          className="animate-float-slow pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-glow/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="animate-float-reverse pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-white/6 blur-3xl"
        />

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-glow">
            <span className="size-1.5 rounded-full bg-glow" />
            {mode === "login"
              ? `Hearth · ${preview.label} Portal`
              : isSellerView
                ? "Hearth · Seller Studio"
                : "Hearth · Buyer Account"}
          </span>

          <h2 className="mt-4 font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            {mode === "login" ? (
              <>
                Sign in to <span className="text-glow">hearth.</span>
              </>
            ) : isSellerView ? (
              <>
                Launch your bed <span className="text-glow">storefront.</span>
              </>
            ) : (
              <>
                Build your bed, <span className="text-glow">your way.</span>
              </>
            )}
          </h2>

          <p className="mt-2 max-w-md text-sm leading-relaxed text-mist/75">
            {isSellerView
              ? "Add upholstered beds, configure fabric swatches and option pricing, and manage incoming buyer orders."
              : "Customise fabric swatches, divan sizes, storage drawers and headboards with live pricing."}
          </p>
        </div>

        {/* Faceless live bed visual card */}
        <div className="relative my-6 hidden overflow-hidden rounded-2xl bg-white/10 p-2 ring-1 ring-white/15 sm:block">
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl">
            <BedArt color={preview.hex} variant={preview.variant} className="h-full w-full transition-all duration-500" />
            <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 rounded-xl bg-ink/85 px-3.5 py-2 text-xs backdrop-blur-md">
              <span className="font-semibold text-mist">
                {isSellerView ? "Seller Hub · Live Product Controls" : "Prague Divan · Live Configurator"}
              </span>
              <span className="rounded-md bg-glow px-2 py-0.5 font-bold text-ink">{preview.label}</span>
            </div>
          </div>
        </div>

        <ul className="relative mt-4 grid gap-2 text-xs text-mist/85 sm:mt-0 sm:text-sm">
          {(isSellerView
            ? [
                "Create & edit products with custom swatch & size deltas",
                "Track incoming orders from New to Delivered",
                "Dedicated Seller Hub badge & storefront preview",
              ]
            : [
                "Save multiple custom bed builds in your basket",
                "Check out & follow order status updates",
                "Switch across 8+ fabrics with live price recalculation",
              ]
          ).map((point) => (
            <li key={point} className="flex items-center gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-glow/20 text-glow">
                <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.2 7.25a1 1 0 0 1-1.42 0l-3.3-3.32a1 1 0 1 1 1.42-1.41l2.59 2.606 6.49-6.534a1 1 0 0 1 1.414-.006Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </aside>

      {/* Right interactive form panel */}
      <form action={action} className="flex flex-col justify-center gap-4 p-6 sm:p-8 lg:p-10">
        {/* Sleek mode switcher */}
        <div className="grid grid-cols-2 rounded-xl bg-mist p-1 ring-1 ring-fog">
          <Link
            href={loginHref}
            className={`flex min-h-10 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold transition-all ${
              mode === "login" ? "bg-white text-ink shadow-xs" : "text-muted hover:text-ink"
            }`}
          >
            Log in
          </Link>
          <Link
            href={signupHref}
            className={`flex min-h-10 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold transition-all ${
              mode === "signup" ? "bg-white text-ink shadow-xs" : "text-muted hover:text-ink"
            }`}
          >
            Sign up
          </Link>
        </div>

        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {mode === "login"
              ? "Choose a quick demo account or enter your credentials."
              : "Pick Buyer or Seller below to tailor your Hearth experience."}
          </p>
        </div>

        <input type="hidden" name="next" value={next ?? "/"} />

        {mode === "login" && (
          <div className="rounded-2xl border border-fog bg-mist/60 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink">Quick demo accounts</span>
              <span className="text-muted">Password: demo1234</span>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(["buyer", "seller", "admin"] as const).map((k) => {
                const d = DEMOS[k];
                const on = demo === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => fillDemo(k)}
                    className={`flex min-h-12 cursor-pointer flex-col items-start justify-center rounded-xl border px-3 py-2 text-left transition-all ${
                      on
                        ? "border-ink bg-ink text-mist shadow-xs"
                        : "border-fog bg-white text-ink hover:border-muted"
                    }`}
                  >
                    <span className="flex w-full items-center justify-between text-xs font-bold">
                      {d.label}
                      <span className={`size-2 rounded-full ${on ? "bg-glow" : "bg-fog"}`} />
                    </span>
                    <span className={`mt-0.5 text-[11px] ${on ? "text-mist/75" : "text-muted"}`}>{d.badge}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mode === "signup" && (
          <>
            <fieldset className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <legend className="mb-1.5 text-sm font-medium text-muted">Account type</legend>
              {(
                [
                  { id: "buyer", title: "Buyer", desc: "Browse, configure & order" },
                  { id: "seller", title: "Seller", desc: "List beds & manage orders" },
                ] as const
              ).map((opt) => {
                const on = role === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={`flex min-h-16 cursor-pointer items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                      on
                        ? "border-ink bg-ink text-mist shadow-xs"
                        : "border-fog bg-white text-ink hover:border-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={opt.id}
                      checked={on}
                      onChange={() => setRole(opt.id)}
                      className="sr-only"
                    />
                    <span>
                      <span className="block text-sm font-bold">{opt.title}</span>
                      <span className={`block text-xs ${on ? "text-mist/75" : "text-muted"}`}>{opt.desc}</span>
                    </span>
                    <span className={`size-2.5 shrink-0 rounded-full ${on ? "bg-glow" : "bg-fog"}`} />
                  </label>
                );
              })}
            </fieldset>

            <label className="grid gap-1 text-sm font-medium">
              Full name
              <input name="full_name" required autoComplete="name" placeholder="Alex Rivera" className={field} />
            </label>

            {role === "seller" && (
              <label className="animate-fade-up grid gap-1 text-sm font-medium">
                Shop name
                <input name="shop_name" required placeholder="Hearth" className={field} />
              </label>
            )}
          </>
        )}

        <label className="grid gap-1 text-sm font-medium">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Password
          <div className="relative">
            <input
              name="password"
              type={showPw ? "text" : "password"}
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder={mode === "signup" ? "Minimum 6 characters" : "Enter your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${field} pr-16`}
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-2 top-1/2 min-h-9 -translate-y-1/2 cursor-pointer rounded-lg px-2.5 text-xs font-semibold text-muted transition hover:bg-mist hover:text-ink"
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        {state?.error || state?.message ? (
          <p
            aria-live="polite"
            className={`rounded-xl px-3.5 py-2.5 text-sm ${
              state?.error
                ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                : "bg-mist text-ink ring-1 ring-fog"
            }`}
          >
            {state?.error ?? state?.message}
          </p>
        ) : (
          <p aria-live="polite" className="min-h-1" />
        )}

        <button
          disabled={pending}
          className="min-h-12 cursor-pointer rounded-xl bg-glow px-5 font-semibold text-ink shadow-xs transition-all hover:bg-glow-deep active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending
            ? "One moment..."
            : mode === "login"
              ? "Log in to Hearth"
              : role === "seller"
                ? "Create seller account"
                : "Create buyer account"}
        </button>

        <p className="text-center text-sm text-muted">
          {mode === "login" ? (
            <>
              New to Hearth?{" "}
              <Link className="cursor-pointer font-semibold text-ink underline" href={signupHref}>
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already registered?{" "}
              <Link className="cursor-pointer font-semibold text-ink underline" href={loginHref}>
                Log in
              </Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
