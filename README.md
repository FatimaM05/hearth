# Hearth — Mini Multi-Vendor Marketplace (Web + PWA)

A mobile-first multi-vendor furniture marketplace built with **Next.js 16 (App Router)**, **Tailwind CSS v4**, and **Supabase** (Auth, Postgres with RLS, and Storage), sharing one backend across web and installable PWA.

> **Live Web & PWA Link:** 

---

## How to Run Locally

### Prerequisites
- Node.js 20+
- A Supabase project ([supabase.com](https://supabase.com))
- *(Optional, for the AI photo description button)* A free Google AI Studio API key ([aistudio.google.com/apikey](https://aistudio.google.com/apikey))

### Setup Steps
1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**  
   Copy `.env.example` to `.env` (or `.env.local`) and fill in your values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
   # Optional: enables "Describe photo with AI" in Seller Hub
   GEMINI_API_KEY=your-google-ai-studio-api-key
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

4. **Production build check:**
   ```bash
   npm run lint
   npm run build
   npm run start
   ```

---

## 3. Supabase Database Setup (`schema.sql` + `seed.sql`)

1. Open your **Supabase Dashboard -> SQL Editor**.
2. Paste and run the entire [`supabase/schema.sql`](supabase/schema.sql) file once.  
   This creates all tables, triggers (`handle_new_user`), column-level `GRANT`/`REVOKE` rules, table privileges for `anon` and `authenticated`, RLS policies, admin RPCs (`admin_set_seller_active`, `admin_set_product_hidden`), and the `product-images` Storage bucket.
3. Paste and run the entire [`supabase/seed.sql`](supabase/seed.sql) file once.  
   This creates the pre-confirmed **Seller**, **Buyer**, and **Admin** test accounts (no confirmation email needed) and seeds the `Furniture > Divan Beds` category plus the **Prague Divan Bed – Cream Naples** (`£269.99` base / `£539.98` compare-at) with all 5 option groups and `Professional Assembly` (`£39.99`).

*(Optional for public `/signup` testing: disable **Confirm email** under **Authentication -> Sign In / Providers -> Email** in Supabase Dashboard so new signups don't hit Supabase's 2 emails/hour default mailer limit.)*

---

## 4. Test Accounts

All seeded accounts are pre-confirmed and also available as one-click demo buttons on `/login`:

| Role | Email | Password | What to test |
| :--- | :--- | :--- | :--- |
| **Buyer** | `buyer@hearth.com` | `demo1234` | Browse/filter beds, choose swatches & options, add combinations to `/cart`, complete `/checkout`, view `/orders` & status banner |
| **Seller** | `demo@hearth.com` | `demo1234` | Open `/seller`, add/edit beds on `/seller/new` or `/seller/[id]`, upload per-colour photos, use **Describe photo with AI**, update incoming order statuses (`New -> Confirmed -> Shipped -> Delivered`) |
| **Admin** | `admin@hearth.com` | `demo1234` | Open `/admin`, approve/pause seller accounts and show/hide listings |

---

## 5. Installable PWA Guide (Android & iPhone)

Hearth is an installable Progressive Web App (`/manifest.webmanifest`, `public/sw.js`, and Hearth app icons in `public/`) using the exact same Supabase backend as the web app. It includes all 5 required screens: Home/Search (`/`), Product Configurator (`/products/[slug]`), Basket (`/cart`), Buyer Orders (`/orders` with an order-status-changed notification banner), and Login (`/login`).

> **Note:** Home-screen installation requires serving over **HTTPS** (such as your Vercel/Netlify URL) or `localhost`.

### Android (Chrome / Edge)
1. Open the live Hearth URL in **Chrome** on your Android phone.
2. Tap the **Install Hearth app** prompt at the bottom of the screen (or tap the browser **`⋮` menu -> Add to Home screen / Install app**).
3. Confirm **Install**. Hearth appears on your home screen with its own icon and opens full-screen (`standalone` mode).

### iPhone / iPad (Safari)
1. Open the live Hearth URL in **Safari** on iOS (Safari is required for iOS Add to Home Screen).
2. Tap the **Share** button (square with upward arrow) at the bottom/top toolbar.
3. Scroll down and tap **Add to Home Screen**, then tap **Add**.
4. Launch **Hearth** from your home screen to use it full-screen.

---