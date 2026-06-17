"use client";

import Link from "next/link";
import { Heart } from "@phosphor-icons/react";
import { usePathname, useRouter } from "next/navigation";

type TabKey = "all" | "applied" | "active" | "completed" | "rejected";

export default function MyCampaignNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs: { key: TabKey; label: string; href: string }[] = [
    { key: "all", label: "All", href: "/influencer/my-campaigns/all" },
    {
      key: "applied",
      label: "Applied",
      href: "/influencer/my-campaigns/applied",
    },
    {
      key: "active",
      label: "Active",
      href: "/influencer/my-campaigns/active",
    },
    {
      key: "completed",
      label: "Completed",
      href: "/influencer/my-campaigns/completed",
    },
    {
      key: "rejected",
      label: "Rejected",
      href: "/influencer/my-campaigns/rejected",
    },
  ];

  const isActiveHref = (href: string) =>
    pathname === href || Boolean(pathname?.startsWith(`${href}/`));

  return (
    <header className="flex w-full flex-col gap-s border-b border-neutral-200 bg-background px-4 md:flex-row md:items-center md:justify-between md:px-6">
      <nav
        className="scrollbar-none flex w-full items-center gap-xs overflow-x-auto whitespace-nowrap md:w-auto md:flex-1 md:flex-wrap md:overflow-visible"
        aria-label="My campaign filters"
      >
        {tabs.map((tab) => {
          const isActive = isActiveHref(tab.href);

          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={[
                "inline-flex shrink-0 items-center justify-center",
                "h-12 md:h-14",
                "px-4",
                "border-0 border-b-2",
                "text-sm md:text-base",
                "transition-colors",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900/35 focus-visible:outline-offset-2",
                isActive
                  ? "border-[#FFBF00] text-neutral-900 font-semibold"
                  : "border-transparent text-neutral-600 font-medium hover:text-neutral-900 hover:border-neutral-300",
              ].join(" ")}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex w-full items-center justify-end md:w-auto">
        <button
          type="button"
          onClick={() => router.push("/influencer/saved-campaigns")}
          className={[
            "inline-flex items-center justify-center",
            "h-9 md:h-10",
            "gap-xs",
            "rounded-s bg-transparent",
            "px-3 md:px-4",
            "text-sm font-medium text-neutral-900",
            "shadow-none",
            "transition-colors",
            "hover:bg-neutral-50",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900/35 focus-visible:outline-offset-2",
            "whitespace-nowrap",
          ].join(" ")}
        >
          <Heart size={14} weight="fill" className="text-[#FF3B6B]" />
          <span>Saved Campaigns</span>
        </button>
      </div>
    </header>
  );
}