"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (!profile) {
      setError("Your account is not set up yet. Please contact support.");
      setLoading(false);
      return;
    }

    router.replace(profile.role === "super_admin" ? "/admin" : "/dashboard");
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
              <p className="mt-1 text-lg font-medium tracking-[-0.04em]">Welcome back</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 p-6 sm:p-7">
          <p className="text-sm text-[#5f5a56]">Sign in to manage your cafe menu.</p>

          <div>
            <label className="label block pb-2">Email</label>
            <input
              type="email"
              required
              placeholder="name@restaurant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label className="label block pb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field pr-12"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[12px] text-[#6b625d] transition-colors hover:text-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/20"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.8} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.8} />}
              </button>
            </div>
            <div className="mt-2 text-right">
              <Link href="/forgot-password" className="text-sm font-medium text-[#111111] underline underline-offset-4">
                Forgot password?
              </Link>
            </div>
          </div>

          {error && <p className="rounded-[12px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button disabled={loading} className="primary-button w-full transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0">
            {loading ? "Please wait..." : "Sign in"}
          </button>

          <div className="pt-2 text-center text-sm text-[#5f5a56]">
            Need a login? <Link href="/" className="font-medium text-[#111111] underline underline-offset-4">Back home</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
