"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Star, StarHalf } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/** =========================
 * Types
 * ========================= */
type SvgProps = { className?: string };

type Testimonial = {
  id: string;
  company: string;
  name: string;
  role: string;
  quote: string;
  avatarSrc: string;
  rating: number;
};

type DeckCard = {
  id: string;
  color: string;
  decorIndex: number;
  data: Testimonial;
};

/** =========================
 * Config
 * ========================= */
const DEFAULT_STACK_COLORS: string[] = [
  "rgba(255, 140, 1, 0.18)",
  "rgba(255, 191, 0, 0.16)",
  "rgba(255, 255, 255, 0.14)",
  "rgba(255, 249, 230, 0.18)",
  "rgba(255, 236, 200, 0.22)",
];

const DEFAULT_ITEMS: Testimonial[] = [
  {
    id: "t1",
    company: "SIHOO",
    name: "Daisy",
    role: "(Area Sales Manager)",
    quote:
      "“What stood out most was the quality of creators and the ease of collaboration. Our team saved countless hours on outreach and campaign coordination.”",
    avatarSrc:
      "https://collaglam-campaign.s3.us-east-1.amazonaws.com/sihoo+logo.svg",
    rating: 4.5,
  },
  
  {
    id: "t3",
    company: "DREAME",
    name: "Kim",
    role: "(Senior Marketing Manager)",
    quote:
      "“The creator search filters are incredibly useful. It takes minutes instead of hours to find relevant influencers.”",
    avatarSrc:
      "https://collaglam-campaign.s3.us-east-1.amazonaws.com/dreme+tech.webp",
    rating: 4,
  },
  {
    id: "t4",
    company: "Anker",
    name: "Laura",
    role: "(Brand Marketing Manager)",
    quote:
      "“The quality of creators on CollabGlam has been impressive. We've built some great long-term partnerships through the platform.”",
    avatarSrc:
      "https://collaglam-campaign.s3.us-east-1.amazonaws.com/anker.png",
    rating: 4.5,
  },
  

];

// Solid warm background
const CARD_BG =
  "linear-gradient(135deg, #F6C24B 0%, #F8D682 45%, #F9E6B2 100%)";

// Stores last shown testimonial in the same browser tab
const STORAGE_KEY = "vgg_testimonial_index";

/** =========================
 * Helpers & Icons
 * ========================= */
function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <div
      className={cn(
        "flex items-center gap-[6px]",
        "text-[#6B4B00] drop-shadow-[0_2px_6px_rgba(140,95,0,0.25)]",
      )}
      aria-label={`Rating ${rating} out of 5`}
    >
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f-${i}`} size={22} weight="fill" />
      ))}

      {half ? <StarHalf size={22} weight="fill" /> : null}

      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e-${i}`} size={22} weight="regular" />
      ))}
    </div>
  );
}

function SvgTriangle({ className }: SvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 459 459"
      fill="none"
      className={className}
    >
      <g opacity="0.5">
        <path
          d="M459 -6.49999L459 452.5L0 -6.5L459 -6.49999Z"
          fill="#FFF9E6"
        />
        <path d="M229.5 223L229.5 452.5L0 223L229.5 223Z" fill="#FFF9E6" />
      </g>
    </svg>
  );
}

function SvgArcs({ className }: SvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 560 458"
      fill="none"
      className={className}
    >
      <g opacity="0.5">
        <path
          d="M74.87 525.996C26.1622 449.281 -0.999989 349.144 -1 244.998C-1 140.852 26.1622 40.7148 74.87 -36V525.996Z"
          fill="#FFF9E6"
        />
        <path
          d="M561 526C486.474 526 415.001 496.395 362.303 443.697C309.605 390.999 280 319.526 280 245C280 170.474 309.605 99.0008 362.303 46.303C415.001 -6.39469 486.474 -36 561 -36L561 526Z"
          fill="#FFF9E6"
        />
        <path
          d="M168.413 457.112C197.133 487.772 231.431 511.109 268.76 525.999V-36C231.431 -21.1104 197.133 2.22704 168.413 32.8867C115.715 89.1425 86.11 165.442 86.11 244.999C86.11 324.557 115.715 400.856 168.413 457.112Z"
          fill="#FFF9E6"
        />
      </g>
    </svg>
  );
}

function SvgChain({ className }: SvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -250 918 950"
      fill="none"
      className={className}
    >
      <g opacity="0.5">
        <path
          d="M432.501 -83.886C432.501 -171.964 432.501 -216.002 403.351 -232.517C374.2 -249.031 335.333 -227.012 257.598 -182.973L201.403 -151.137C123.669 -107.098 84.8017 -85.0791 84.8017 -52.05C84.8017 -19.021 123.669 2.99843 201.403 47.0372L257.598 78.8733C335.333 122.912 374.2 144.931 403.351 128.417C432.501 111.902 432.501 67.8636 432.501 -20.2139V-83.886Z"
          fill="#FFF9E6"
        />
        <path
          d="M174.903 92.0766C97.1681 48.0378 58.3008 26.0184 29.1504 42.5329C0 59.0475 0 103.086 0 191.164V254.836C0 342.914 0 386.952 29.1504 403.467C58.3008 419.981 97.168 397.962 174.902 353.923L231.098 322.087C308.832 278.048 347.699 256.029 347.699 223C347.699 189.971 308.832 167.951 231.098 123.913L174.903 92.0766Z"
          fill="#FFF9E6"
        />
        <path
          d="M201.403 398.963C123.669 443.001 84.8016 465.021 84.8016 498.05C84.8016 531.079 123.669 553.098 201.403 597.137L257.598 628.973C335.333 673.012 374.2 695.031 403.351 678.517C432.501 662.002 432.501 617.964 432.501 529.886V466.214C432.501 378.136 432.501 334.097 403.351 317.583C374.2 301.068 335.333 323.088 257.598 367.126L201.403 398.963Z"
          fill="#FFF9E6"
        />
        <path
          d="M485.502 529.885C485.502 617.962 485.502 662.001 514.652 678.515C543.803 695.03 582.67 673.01 660.404 628.972L716.598 597.137C794.332 553.098 833.199 531.078 833.199 498.049C833.199 465.02 794.332 443.001 716.598 398.962L660.404 367.127C582.67 323.088 543.803 301.069 514.652 317.583C485.502 334.098 485.502 378.137 485.502 466.214V529.885Z"
          fill="#FFF9E6"
        />
        <path
          d="M743.098 353.922C820.832 397.961 859.699 419.98 888.85 403.466C918 386.951 918 342.913 918 254.835V191.165C918 103.087 918 59.0485 888.85 42.534C859.699 26.0195 820.832 48.0388 743.098 92.0775L686.904 123.913C609.17 167.952 570.302 189.971 570.302 223C570.302 256.029 609.17 278.048 686.904 322.087L743.098 353.922Z"
          fill="#FFF9E6"
        />
        <path
          d="M716.598 47.0377C794.332 2.99898 833.199 -19.0204 833.199 -52.0494C833.199 -85.0785 794.332 -107.098 716.598 -151.137L660.404 -182.972C582.67 -227.011 543.803 -249.03 514.652 -232.515C485.502 -216.001 485.502 -171.962 485.502 -83.8845V-20.2143C485.502 67.8632 485.502 111.902 514.652 128.416C543.803 144.931 582.67 122.912 660.404 78.8729L716.598 47.0377Z"
          fill="#FFF9E6"
        />
      </g>
    </svg>
  );
}

const SVG_LIBRARY = [SvgTriangle, SvgArcs, SvgChain];

function clampIndex(n: number, max: number) {
  if (!Number.isFinite(n)) return -1;
  if (max <= 0) return -1;

  return Math.max(0, Math.min(max - 1, n));
}

function getStoredIndex(): number {
  if (typeof window === "undefined") return -1;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return -1;

    const n = Number(raw);
    return Number.isFinite(n) ? n : -1;
  } catch {
    return -1;
  }
}

function setStoredIndex(n: number) {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(STORAGE_KEY, String(n));
  } catch {
    // ignore
  }
}

function pickRandomExcluding(length: number, exclude: number) {
  if (length <= 1) return 0;

  let next = Math.floor(Math.random() * length);

  if (next === exclude) {
    next = (next + 1) % length;
  }

  return next;
}

/** =========================
 * Main Component
 * ========================= */
export function VggCardStack({
  items = DEFAULT_ITEMS,
  stackColors = DEFAULT_STACK_COLORS,
  showStars = true,
  className,
}: {
  items?: Testimonial[];
  stackColors?: string[];
  showStars?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const [activeIndex, setActiveIndex] = React.useState(0);

  const deck = React.useMemo<DeckCard[]>(
    () =>
      items.map((testimonial, index) => ({
        id: `deck-${testimonial.id}`,
        color:
          stackColors[index % stackColors.length] || "rgba(255,255,255,0.14)",
        decorIndex: index % SVG_LIBRARY.length,
        data: testimonial,
      })),
    [items, stackColors],
  );

  // Testimonial changes only on:
  // 1. Page refresh / component mount
  // 2. Route / page change
  //
  // No interval, no auto-refresh.
  React.useEffect(() => {
    if (!deck.length) return;

    const previousIndex = clampIndex(getStoredIndex(), deck.length);
    const nextIndex = pickRandomExcluding(deck.length, previousIndex);

    setStoredIndex(nextIndex);
    setActiveIndex(nextIndex);
  }, [pathname, deck.length]);

  const card = deck[activeIndex];

  if (!card) return null;

  const Decor = SVG_LIBRARY[card.decorIndex] || SvgArcs;

  return (
    <div
      className={cn(
        "relative w-full max-w-[560px] flex items-center justify-center",
        "aspect-[560/458] lg:w-[560px] lg:h-[458px]",
        className,
      )}
    >
      <div
        style={{
          backgroundImage: CARD_BG,
          backgroundColor: card.color,
          backgroundBlendMode: "overlay",
        }}
        className={cn(
          "relative w-full h-full rounded-[32px] overflow-hidden",
          "border-4 border-white/30 backdrop-blur-[17.5px]",
        )}
      >
        <Decor
          className={cn(
            "pointer-events-none absolute",
            "right-[-90px] sm:right-[-120px] lg:right-[-140px]",
            "top-[-20px] sm:top-[-30px] lg:top-[-40px]",
            "h-[420px] sm:h-[500px] lg:h-[560px] w-auto",
            "opacity-20",
          )}
        />

        <div
          className={cn(
            "relative z-[2] h-full flex flex-col",
            "px-[22px] sm:px-[34px] lg:px-[44px]",
            "pt-[22px] sm:pt-[34px] lg:pt-[44px]",
            "pb-[22px] sm:pb-[34px] lg:pb-[44px]",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="h-[68px] w-[68px] sm:h-[78px] sm:w-[78px] lg:h-[86px] lg:w-[86px] shrink-0 rounded-full overflow-hidden bg-white ring-2 ring-white/70 p-[6px]">
              <img
                src={card.data.avatarSrc}
                alt={`${card.data.company} logo`}
                width={118}
                height={118}
                className="h-full w-full object-contain"
                loading="eager"
              />
            </div>

            <span className="mt-[6px] sm:mt-[8px] lg:mt-[10px] text-right text-white font-semibold text-[16px] sm:text-[18px] lg:text-[20px] leading-[24px] sm:leading-[26px] lg:leading-[28px]">
              {card.data.company}
            </span>
          </div>

          <div className="mt-auto">
            {showStars ? <Stars rating={card.data.rating} /> : null}

            <div className="mt-[14px] sm:mt-[16px] lg:mt-[18px]">
              <div className="flex flex-wrap items-baseline gap-x-[10px] gap-y-[2px]">
                <p className="text-[18px] sm:text-[19px] lg:text-[20px] font-bold text-[#3B2A0A]">
                  {card.data.name}
                </p>

                <p className="text-[12px] text-[#C28718]">
                  {card.data.role}
                </p>
              </div>

              <p className="mt-[10px] max-w-[280px] sm:max-w-[320px] lg:max-w-[380px] text-[13px] sm:text-[14px] leading-[20px] sm:leading-[22px] text-[#C28718]">
                {card.data.quote}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}