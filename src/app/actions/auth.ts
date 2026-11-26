"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string } | undefined;

const safeNext = (n: string) => (n.startsWith("/") && !n.startsWith("//") ? n : "/");

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: error.message };
  redirect(safeNext(String(formData.get("next") ?? "/")));
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const role = formData.get("role") === "seller" ? "seller" : "buyer";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    options: {
      data: {
        full_name: String(formData.get("full_name") ?? ""),
        shop_name: role === "seller" ? String(formData.get("shop_name") ?? "") : "",
        role,
      },
    },
  });
  if (error) {
    if (
      error.code === "over_email_send_rate_limit" ||
      error.message.toLowerCase().includes("rate limit")
    ) {
      return {
        error:
          "Email rate limit exceeded (Supabase's default mailer allows 2 emails/hour). Disable 'Confirm email' in Supabase Auth settings, or run supabase/seed.sql and log in with demo@hearth.com.",
      };
    }
    return { error: error.message };
  }
  if (!data.session) return { message: "Account created. Confirm your email, then log in." };
  redirect(safeNext(String(formData.get("next") ?? "/")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
