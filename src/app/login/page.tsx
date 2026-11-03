"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { LanguagePicker, useLocale } from "@/i18n/LocaleProvider";
export default function Login() {
  const { t } = useLocale();
  const [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
  return (
    <main className="login-wrap">
      <form
        className="card login"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!supabase) return;
          setBusy(true);
          setError(false);
          try {
            const form = new FormData(e.currentTarget);
            const { error } = await supabase.auth.signInWithPassword({
              email: String(form.get("email")),
              password: String(form.get("password")),
            });
            if (error) setError(true);
            else window.location.assign("/");
          } catch {
            setError(true);
          } finally {
            setBusy(false);
          }
        }}
      >
        <LanguagePicker />
        <div className="robot">🤖</div>
        <h1>{t("welcome")}</h1>
        <p>{t("loginHelp")}</p>
        <label>
          {t("email")}
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          {t("password")}
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={8}
            required
          />
        </label>
        <button className="primary full" disabled={!supabase || busy}>
          {busy ? t("loading") : t("login")}
        </button>
        <p role="status">
          {error ? t("loginError") : !supabase ? t("setup") : t("tagline")}
        </p>
      </form>
    </main>
  );
}
