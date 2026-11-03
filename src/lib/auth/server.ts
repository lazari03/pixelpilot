import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
export async function requireUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) redirect("/login");
  const jar = await cookies();
  const client = createServerClient(url, key, {
    cookieOptions: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (items) => {
        try {
          items.forEach(({ name, value, options }) =>
            jar.set(name, value, options),
          );
        } catch {
          /* Proxy refreshes server-rendered sessions. */
        }
      },
    },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect("/login");
  return data.user;
}
