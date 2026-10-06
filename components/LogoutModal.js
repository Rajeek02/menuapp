"use client";

import { useEffect } from "react";
import { LogOut } from "lucide-react";

export default function LogoutModal({ isOpen, closing, onClose, onConfirm, loading }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/55 px-4 backdrop-blur-[1px] transition-opacity duration-300 ${closing ? "opacity-0" : "opacity-100"}`}
      onClick={onClose}
      aria-hidden={!isOpen}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        className={`w-full max-w-md rounded-[18px] border border-black/5 bg-[#fafaf8] p-5 shadow-[0_24px_60px_rgba(17,17,17,0.18)] ring-1 ring-black/5 transition-all duration-300 ${closing ? "scale-[0.97] opacity-0" : "scale-100 opacity-100"}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#111111] text-white shadow-[0_12px_24px_rgba(17,17,17,0.18)]">
            <LogOut className="h-5 w-5" strokeWidth={2} />
          </div>

          <h2 id="logout-title" className="text-2xl font-semibold tracking-[-0.06em] text-[#111111]">
            Sign out of RASA?
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#5f5a56]">You can sign in again anytime.</p>

          <div className="mt-6 flex w-full gap-3">
            <button
              type="button"
              onClick={onClose}
              className="secondary-button flex-1 justify-center"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="primary-button flex-1 justify-center"
              disabled={loading}
            >
              {loading ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
