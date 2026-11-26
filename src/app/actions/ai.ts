"use server";

import { createClient } from "@/lib/supabase/server";

type DescribeResult =
  | { ok: true; title: string; description: string; colourName?: string; colourHex?: string }
  | { ok: false; error: string };

const GEMINI_MODELS = ["gemini-flash-lite-latest", "gemini-3.8-flash", "gemini-3.7-flash", "gemini-flash-latest"];

export async function describeProductPhoto(imageUrl: string): Promise<DescribeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Log in as a seller to use AI photo description." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "seller") return { ok: false, error: "Only seller accounts can use AI photo description." };

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error: "Missing GEMINI_API_KEY in .env. Get a free API key at https://aistudio.google.com/apikey and restart the server.",
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  if (!supabaseUrl || !imageUrl.startsWith(`${supabaseUrl}/storage/v1/object/public/product-images/`)) {
    return { ok: false, error: "Please upload the photo to your product gallery first." };
  }

  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return { ok: false, error: "Could not download the uploaded image for AI analysis." };

    const mimeType = imgRes.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    if (!mimeType.startsWith("image/")) return { ok: false, error: "Selected file is not a valid image." };

    const bytes = await imgRes.arrayBuffer();
    if (bytes.byteLength > 6 * 1024 * 1024) {
      return { ok: false, error: "Image is too large for AI description (max 6MB)." };
    }
    const base64 = Buffer.from(bytes).toString("base64");

    const prompt = [
      "You are helping a UK bedroom furniture seller list a product on a marketplace.",
      "Inspect this product photo and return ONLY valid JSON with these keys:",
      '- "title": concise UK product title including style and fabric colour (e.g. "Channel Divan Bed – Charcoal Velvet"), max 70 characters, NO brand names.',
      '- "description": warm, accurate 2-sentence product description covering visible headboard style, upholstery texture, base/storage drawers, and bedroom look. NO brand names or made-up prices.',
      '- "colourName": short colour/fabric name (e.g. "Charcoal Velvet").',
      '- "colourHex": 6-digit hex colour matching the fabric (e.g. "#4A4D52").',
    ].join("\n");

    let lastError = "Gemini API request failed.";
    let rawText = "";

    for (const model of GEMINI_MODELS) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { inlineData: { mimeType, data: base64 } },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.4,
            },
          }),
        }
      );

      const payload = (await res.json()) as {
        error?: { message?: string };
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };

      if (res.ok) {
        rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (rawText) break;
      }

      lastError = payload.error?.message || `Gemini API error (${res.status})`;
      // Retry on next fallback model for transient availability/rate/retired model errors
      if (![404, 429, 500, 503].includes(res.status)) {
        return { ok: false, error: lastError };
      }
    }

    if (!rawText) {
      return { ok: false, error: lastError };
    }

    const cleaned = rawText.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      title?: string;
      description?: string;
      colourName?: string;
      colourHex?: string;
    };

    if (!parsed.title || !parsed.description) {
      return { ok: false, error: "AI returned an incomplete description. Please try again." };
    }

    return {
      ok: true,
      title: parsed.title.trim(),
      description: parsed.description.trim(),
      colourName: parsed.colourName?.trim(),
      colourHex: parsed.colourHex?.trim(),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to analyse photo with AI." };
  }
}
