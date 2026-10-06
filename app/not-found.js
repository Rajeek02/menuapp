import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f1eb] px-4 py-10 text-[#201b17]">
      <section className="w-full max-w-md rounded-[24px] border border-black/5 bg-[#fbfaf7] p-7 text-center shadow-[0_16px_40px_rgba(24,18,13,0.08)] sm:p-9">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8f6232]">RASA</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.06em]">Cafe not found</h1>
        <p className="mt-3 text-sm leading-6 text-[#71675e]">
          This menu link may be incorrect or no longer available.
        </p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-[#31251d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#49372a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a7144]">
          Go to RASA
        </Link>
      </section>
    </main>
  );
}
