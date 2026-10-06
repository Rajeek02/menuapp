import Link from "next/link";
import { QrCode, RefreshCw, Smartphone } from "lucide-react";

const features = [
  {
    icon: RefreshCw,
    title: "Live menu updates",
    text: "Change dishes, prices, and availability instantly. No reprinting. No hassle.",
  },
  {
    icon: QrCode,
    title: "One QR. Always up to date.",
    text: "Print your QR once and update your menu whenever you need.",
  },
  {
    icon: Smartphone,
    title: "A menu your customers enjoy",
    text: "Give every customer a clean, modern menu experience right from their phone.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl animate-[fadeIn_0.5s_ease-out]">
        <header className="panel mb-10 flex items-center justify-between px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#111111] text-sm font-semibold text-white">
              R
            </div>
            <div>
              <p className="text-base font-semibold tracking-[-0.04em]">RASA</p>
            </div>
          </div>
          <Link href="/login" className="secondary-button">
            Owner login
          </Link>
        </header>

        <section className="panel overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="label mb-4">Hospitality technology</p>
              <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.08em] text-[#111111] sm:text-5xl lg:text-6xl">
                Premium digital menus for cafés across Tamil Nadu.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-[#5f5a56] sm:text-lg">
                Give your customers a beautiful menu experience and update dishes, prices, and availability instantly — without reprinting your QR code.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login" className="primary-button transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0">
                  Get started
                </Link>
              </div>
            </div>

            <div className="soft-panel p-4">
              <div className="rounded-[18px] border border-black/5 bg-white p-4 shadow-[0_16px_35px_rgba(17,17,17,0.04)]">
                <div className="flex items-center justify-between border-b border-black/5 pb-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6b625d]">Preview</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.06em]">Chennai Café</h2>
                  </div>
                  <div className="rounded-full bg-[#f5f5f2] px-3 py-1 text-xs font-semibold text-[#111111]">Live</div>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="rounded-[14px] bg-[#f5f5f2] p-3 transition-transform duration-200 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-[#111111]">Filter Coffee</p>
                        <p className="text-xs text-[#6b625d]">Traditional South Indian filter coffee</p>
                      </div>
                      <span className="text-sm font-semibold text-[#111111]">₹80</span>
                    </div>
                  </div>
                  <div className="rounded-[14px] bg-[#f5f5f2] p-3 transition-transform duration-200 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-[#111111]">Chicken Cheese Sandwich</p>
                        <p className="text-xs text-[#6b625d]">Grilled chicken, cheese & fresh vegetables</p>
                      </div>
                      <span className="text-sm font-semibold text-[#111111]">₹220</span>
                    </div>
                  </div>
                  <div className="rounded-[14px] bg-[#f5f5f2] p-3 transition-transform duration-200 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-[#111111]">Tiramisu</p>
                        <p className="text-xs text-[#6b625d]">Classic coffee-soaked Italian dessert</p>
                      </div>
                      <span className="text-sm font-semibold text-[#111111]">₹180</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="panel p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_30px_rgba(17,17,17,0.06)]">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[12px] border border-black/5 bg-[#f5f5f2] text-[#111111] shadow-[0_8px_18px_rgba(17,17,17,0.04)]">
                <Icon className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <h3 className="text-lg font-semibold tracking-[-0.04em] text-[#111111]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#5f5a56]">{text}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
