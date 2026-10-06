"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile, logout } from "@/lib/userProfile";
import LoadingState from "@/components/LoadingState";
import LogoutModal from "@/components/LogoutModal";

function makeSlug(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function matchesCafeName(enteredName, cafeName) {
  return enteredName.trim().toLowerCase() === cafeName.trim().toLowerCase();
}

export default function AdminPage() {
  const router = useRouter();
  const { loading } = useProfile("super_admin");
  const [cafes, setCafes] = useState([]);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isLogoutClosing, setIsLogoutClosing] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [cafeToDelete, setCafeToDelete] = useState(null);
  const [deleteCafeName, setDeleteCafeName] = useState("");
  const [deleteCafeError, setDeleteCafeError] = useState("");
  const [deletingCafe, setDeletingCafe] = useState(false);

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

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [creatingCafe, setCreatingCafe] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");

  async function loadCafes() {
    const { data } = await supabase.from("cafes").select("*").order("created_at");
    setCafes(data || []);
  }

  useEffect(() => {
    if (!loading) loadCafes();
  }, [loading]);

  async function addCafe(e) {
    e.preventDefault();
    setMessage("");
    setCreatingCafe(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setMessageType("error");
        setMessage("Your session has expired. Please sign in again.");
        return;
      }

      const response = await fetch("/api/admin/cafes", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          slug,
          email: ownerEmail,
          password: ownerPassword,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setMessageType("error");
        setMessage(result.error || "Unable to create cafe. Please try again.");
        return;
      }

      setName("");
      setSlug("");
      setOwnerEmail("");
      setOwnerPassword("");
      setShowOwnerPassword(false);
      setMessageType("success");
      setMessage(result.message);
      await loadCafes();
    } catch {
      setMessageType("error");
      setMessage("Unable to create cafe. Please try again.");
    } finally {
      setCreatingCafe(false);
    }
  }

  async function toggleActive(cafe) {
    const { error } = await supabase.from("cafes").update({ is_active: !cafe.is_active }).eq("id", cafe.id);
    if (error) {
      setMessageType("error");
      return setMessage("Error: " + error.message);
    }
    loadCafes();
  }

  function openDeleteModal(cafe) {
    setDeleteCafeName("");
    setDeleteCafeError("");
    setCafeToDelete(cafe);
  }

  function closeDeleteModal() {
    if (deletingCafe) return;
    setCafeToDelete(null);
    setDeleteCafeName("");
    setDeleteCafeError("");
  }

  useEffect(() => {
    if (!cafeToDelete) return undefined;

    function handleEscape(event) {
      if (event.key === "Escape" && !deletingCafe) {
        setCafeToDelete(null);
        setDeleteCafeName("");
        setDeleteCafeError("");
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [cafeToDelete, deletingCafe]);

  async function deleteCafe() {
    if (!cafeToDelete || !matchesCafeName(deleteCafeName, cafeToDelete.name)) return;

    setDeletingCafe(true);
    setDeleteCafeError("");
    setMessage("");
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setDeleteCafeError("Your session has expired. Please sign in again.");
        return;
      }

      const response = await fetch(`/api/admin/cafes/${encodeURIComponent(cafeToDelete.id)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirmationName: deleteCafeName }),
      });
      const result = await response.json();

      if (!response.ok) {
        setDeleteCafeError(result.error || "Unable to delete this cafe. Please try again.");
        return;
      }

      const deletedCafeId = cafeToDelete.id;
      setCafes((current) => current.filter((cafe) => cafe.id !== deletedCafeId));
      setCafeToDelete(null);
      setDeleteCafeName("");
      setDeleteCafeError("");
      setMessageType("success");
      setMessage("Cafe deleted successfully.");
    } catch {
      setDeleteCafeError("Unable to delete this cafe. Please try again.");
    } finally {
      setDeletingCafe(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fafaf8] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <LoadingState label="Checking admin access..." />
        </div>
      </main>
    );
  }

  const activeCount = cafes.filter((cafe) => cafe.is_active).length;

  return (
    <main className="min-h-screen bg-[#fafaf8] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="panel mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="label">RASA</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.07em] text-[#111111]">Admin dashboard</h1>
          </div>
          <button onClick={openLogoutModal} className="secondary-button">
            Logout
          </button>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="panel p-5">
            <p className="label">Total cafes</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.08em]">{cafes.length}</h2>
          </div>
          <div className="panel p-5">
            <p className="label">Active</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.08em]">{activeCount}</h2>
          </div>
          <div className="panel p-5">
            <p className="label">Status</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.08em]">Live</h2>
          </div>
        </section>

        {cafes.length === 0 && (
          <div className="panel mb-6 p-8 text-center">
            <h3 className="text-xl font-semibold tracking-[-0.04em] text-[#111111]">No cafes yet</h3>
            <p className="mt-2 text-sm text-[#5f5a56]">Create your first cafe to start publishing a live menu.</p>
          </div>
        )}

        {message && (
          <div
            role={messageType === "success" ? "status" : "alert"}
            className={`panel mb-6 border-l-[3px] px-4 py-3 text-sm ${
              messageType === "success"
                ? "border-[#1f7a58] bg-[#eff8f3] text-[#1f684d]"
                : "border-[#a2672c] bg-[#fffaf1] text-[#5c412c]"
            }`}
          >
            {message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="panel p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-[-0.04em]">Cafe network</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {cafes.map((cafe) => (
                <div key={cafe.id} className="soft-panel p-4">
                  <Link href={`/admin/cafes/${cafe.id}`} className="block">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold tracking-[-0.04em] text-[#111111]">{cafe.name}</h3>
                        <p className="mt-1 text-sm text-[#5f5a56]">/{cafe.slug}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${cafe.is_active ? "bg-[#eaf7f1] text-[#1f7a58]" : "bg-[#f8e7e7] text-[#b63a3a]"}`}>
                        {cafe.is_active ? "Active" : "Paused"}
                      </span>
                    </div>
                  </Link>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/admin/cafes/${cafe.id}`}
                      className="secondary-button min-h-9 flex-1 px-3 py-2 text-xs"
                    >
                      Open
                    </Link>
                    <button
                      onClick={() => toggleActive(cafe)}
                      className={`min-h-9 flex-1 rounded-[10px] px-3 py-2 text-xs font-medium ${cafe.is_active ? "bg-[#111111] text-white" : "bg-[#f5f5f2] text-[#111111]"}`}
                    >
                      {cafe.is_active ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteModal(cafe)}
                      className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 transition hover:border-red-300 hover:bg-red-50"
                      aria-label={`Delete ${cafe.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="panel p-5">
            <h2 className="text-xl font-semibold tracking-[-0.04em]">Add cafe</h2>
            <form onSubmit={addCafe} className="mt-5 space-y-4">
              <div>
                <label htmlFor="cafe-name" className="label block pb-2">Cafe name</label>
                <input
                  id="cafe-name"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSlug(makeSlug(e.target.value));
                  }}
                  placeholder="Cafe name (e.g. Cafe Retro)"
                  className="field"
                />
              </div>

              <div>
                <label htmlFor="cafe-slug" className="label block pb-2">Slug</label>
                <input
                  id="cafe-slug"
                  required
                  maxLength={63}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="cafe-retro"
                  className="field"
                />
                <p className="mt-2 text-xs leading-5 text-[#5f5a56]">
                  Lowercase letters, numbers, and single hyphens only.
                </p>
              </div>

              <div>
                <label htmlFor="owner-email" className="label block pb-2">Owner email</label>
                <input
                  id="owner-email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="owner@cafe.com"
                  className="field"
                />
              </div>

              <div>
                <label htmlFor="owner-password" className="label block pb-2">Temporary password</label>
                <div className="flex gap-2">
                  <input
                    id="owner-password"
                    type={showOwnerPassword ? "text" : "password"}
                    required
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="At least 12 characters"
                    className="field min-w-0 flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOwnerPassword((visible) => !visible)}
                    className="secondary-button shrink-0 px-3"
                    aria-label={showOwnerPassword ? "Hide temporary password" : "Show temporary password"}
                  >
                    {showOwnerPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#5f5a56]">
                  Use 12+ characters with uppercase, lowercase, a number, and a symbol.
                </p>
              </div>

              <button disabled={creatingCafe} className="primary-button w-full">
                {creatingCafe ? "Creating cafe..." : "Create Cafe"}
              </button>
            </form>
          </aside>
        </div>
      </div>

      <LogoutModal
        isOpen={isLogoutOpen}
        closing={isLogoutClosing}
        onClose={closeLogoutModal}
        onConfirm={handleLogout}
        loading={logoutLoading}
      />

      {cafeToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/55 px-4 py-6 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDeleteModal();
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-cafe-title"
            aria-describedby="delete-cafe-description"
            aria-busy={deletingCafe}
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              const controls = event.currentTarget.querySelectorAll(
                'input:not([disabled]), button:not([disabled])'
              );
              const first = controls[0];
              const last = controls[controls.length - 1];

              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }}
            className="w-full max-w-md rounded-[20px] border border-black/5 bg-[#fafaf8] p-6 shadow-[0_28px_80px_rgba(17,17,17,0.25)] sm:p-7"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[14px] bg-red-50 text-red-700">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 id="delete-cafe-title" className="text-2xl font-semibold tracking-[-0.06em] text-[#111111]">
              Delete {cafeToDelete.name}?
            </h2>
            <p id="delete-cafe-description" className="mt-3 text-sm leading-6 text-[#5f5a56]">
              This will permanently remove this cafe and its associated data. This action cannot be undone.
            </p>
            {deleteCafeError && (
              <p role="alert" className="mt-4 rounded-[10px] bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-800">
                {deleteCafeError}
              </p>
            )}

            <label htmlFor="delete-cafe-confirmation" className="label mt-5 block">
              Type &quot;{cafeToDelete.name}&quot; to confirm (capitalization does not matter)
            </label>
            <input
              id="delete-cafe-confirmation"
              autoFocus
              value={deleteCafeName}
              onChange={(event) => setDeleteCafeName(event.target.value)}
              className="field mt-2"
              autoComplete="off"
              disabled={deletingCafe}
            />

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deletingCafe}
                className="secondary-button min-w-28"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteCafe}
                disabled={deletingCafe || !matchesCafeName(deleteCafeName, cafeToDelete.name)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {deletingCafe ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
