"use client";
import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
export default function Login() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="login-wrap">
      <form
        className="card login"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!supabase) return;
          setBusy(true);
          const f = new FormData(e.currentTarget);
          const { error } = await supabase.auth.signInWithPassword({
            email: String(f.get("email")),
            password: String(f.get("password")),
          });
          setBusy(false);
          if (error)
            setMessage(
              "Sign-in did not work. Check your details or ask your teacher.",
            );
          else window.location.assign("/");
        }}
      >
        <div className="robot">🤖</div>
        <h1>Welcome, creator.</h1>
        <p className="muted">Use the account your teacher gave you.</p>
        <label>
          Account email
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Passphrase
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
          />
        </label>
        <button className="primary full" disabled={busy || !supabase}>
          {busy ? "Signing in…" : "Enter Creator Lab →"}
        </button>
        <p role="status">
          {message ||
            (!supabase
              ? "Classroom login will be available once Supabase is configured."
              : "Need help? Ask your teacher to reset your passphrase.")}
        </p>
        <Link href="/">Explore the practice demo</Link>
      </form>
    </main>
  );
}
