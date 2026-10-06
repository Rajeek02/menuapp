"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

const RECOVERY_MARKER = "rasa-password-recovery";
const INVALID_LINK_MESSAGE =
  "This password reset link is invalid or has expired. Please request a new reset link.";

function isStrongPassword(password) {
  return (
    password.length >= 12 &&
    password.length <= 128 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetCode = searchParams.get("code");
  const resetType = searchParams.get("type");
  const exchangeAttempt = useRef(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState({ new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const { data: subscriptionData } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        window.sessionStorage.setItem(RECOVERY_MARKER, session.user.id);
        if (!cancelled) {
          setError("");
          setSessionReady(true);
        }
      } else if (event === "SIGNED_OUT") {
        window.sessionStorage.removeItem(RECOVERY_MARKER);
      }
    });
    const subscription = subscriptionData.subscription;

    async function prepareRecoverySession() {
      try {
        if (resetCode) {
          if (exchangeAttempt.current?.code !== resetCode) {
            exchangeAttempt.current = {
              code: resetCode,
              promise: supabase.auth.exchangeCodeForSession(resetCode),
            };
          }
          const { error: exchangeError } = await exchangeAttempt.current.promise;
          if (exchangeError) {
            if (!cancelled) setError(INVALID_LINK_MESSAGE);
            return;
          }
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (sessionError || !session) {
          if (!cancelled) setError(INVALID_LINK_MESSAGE);
          return;
        }

        let recoveryEventSeen =
          window.sessionStorage.getItem(RECOVERY_MARKER) === session.user.id;
        if (!recoveryEventSeen && sessionStorageForRecovery(resetType)) {
          window.sessionStorage.setItem(RECOVERY_MARKER, session.user.id);
          recoveryEventSeen = true;
        }
        if (!recoveryEventSeen) {
          if (!cancelled) setError(INVALID_LINK_MESSAGE);
          return;
        }

        if (!cancelled) {
          window.sessionStorage.setItem(RECOVERY_MARKER, session.user.id);
          setSessionReady(true);
          setError("");
        }
      } catch {
        if (!cancelled) setError(INVALID_LINK_MESSAGE);
      } finally {
        subscription.unsubscribe();
      }
    }

    prepareRecoverySession();
    return () => {
      cancelled = true;
    };
  }, [resetCode, resetType]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!newPassword || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setError("Please choose a stronger password.");
      return;
    }
    if (!sessionReady) {
      setSessionReady(false);
      setError(INVALID_LINK_MESSAGE);
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (
        sessionError ||
        !sessionData.session ||
        window.sessionStorage.getItem(RECOVERY_MARKER) !== sessionData.session.user.id
      ) {
        setSessionReady(false);
        setError(INVALID_LINK_MESSAGE);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        const errorCode = String(updateError.code || "").toLowerCase();
        setError(errorCode.includes("weak_password") ? "Please choose a stronger password." : "Password could not be updated. Please try again.");
        return;
      }

      window.sessionStorage.removeItem(RECOVERY_MARKER);
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswords({ new: false, confirm: false });
      setSuccess(true);
    } catch {
      setError("Password could not be updated. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f2] px-4 py-10">
        <div className="panel w-full max-w-md p-6 text-center animate-[fadeIn_0.45s_ease-out]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eaf7f1] text-2xl text-[#1f7a58]" aria-hidden="true">
            ✓
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-[-0.06em] text-[#111111]">Password updated successfully.</h1>
          <p className="mt-3 text-sm leading-6 text-[#5f5a56]">You can now sign in with your new password.</p>
          <button onClick={() => router.replace("/login")} className="primary-button mt-6 w-full">
            Back to login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f2] px-4 py-10">
      <div className="panel w-full max-w-md overflow-hidden animate-[fadeIn_0.45s_ease-out]">
        <div className="border-b border-black/5 bg-[#111111] px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold text-white">R</div>
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-white/70">RASA</p>
              <p className="mt-1 text-lg font-medium tracking-[-0.04em]">Create a new password</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6 sm:p-7">
          {!sessionReady && !error && <p className="text-sm text-[#5f5a56]">Verifying your secure reset link...</p>}
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">{error}</p>}

          {[
            { key: "new", label: "New Password", value: newPassword, change: setNewPassword },
            { key: "confirm", label: "Confirm New Password", value: confirmPassword, change: setConfirmPassword },
          ].map((field) => (
            <div key={field.key}>
              <label htmlFor={`reset-${field.key}`} className="label mb-2 block">{field.label}</label>
              <div className="relative">
                <input
                  id={`reset-${field.key}`}
                  type={showPasswords[field.key] ? "text" : "password"}
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  value={field.value}
                  onChange={(event) => field.change(event.target.value)}
                  className="field pr-12"
                  placeholder={field.key === "new" ? "At least 12 characters" : "Enter your new password again"}
                  disabled={!sessionReady || loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((current) => ({ ...current, [field.key]: !current[field.key] }))}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-[#6b625d] transition-colors hover:text-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/20 disabled:cursor-not-allowed"
                  aria-label={`${showPasswords[field.key] ? "Hide" : "Show"} ${field.label.toLowerCase()}`}
                  aria-pressed={showPasswords[field.key]}
                  disabled={!sessionReady || loading}
                >
                  {showPasswords[field.key] ? <EyeOff className="h-4.5 w-4.5" strokeWidth={1.8} /> : <Eye className="h-4.5 w-4.5" strokeWidth={1.8} />}
                </button>
              </div>
            </div>
          ))}

          <p className="text-xs leading-5 text-[#6b625d]">Use at least 12 characters, with uppercase and lowercase letters, a number, and a symbol.</p>

          <button disabled={loading || !sessionReady} className="primary-button w-full transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Updating password..." : "Update Password"}
          </button>

          <div className="pt-1 text-center text-sm text-[#5f5a56]">
            <Link href="/login" className="font-medium text-[#111111] underline underline-offset-4">Back to login</Link>
            {error === INVALID_LINK_MESSAGE && (
              <>
                {" · "}
                <Link href="/forgot-password" className="font-medium text-[#111111] underline underline-offset-4">Request a new link</Link>
              </>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}

function sessionStorageForRecovery(resetType) {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return resetType === "recovery" || hash.get("type") === "recovery";
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#f5f5f2] px-4 py-10"><div className="panel w-full max-w-md p-6"><div className="animate-pulse space-y-4"><div className="h-3 w-24 rounded-full bg-[#eae7e3]" /><div className="h-8 w-2/3 rounded-full bg-[#f0eeeb]" /><div className="h-3 w-full rounded-full bg-[#f0eeeb]" /></div></div></main>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
