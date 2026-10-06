"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Star } from "lucide-react";
import { supabaseAnonymous } from "@/lib/supabase";

const MAX_COMMENT_LENGTH = 1500;
const MAX_NAME_LENGTH = 80;
const RATING_LABELS = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very good",
  5: "Excellent",
};

export default function CustomerFeedbackForm({ cafe }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submitFeedback(event) {
    event.preventDefault();
    setError("");

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setError("Please select a star rating before submitting.");
      return;
    }
    if (comment.trim().length > MAX_COMMENT_LENGTH || customerName.trim().length > MAX_NAME_LENGTH) {
      setError("Please shorten your feedback and try again.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: insertError } = await supabaseAnonymous.from("feedback").insert({
        cafe_id: cafe.id,
        rating,
        comment: comment.trim() || null,
        customer_name: customerName.trim() || null,
      });

      if (insertError) {
        setError("We couldn't submit your feedback right now. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("We couldn't submit your feedback right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f1eb] px-4 py-6 text-[#201b17] sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-xl">
        <Link
          href={`/${encodeURIComponent(cafe.slug)}`}
          className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-[#655a4f] transition-colors hover:bg-white/70 hover:text-[#2a211b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a7144]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to menu
        </Link>

        <section className="rounded-[24px] border border-[#e5ddd1] bg-[#fbfaf7] p-5 shadow-[0_12px_32px_rgba(24,18,13,0.06)] sm:p-8">
          <header className="mb-7 text-center">
            {cafe.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cafe.logo_url}
                alt={`${cafe.name} logo`}
                className="mx-auto mb-4 h-16 w-16 rounded-2xl border border-black/5 bg-white p-1 object-contain"
              />
            )}
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6232]">{cafe.name}</p>
          </header>

          {submitted ? (
            <div className="py-5 text-center" role="status" aria-live="polite">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eaf3e8] text-[#39704a]">
                <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-[-0.06em] text-[#2a211b]">Thank You!</h1>
              <p className="mt-3 text-base font-medium text-[#51463c]">Your feedback has been received.</p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#71675e]">
                We really appreciate you taking the time to share your experience with us.
              </p>
              <Link href={`/${encodeURIComponent(cafe.slug)}`} className="primary-button mt-7 min-h-11">
                Back to Menu
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-semibold tracking-[-0.06em] text-[#2a211b] sm:text-3xl">
                  How was your experience?
                </h1>
                <p className="mt-2 text-sm leading-6 text-[#71675e]">
                  Your feedback helps us serve you better.
                </p>
              </div>

              {error && (
                <p role="alert" className="mt-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-800">
                  {error}
                </p>
              )}

              <form onSubmit={submitFeedback} className="mt-7 space-y-6">
                <fieldset>
                  <legend className="label mb-3 block">Your rating</legend>
                  <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Rating from 1 to 5 stars">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <label
                        key={value}
                        className="group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl transition-colors hover:bg-[#f2ede5] focus-within:outline-none focus-within:ring-2 focus-within:ring-[#9a7144] sm:h-14 sm:w-14"
                      >
                        <input
                          type="radio"
                          name="rating"
                          value={value}
                          checked={rating === value}
                          onChange={() => setRating(value)}
                          className="peer sr-only"
                          aria-label={`${value} ${value === 1 ? "star" : "stars"}${RATING_LABELS[value] ? `, ${RATING_LABELS[value]}` : ""}`}
                          disabled={submitting}
                        />
                        <Star
                          className={`h-8 w-8 transition-colors sm:h-9 sm:w-9 ${
                            rating >= value ? "fill-[#b78645] text-[#b78645]" : "fill-[#e8e2d9] text-[#c9beb0]"
                          } peer-focus-visible:scale-110`}
                          aria-hidden="true"
                        />
                      </label>
                    ))}
                    <span className="ml-2 min-w-[92px] text-sm font-semibold text-[#51463c]" aria-live="polite">
                      {rating ? `${RATING_LABELS[rating]} (${rating}/5)` : "Select a rating"}
                    </span>
                  </div>
                </fieldset>

                <div>
                  <label htmlFor="feedback-comment" className="label mb-2 block">What did you like or dislike?</label>
                  <textarea
                    id="feedback-comment"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    maxLength={MAX_COMMENT_LENGTH}
                    rows={5}
                    placeholder="Share anything that would help us improve..."
                    className="field min-h-32 resize-y"
                    disabled={submitting}
                  />
                  <p className="mt-1.5 text-right text-xs text-[#8a817b]">{comment.length}/{MAX_COMMENT_LENGTH}</p>
                </div>

                <div>
                  <label htmlFor="feedback-name" className="label mb-2 block">Your name (optional)</label>
                  <input
                    id="feedback-name"
                    type="text"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    maxLength={MAX_NAME_LENGTH}
                    autoComplete="name"
                    placeholder="Name"
                    className="field min-h-11"
                    disabled={submitting}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="primary-button min-h-12 w-full rounded-full"
                >
                  {submitting ? "Submitting feedback..." : "Submit Feedback"}
                </button>
              </form>
            </>
          )}
        </section>

        <p className="mt-5 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-[#8a817b]">
          Powered by RASA
        </p>
      </div>
    </main>
  );
}
