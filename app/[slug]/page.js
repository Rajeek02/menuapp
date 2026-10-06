import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  Clock3,
  MessageSquareText,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import MenuCategoryNav from "@/components/MenuCategoryNav";

export const dynamic = "force-dynamic";

const PUBLIC_CAFE_FIELDS =
  "id, name, slug, logo_url, brand_color, address, location_url, phone, whatsapp, instagram_url, tagline, description, opening_hours, is_active";
const CAFE_SETTINGS_FIELDS = [
  "address",
  "location_url",
  "phone",
  "whatsapp",
  "instagram_url",
  "tagline",
  "description",
  "opening_hours",
];

function InstagramIcon({ className }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function isCafeSettingsMigrationMissing(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();
  return (
    code === "42703" ||
    code === "PGRST204" ||
    (message.includes("column") &&
      (message.includes("does not exist") || message.includes("schema cache")))
  );
}

const getCafeBySlug = cache(async (slug) => {
  const result = await supabase
    .from("cafes")
    .select(PUBLIC_CAFE_FIELDS)
    .eq("slug", slug)
    .maybeSingle();

  if (!result.error) return result.data;
  if (!isCafeSettingsMigrationMissing(result.error)) return null;

  const { data: basicCafe, error: basicCafeError } = await supabase
    .from("cafes")
    .select("id, name, slug, logo_url, brand_color, is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (basicCafeError || !basicCafe) return null;
  return Object.fromEntries([
    ...Object.entries(basicCafe),
    ...CAFE_SETTINGS_FIELDS.map((field) => [field, null]),
  ]);
});

function safeHttpUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeTelephone(value) {
  if (!value) return null;
  const normalized = value.trim().replace(/[^\d+]/g, "");
  return /^\+?\d{7,15}$/.test(normalized) ? normalized : null;
}

function normalizeWhatsApp(value) {
  if (!value) return null;
  let digits = value.trim().replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  return digits.length >= 7 && digits.length <= 15 ? digits : null;
}

function getBrandColors(value) {
  if (!/^#[\da-f]{6}$/i.test(value || "")) {
    return { accent: "#9a7144", accentText: "#ffffff" };
  }
  const red = Number.parseInt(value.slice(1, 3), 16);
  const green = Number.parseInt(value.slice(3, 5), 16);
  const blue = Number.parseInt(value.slice(5, 7), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return {
    accent: value,
    accentText: luminance > 0.58 ? "#201b17" : "#ffffff",
  };
}

function categoryAnchor(group) {
  return group.id ? `category-${group.id}` : "category-other";
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const cafe = await getCafeBySlug(slug);
  if (!cafe || !cafe.is_active) return { title: "Digital Menu | RASA" };

  const title = `${cafe.name} — Digital Menu`;
  const description =
    cafe.description?.trim() ||
    cafe.tagline?.trim() ||
    `Explore the menu at ${cafe.name}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: cafe.logo_url ? [cafe.logo_url] : undefined,
    },
  };
}

export default async function MenuPage({ params }) {
  const { slug } = await params;
  const cafe = await getCafeBySlug(slug);

  if (!cafe || !cafe.is_active) notFound();

  const [categoriesResult, itemsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, sort_order")
      .eq("cafe_id", cafe.id)
      .order("sort_order")
      .order("name"),
    supabase
      .from("items")
      .select("id, name, description, price, category_id, image_url, is_available")
      .eq("cafe_id", cafe.id)
      .order("name"),
  ]);

  const menuUnavailable = Boolean(categoriesResult.error || itemsResult.error);
  const allItems = itemsResult.data || [];
  const groups = (categoriesResult.data || [])
    .map((category) => ({
      id: category.id,
      title: category.name,
      items: allItems.filter((item) => item.category_id === category.id),
    }))
    .filter((group) => group.items.length > 0);

  const uncategorised = allItems.filter((item) => !item.category_id);
  if (uncategorised.length > 0) {
    groups.push({ id: null, title: "Other", items: uncategorised });
  }

  const address = cafe.address?.trim();
  const locationUrl = safeHttpUrl(cafe.location_url);
  const phone = normalizeTelephone(cafe.phone);
  const whatsapp = normalizeWhatsApp(cafe.whatsapp);
  const instagramUrl = safeHttpUrl(cafe.instagram_url);
  const { accent: brandAccent, accentText: brandAccentText } = getBrandColors(cafe.brand_color);
  const actions = [
    locationUrl && {
      label: "Get Directions",
      href: locationUrl,
      icon: MapPin,
      external: true,
    },
    phone && {
      label: "Call",
      href: `tel:${phone}`,
      icon: Phone,
    },
    whatsapp && {
      label: "WhatsApp",
      href: `https://wa.me/${whatsapp}`,
      icon: MessageCircle,
      external: true,
    },
    instagramUrl && {
      label: "Instagram",
      href: instagramUrl,
      icon: InstagramIcon,
      external: true,
    },
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-[#f4f1eb] px-3 py-4 text-[#201b17] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header
          className="relative overflow-hidden rounded-[28px] border border-black/10 shadow-[0_24px_60px_rgba(24,18,13,0.18)]"
          style={{ backgroundColor: "#31251d" }}
        >
          <div className="absolute inset-0 bg-linear-to-br from-black/10 via-transparent to-black/35" aria-hidden="true" />
          <div className="relative px-5 py-7 text-center text-white sm:px-10 sm:py-10">
            {cafe.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cafe.logo_url}
                alt={`${cafe.name} logo`}
                className="mx-auto mb-4 h-16 w-16 rounded-2xl border border-white/25 bg-white/10 p-1 object-contain shadow-lg sm:h-20 sm:w-20"
              />
            )}
            <h1 className="mx-auto max-w-3xl wrap-break-word text-3xl font-semibold tracking-[-0.07em] sm:text-5xl">
              {cafe.name}
            </h1>
            {cafe.tagline && (
              <p className="mx-auto mt-3 max-w-2xl text-base font-medium leading-7 text-[#f2d8a7] sm:text-lg">
                {cafe.tagline}
              </p>
            )}
            {cafe.description && (
              <p className="mx-auto mt-3 max-w-2xl whitespace-pre-line wrap-break-word text-sm leading-6 text-white/80 sm:text-base">
                {cafe.description}
              </p>
            )}

            {cafe.opening_hours && (
              <p className="mt-4 inline-flex items-center gap-2 text-sm leading-6 text-white/85 sm:mt-5">
                <Clock3 className="h-4 w-4 shrink-0 text-[#f2d8a7]" aria-hidden="true" />
                <span className="wrap-break-word">{cafe.opening_hours}</span>
              </p>
            )}
          </div>
        </header>

        <section aria-label="Cafe menu" className="mt-5 sm:mt-7">
          {menuUnavailable ? (
            <div role="status" className="rounded-3xl border border-[#eadcc8] bg-[#fffaf1] px-5 py-8 text-center shadow-[0_16px_40px_rgba(24,18,13,0.04)]">
              <h2 className="text-lg font-semibold text-[#2a211b]">Menu temporarily unavailable</h2>
              <p className="mt-2 text-sm leading-6 text-[#71675e]">Please try again in a little while.</p>
            </div>
          ) : (
            <>
          {groups.length > 0 && (
            <MenuCategoryNav
              groups={groups}
              accentColor={brandAccent}
              accentTextColor={brandAccentText}
            />
          )}

          <div className="rounded-3xl border border-black/5 bg-[#fbfaf7] p-3 shadow-[0_16px_40px_rgba(24,18,13,0.06)] sm:p-6">
            {groups.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <h2 className="text-xl font-semibold tracking-tight text-[#2a211b]">Menu coming soon</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#71675e]">
                  This cafe is currently updating its menu. Please check back soon.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {groups.map((group) => (
                  <section
                    key={categoryAnchor(group)}
                    id={categoryAnchor(group)}
                    className="scroll-mt-24 first:pt-1"
                  >
                    <div className="mb-4 border-b border-[#e8e2d9] pb-3">
                      <h2 className="wrap-break-word text-xl font-semibold tracking-tighter text-[#2a211b] sm:text-2xl">
                        {group.title}
                      </h2>
                    </div>

                    <ul className="grid gap-3 md:grid-cols-2">
                      {group.items.map((item) => (
                        <li
                          key={item.id}
                          className={`flex min-w-0 gap-3 rounded-[18px] border p-3 shadow-[0_5px_16px_rgba(24,18,13,0.035)] transition-colors hover:border-[#d4c4ad] sm:gap-4 sm:p-4 ${
                            item.is_available
                              ? "border-[#e9e3da] bg-white"
                              : "border-[#ead4cc] bg-[#fffdfa]"
                          }`}
                        >
                          {item.image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="h-16 w-16 shrink-0 rounded-[14px] bg-[#f2eee8] object-cover sm:h-20 sm:w-20"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-start justify-between gap-3">
                              <h3 className="min-w-0 wrap-break-word text-[15px] font-semibold leading-5 tracking-tight text-[#2b241e] sm:text-base">
                                {item.name}
                              </h3>
                              <span
                                className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums"
                                style={{ backgroundColor: `${brandAccent}22`, color: "#51402d" }}
                              >
                                ₹{Number(item.price)}
                              </span>
                            </div>
                            {item.description && (
                              <p className="mt-1.5 wrap-break-word text-sm leading-5 text-[#776d63]">
                                {item.description}
                              </p>
                            )}
                            {!item.is_available && (
                              <p className="mt-2 inline-flex rounded-full bg-[#fff0ed] px-2.5 py-1 text-xs font-semibold tracking-wide text-[#8f3026]">
                                Out of stock
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
            </>
          )}
        </section>

        <Link
          href={`/${encodeURIComponent(cafe.slug)}/feedback`}
          className="group mt-6 flex min-h-[72px] items-center justify-between gap-4 rounded-[18px] border border-[#e5ddd1] bg-[#fbfaf7] px-5 py-4 transition-colors hover:border-[#cbb89f] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a7144] focus-visible:ring-offset-2 sm:mt-8 sm:px-6"
        >
          <span className="flex min-w-0 items-start gap-3">
            <MessageSquareText className="mt-0.5 h-5 w-5 shrink-0 text-[#8f6232]" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block font-semibold text-[#2a211b]">How was your experience?</span>
              <span className="mt-1 block text-sm leading-5 text-[#71675e]">We&apos;d love to hear from you.</span>
            </span>
          </span>
          <ArrowUpRight className="h-5 w-5 shrink-0 text-[#8f6232] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
        </Link>

        {(address || cafe.opening_hours || actions.length > 0) && (
          <section
            aria-label="Cafe contact and location"
            className="mt-10 border-y border-[#e5ddd1] bg-[#eee8de] px-4 py-8 sm:mt-14 sm:px-8 sm:py-10"
          >
            <div className="mx-auto max-w-3xl">
              <h2 className="text-lg font-semibold tracking-[-0.04em] text-[#2a211b]">{cafe.name}</h2>
              {address && (
                <p className="mt-3 flex items-start gap-2.5 whitespace-pre-line wrap-break-word text-sm leading-6 text-[#51463c] sm:text-base">
                  <MapPin className="mt-1 h-4 w-4 shrink-0 text-[#8f6232]" aria-hidden="true" />
                  <span>{address}</span>
                </p>
              )}
              {cafe.opening_hours && (
                <p className="mt-2 flex items-start gap-2.5 text-sm leading-6 text-[#51463c]">
                  <Clock3 className="mt-1 h-4 w-4 shrink-0 text-[#8f6232]" aria-hidden="true" />
                  <span>{cafe.opening_hours}</span>
                </p>
              )}
              {actions.length > 0 && (
                <nav aria-label="Cafe contact links" className="mt-5 flex flex-wrap gap-2.5">
                  {actions.map(({ label, href, icon: Icon, external }) => (
                    <a
                      key={label}
                      href={href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noreferrer" : undefined}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#d8cbbb] bg-[#fbfaf7] px-4 py-2.5 text-sm font-medium text-[#51463c] transition-colors hover:border-[#b99c79] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a7144] focus-visible:ring-offset-2"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-[#8f6232]" aria-hidden="true" />
                      {label}
                      {external && <ArrowUpRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />}
                    </a>
                  ))}
                </nav>
              )}
            </div>
          </section>
        )}

        <footer className="mt-5 pb-2 text-center sm:mt-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#8a817b]">
            Powered by RASA
          </p>
        </footer>
      </div>
    </main>
  );
}
