"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signIn, signUp, type AuthState } from "@/app/actions/auth";

export default function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === "login" ? signIn : signUp,
    undefined
  );
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const field = "h-12 w-full rounded-xl border border-fog bg-white px-4 text-base";

  return (
    <form action={action} className="mx-auto grid w-full max-w-md gap-4 rounded-2xl bg-white p-5 ring-1 ring-fog sm:p-6">
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
        {mode === "login" ? "Welcome back" : "Create your account"}
      </h1>
      <input type="hidden" name="next" value={next ?? "/"} />

      {mode === "signup" && (
        <>
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="mb-1 text-sm text-muted">I want to</legend>
            {(["buyer", "seller"] as const).map((r) => (
              <label
                key={r}
                className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold ${
                  role === r ? "border-ink bg-ink text-mist" : "border-fog bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={role === r}
                  onChange={() => setRole(r)}
                  className="sr-only"
                />
                {r === "buyer" ? "Buy beds" : "Sell beds"}
              </label>
            ))}
          </fieldset>
          <label className="grid gap-1 text-sm">
            Full name
            <input name="full_name" required autoComplete="name" className={field} />
          </label>
          {role === "seller" && (
            <label className="grid gap-1 text-sm">
              Shop name
              <input name="shop_name" required placeholder="Demo Seller" className={field} />
            </label>
          )}
        </>
      )}

      <label className="grid gap-1 text-sm">
        Email
        <input name="email" type="email" required autoComplete="email" className={field} />
      </label>
      <label className="grid gap-1 text-sm">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className={field}
        />
      </label>

      <p aria-live="polite" className={`min-h-5 text-sm ${state?.error ? "text-red-700" : "text-muted"}`}>
        {state?.error ?? state?.message}
      </p>

      <button
        disabled={pending}
        className="min-h-12 cursor-pointer rounded-xl bg-glow px-5 font-semibold text-ink hover:bg-glow-deep disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "One moment" : mode === "login" ? "Log in" : "Create account"}
      </button>

      <p className="text-sm text-muted">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link className="cursor-pointer font-semibold text-ink underline" href="/signup">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already registered?{" "}
            <Link className="cursor-pointer font-semibold text-ink underline" href="/login">
              Log in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
