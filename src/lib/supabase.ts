import { createBrowserClient } from "@supabase/ssr";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabase =
  url && key
    ? createBrowserClient(url, key, {
        cookieOptions: {
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        },
      })
    : null;
