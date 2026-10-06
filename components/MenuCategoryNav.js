"use client";

import { useEffect, useState } from "react";

export default function MenuCategoryNav({ groups, accentColor, accentTextColor }) {
  const [activeCategory, setActiveCategory] = useState(groups[0] ? `category-${groups[0].id ?? "other"}` : "");

  useEffect(() => {
    if (groups.length === 0) return undefined;

    let frame = 0;
    const updateActiveCategory = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const sections = groups
          .map((group) => document.getElementById(`category-${group.id ?? "other"}`))
          .filter(Boolean);
        if (sections.length === 0) return;

        const active = sections
          .filter((section) => section.getBoundingClientRect().top <= 180)
          .at(-1) || sections[0];
        setActiveCategory(active.id);
      });
    };

    updateActiveCategory();
    window.addEventListener("scroll", updateActiveCategory, { passive: true });
    window.addEventListener("resize", updateActiveCategory);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateActiveCategory);
      window.removeEventListener("resize", updateActiveCategory);
    };
  }, [groups]);

  return (
    <nav
      aria-label="Menu categories"
      className="sticky top-2 z-10 mb-4 overflow-x-auto rounded-2xl border border-black/5 bg-[#faf9f6]/95 p-2 shadow-[0_8px_24px_rgba(24,18,13,0.06)] backdrop-blur-md scrollbar-none [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex w-max min-w-full gap-2">
        {groups.map((group) => {
          const id = `category-${group.id ?? "other"}`;
          const active = activeCategory === id;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={() => setActiveCategory(id)}
                aria-current={active ? "location" : undefined}
                className={`inline-flex min-h-10 items-center whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  active
                    ? "border-transparent shadow-sm"
                    : "border-[#ded6ca] bg-white text-[#51463c] hover:border-[#9a7144]"
                }`}
                style={
                  active
                    ? {
                        backgroundColor: accentColor,
                        color: accentTextColor,
                        "--tw-ring-color": accentColor,
                      }
                    : undefined
                }
              >
                {group.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
