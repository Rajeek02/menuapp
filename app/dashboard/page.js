"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageSquareText, Settings as SettingsIcon } from "lucide-react";
import { useProfile, logout } from "@/lib/userProfile";
import MenuEditor from "@/components/MenuEditor";
import LoadingState from "@/components/LoadingState";
import LogoutModal from "@/components/LogoutModal";

export default function DashboardPage() {
  const router = useRouter();
  const { profile, loading } = useProfile();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isLogoutClosing, setIsLogoutClosing] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  function openLogoutModal() {
    setIsLogoutClosing(false);
    setIsLogoutOpen(true);
  }

  function closeLogoutModal() {
    if (logoutLoading) return;
    setIsLogoutClosing(true);
    window.setTimeout(() => {
      setIsLogoutOpen(false);
      setIsLogoutClosing(false);
    }, 220);
  }

  async function handleLogout() {
    setLogoutLoading(true);
    await logout(router);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fafaf8] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <LoadingState label="Loading your menu dashboard..." />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fafaf8] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="panel mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="label">RASA</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-[#111111]">Menu management</h1>
          </div>
          <nav aria-label="Owner navigation" className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard" aria-current="page" className="secondary-button">
              Menu
            </Link>
            <Link href="/dashboard/feedback" className="secondary-button gap-2">
              <MessageSquareText className="h-4 w-4" aria-hidden="true" />
              Feedback
            </Link>
            <Link href="/dashboard/settings" className="secondary-button gap-2">
              <SettingsIcon className="h-4 w-4" />
              Settings
            </Link>
            <button onClick={openLogoutModal} className="secondary-button">
              Logout
            </button>
          </nav>
        </header>

        {profile.cafe_id ? (
          <MenuEditor cafeId={profile.cafe_id} />
        ) : (
          <div className="panel p-6 text-center">
            <p className="text-lg font-medium text-[#111111]">No cafe is linked to this account.</p>
            {profile.role === "super_admin" && (
              <Link href="/admin" className="mt-4 inline-flex items-center text-sm font-medium text-[#111111] underline underline-offset-4">
                Go to admin
              </Link>
            )}
          </div>
        )}
      </div>

      <LogoutModal
        isOpen={isLogoutOpen}
        closing={isLogoutClosing}
        onClose={closeLogoutModal}
        onConfirm={handleLogout}
        loading={logoutLoading}
      />
    </main>
  );
}
