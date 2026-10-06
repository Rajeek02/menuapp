"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const redirectTo = new URL("/reset-password?type=recovery", configuredOrigin).toString();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      });

      if (resetError) {
        setError("We couldn't send the reset email. Please try again.");
        return;
      }

      setMessage("If an account exists for that email, a password reset link is on its way.");
      setEmail("");
    } catch {
      setError("We couldn't send the reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f2] px-4 py-10">
      <div className="panel w-full max-w-md overflow-hidden animate-[fadeIn_0.45s_ease-out]">
        <div className="border-b border-black/5 bg-[#111111] px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/10 text-sm font-semibold text-white">
              R
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-white/70">RASA</p>
              <p className="mt-1 text-lg font-medium tracking-[-0.04em]">Forgot your password?</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 p-6 sm:p-7">
          <p className="text-sm leading-6 text-[#5f5a56]">
            Enter your account email and we&apos;ll send you a link to reset your password.
          </p>

          <div>
            <label htmlFor="recovery-email" className="label block pb-2">Email</label>
            <input
              id="recovery-email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              placeholder="name@restaurant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
            />
          </div>

          {error && <p role="alert" className="rounded-[12px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="rounded-[12px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

          <button disabled={loading} className="primary-button w-full transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0">
            {loading ? "Please wait..." : "Send reset link"}
          </button>

          <div className="pt-1 text-center text-sm text-[#5f5a56]">
            <Link href="/login" className="font-medium text-[#111111] underline underline-offset-4">
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
