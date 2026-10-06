"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, MessageSquareText, Settings as SettingsIcon, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logout, useProfile } from "@/lib/userProfile";
import LoadingState from "@/components/LoadingState";
import LogoutModal from "@/components/LogoutModal";

const PAGE_SIZE = 10;
const RATING_FILTERS = [null, 5, 4, 3, 2, 1];

function RatingStars({ rating, size = "h-4 w-4" }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={`${size} ${value <= rating ? "fill-[#b78645] text-[#b78645]" : "fill-[#e8e2d9] text-[#c9beb0]"}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function FeedbackSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading feedback">
      {[0, 1, 2].map((index) => (
        <div key={index} className="animate-pulse rounded-[16px] border border-black/5 bg-white p-5">
          <div className="h-4 w-28 rounded bg-[#eeeae4]" />
          <div className="mt-4 h-3 w-3/4 rounded bg-[#f2eee8]" />
          <div className="mt-2 h-3 w-1/2 rounded bg-[#f2eee8]" />
        </div>
      ))}
    </div>
  );
}

export default function DashboardFeedbackPage() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useProfile("cafe_owner");
  const [feedback, setFeedback] = useState([]);
  const [filter, setFilter] = useState(null);
  const [page, setPage] = useState(0);
  const [filteredPages, setFilteredPages] = useState(0);
  const [totalFeedback, setTotalFeedback] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [positiveFeedback, setPositiveFeedback] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingFeedback, setLoadingFeedback] = useState(true);
  const [error, setError] = useState("");
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    if (profileLoading || !profile) return undefined;
    let cancelled = false;

    async function loadStats() {
      setLoadingStats(true);
      setError("");
      try {
        const ratings = [];
        const batchSize = 1000;
        for (let start = 0; ; start += batchSize) {
          const { data, error: queryError } = await supabase
            .from("feedback")
            .select("rating")
            .order("created_at", { ascending: false })
            .range(start, start + batchSize - 1);

          if (queryError) throw queryError;
          ratings.push(...(data || []).map((entry) => entry.rating));
          if (!data || data.length < batchSize) break;
        }

        if (cancelled) return;
        const total = ratings.length;
        setTotalFeedback(total);
        setAverageRating(total ? ratings.reduce((sum, rating) => sum + rating, 0) / total : 0);
        setPositiveFeedback(ratings.filter((rating) => rating >= 4).length);
      } catch {
        if (!cancelled) setError("Unable to load customer feedback. Please try again.");
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [profile, profileLoading]);

  useEffect(() => {
    if (profileLoading || !profile) return undefined;
    let cancelled = false;

    async function loadFeedback() {
      setLoadingFeedback(true);
      setError("");
      try {
        let query = supabase
          .from("feedback")
          .select("id, rating, comment, customer_name, created_at", { count: "exact" })
          .order("created_at", { ascending: false });
        if (filter !== null) query = query.eq("rating", filter);
        const start = page * PAGE_SIZE;
        const { data, count, error: queryError } = await query.range(start, start + PAGE_SIZE - 1);
        if (queryError) throw queryError;
        if (!cancelled) {
          setFeedback(data || []);
          setFilteredPages(Math.ceil((count || 0) / PAGE_SIZE));
        }
      } catch {
        if (!cancelled) setError("Unable to load customer feedback. Please try again.");
      } finally {
        if (!cancelled) setLoadingFeedback(false);
      }
    }

    loadFeedback();
    return () => {
      cancelled = true;
    };
  }, [filter, page, profile, profileLoading]);

  function selectFilter(nextFilter) {
    setFilter(nextFilter);
    setPage(0);
  }

  function openLogoutModal() {
    setIsLogoutOpen(true);
  }

  async function handleLogout() {
    setLogoutLoading(true);
    await logout(router);
  }

  if (profileLoading) {
    return (
      <main className="min-h-screen bg-[#fafaf8] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl"><LoadingState label="Checking your account..." /></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fafaf8] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="panel mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="label">RASA</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-[#111111]">Customer Feedback</h1>
          </div>
          <nav aria-label="Owner navigation" className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard" className="secondary-button">Menu</Link>
            <Link href="/dashboard/feedback" aria-current="page" className="secondary-button gap-2">
              <MessageSquareText className="h-4 w-4" aria-hidden="true" />
              Feedback
            </Link>
            <Link href="/dashboard/settings" className="secondary-button gap-2">
              <SettingsIcon className="h-4 w-4" aria-hidden="true" />
              Settings
            </Link>
            <button type="button" onClick={openLogoutModal} className="secondary-button">Logout</button>
          </nav>
        </header>

        <div className="mb-6">
          <p className="text-sm leading-6 text-[#5f5a56]">See what your customers are saying.</p>
        </div>

        {error && (
          <div role="alert" className="mb-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <section aria-label="Feedback summary" className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="panel p-5">
            <p className="label">Average Rating</p>
            {loadingStats ? (
              <div className="mt-4 h-9 w-24 animate-pulse rounded bg-[#eeeae4]" />
            ) : (
              <div className="mt-3 flex items-center gap-2">
                <p className="text-3xl font-semibold tracking-[-0.06em] text-[#111111]">
                  {totalFeedback ? averageRating.toFixed(1) : "—"}
                </p>
                {totalFeedback > 0 && <RatingStars rating={Math.round(averageRating)} />}
              </div>
            )}
          </div>
          <div className="panel p-5">
            <p className="label">Total Feedback</p>
            {loadingStats ? (
              <div className="mt-4 h-9 w-16 animate-pulse rounded bg-[#eeeae4]" />
            ) : (
              <p className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-[#111111]">{totalFeedback}</p>
            )}
          </div>
          <div className="panel p-5">
            <p className="label">Positive Feedback</p>
            {loadingStats ? (
              <div className="mt-4 h-9 w-16 animate-pulse rounded bg-[#eeeae4]" />
            ) : (
              <>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-[#111111]">{positiveFeedback}</p>
                <p className="mt-1 text-xs text-[#6b625d]">Ratings of 4 or 5 stars</p>
              </>
            )}
          </div>
        </section>

        <section className="panel p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.04em] text-[#111111]">Recent Feedback</h2>
            </div>
            <label className="flex items-center gap-2 text-sm text-[#5f5a56]">
              <span className="sr-only">Filter feedback by rating</span>
              <span aria-hidden="true">Rating</span>
              <select
                value={filter ?? ""}
                onChange={(event) => selectFilter(event.target.value ? Number(event.target.value) : null)}
                className="field min-h-10 w-auto min-w-32 py-2"
              >
                {RATING_FILTERS.map((rating) => (
                  <option key={rating ?? "all"} value={rating ?? ""}>
                    {rating === null ? "All" : `${rating} ${rating === 1 ? "star" : "stars"}`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5">
            {loadingFeedback ? (
              <FeedbackSkeleton />
            ) : error ? (
              <p className="rounded-[14px] bg-[#f5f5f2] px-4 py-8 text-center text-sm text-[#5f5a56]">
                Feedback could not be displayed.
              </p>
            ) : feedback.length === 0 ? (
              filter === null && totalFeedback === 0 ? (
                <div className="rounded-[16px] border border-dashed border-black/10 bg-[#f5f5f2] px-5 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#8f6232]">
                    <MessageSquareText className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-[-0.04em] text-[#111111]">No feedback yet</h3>
                  <p className="mt-2 text-sm leading-6 text-[#5f5a56]">
                    Customer feedback will appear here after your first response.
                  </p>
                </div>
              ) : (
                <p className="rounded-[14px] bg-[#f5f5f2] px-4 py-8 text-center text-sm text-[#5f5a56]">
                  No feedback matches this rating filter.
                </p>
              )
            ) : (
              <ul className="space-y-3">
                {feedback.map((entry) => (
                  <li key={entry.id} className="rounded-[16px] border border-black/5 bg-white p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <RatingStars rating={entry.rating} />
                      <time dateTime={entry.created_at} className="text-xs text-[#8a817b]">
                        {formatDate(entry.created_at)}
                      </time>
                    </div>
                    {entry.comment && (
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#3e3832]">
                        {entry.comment}
                      </p>
                    )}
                    <p className="mt-3 text-sm font-medium text-[#655a4f]">
                      {entry.customer_name?.trim() || "Anonymous customer"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!loadingFeedback && filteredPages > 1 && (
            <nav aria-label="Feedback pages" className="mt-5 flex items-center justify-between border-t border-black/5 pt-4">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={page === 0}
                className="secondary-button min-h-10 gap-1.5 px-3"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </button>
              <p className="text-xs text-[#6b625d]" aria-live="polite">
                Page {page + 1} of {filteredPages}
              </p>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                disabled={page >= filteredPages - 1}
                className="secondary-button min-h-10 gap-1.5 px-3"
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
          )}
        </section>
      </div>

      <LogoutModal
        isOpen={isLogoutOpen}
        closing={false}
        onClose={() => setIsLogoutOpen(false)}
        onConfirm={handleLogout}
        loading={logoutLoading}
      />
    </main>
  );
}
