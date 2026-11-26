"use client";

import { useActionState } from "react";
import { placeOrder, type CheckoutState } from "@/app/actions/orders";

export default function CheckoutForm({ totalLabel }: { totalLabel: string }) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, undefined);
  const field = "h-12 w-full rounded-xl border border-fog bg-white px-4 text-base text-obsidian transition focus:border-ink";

  return (
    <form action={action} className="grid gap-4 rounded-2xl bg-white/95 p-5 shadow-xs ring-1 ring-fog sm:p-6">
      <h2 className="font-display text-xl font-bold">Delivery details</h2>
      <p className="text-xs text-muted">Demo checkout — no real payment is collected.</p>

      <label className="grid gap-1 text-sm font-medium">
        Full name
        <input name="shipping_name" required autoComplete="name" placeholder="Alex Rivera" className={field} />
      </label>

      <label className="grid gap-1 text-sm font-medium">
        Delivery address
        <textarea
          name="shipping_address"
          required
          rows={3}
          autoComplete="street-address"
          placeholder="14 Meadow Lane, Manchester, M1 4BT"
          className="w-full rounded-xl border border-fog bg-white p-3.5 text-base text-obsidian transition focus:border-ink"
        />
      </label>

      <label className="grid gap-1 text-sm font-medium">
        Phone (optional)
        <input name="shipping_phone" type="tel" autoComplete="tel" placeholder="07700 900123" className={field} />
      </label>

      {state?.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
          {state.error}
        </p>
      )}

      <button
        disabled={pending}
        className="min-h-12 cursor-pointer rounded-xl bg-glow px-6 font-bold text-obsidian shadow-xs transition hover:bg-glow-deep disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Placing order..." : `Place demo order · ${totalLabel}`}
      </button>
    </form>
  );
}
