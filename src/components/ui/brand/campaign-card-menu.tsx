"use client";

import React, { useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  DotsThree,
  Eye,
  LinkSimple,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import { apiEnableCampaignShare } from "@/app/brand/services/brandApi";
import { toast } from "@/components/ui/toast";

type Props = {
  viewHref: string;
  inviteHref: string;
  campaignStatus?: string;
  isDraft?: boolean | number;
  isFullyManaged?: boolean;
};

const itemCls =
  "flex w-full items-center gap-3 rounded-[0.75rem] px-3 py-2.5 text-left text-[0.95rem] font-medium text-[#2D2D2D] hover:bg-[#F6F6F6] transition-colors";

function toAbsoluteUrl(href: string) {
  if (typeof window === "undefined") return href;
  if (/^https?:\/\//i.test(href)) return href;
  return `${window.location.origin}${href}`;
}

function extractCampaignId(viewHref: string) {
  try {
    const url = new URL(toAbsoluteUrl(viewHref));

    const queryId =
      url.searchParams.get("campaignId") ||
      url.searchParams.get("id");

    if (queryId) return queryId;

    const parts = url.pathname.split("/").filter(Boolean);
    const campaignIndex = parts.indexOf("campaign");

    if (campaignIndex >= 0 && parts[campaignIndex + 1]) {
      return decodeURIComponent(parts[campaignIndex + 1]);
    }

    return null;
  } catch {
    return null;
  }
}

async function safeCopy(text: string) {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.left = "-9999px";

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const success = document.execCommand("copy");
    document.body.removeChild(textarea);

    return success;
  }

  return false;
}

export default function CampaignCardMenu({
  viewHref,
  inviteHref,
  campaignStatus,
  isDraft,
  isFullyManaged = false,
}: Props) {
  const [open, setOpen] = useState(false);

  const isDraftCampaign =
    String(campaignStatus || "").trim().toLowerCase() === "draft" ||
    isDraft === true ||
    Number(isDraft) === 1;

  const goTo = (href: string) => {
    if (typeof window !== "undefined") {
      window.location.href = href;
    }
    setOpen(false);
  };

  const copyLink = async () => {
    try {
      const campaignId = extractCampaignId(viewHref);

      if (!campaignId) {
        throw new Error("Campaign ID not found");
      }

      const brandId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("brandId") ||
          window.localStorage.getItem("brandID") ||
          window.localStorage.getItem("brand_id")
          : null;

      if (!brandId) {
        throw new Error("Brand ID missing");
      }

      const res: any = await apiEnableCampaignShare({
        brandId,
        campaignId,
      });

      const shareUrl = res?.shareUrl || res?.data?.shareUrl;

      if (!shareUrl) {
        throw new Error("Share URL not returned");
      }

      const copied = await safeCopy(shareUrl);

      if (copied) {
        toast({
          icon: "success",
          title: "Public link copied",
          text: "Campaign public link has been copied to your clipboard.",
        });
      } else {
        window.prompt("Copy this public link:", shareUrl);

        toast({
          icon: "info",
          title: "Public link ready",
          text: "Copy the public campaign link from the popup.",
        });
      }
    } catch (err) {
      console.error("Copy public link failed:", err);

      toast({
        icon: "error",
        title: "Unable to copy link",
        text: err instanceof Error ? err.message : "Please try again.",
      });
    }

    setOpen(false);
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-[2.85rem] items-center justify-center bg-background text-muted-foreground shadow-none hover:text-tx-secondary cursor-pointer"
          aria-label="More options"
        >
          <DotsThree size={18} weight="bold" />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 w-[13.75rem] rounded-[1rem] border border-[#ECECEC] bg-white p-2 shadow-[0_18px_40px_rgba(0,0,0,0.14)]"
        >
          <button
            type="button"
            onClick={() => goTo(viewHref)}
            className={itemCls}
          >
            <Eye size={18} weight="regular" />
            <span>View</span>
          </button>

          {!isDraftCampaign && !isFullyManaged ? (
            <>
              <button
                type="button"
                onClick={copyLink}
                className={itemCls}
              >
                <LinkSimple size={18} weight="regular" />
                <span>Copy Link</span>
              </button>

              <button
                type="button"
                onClick={() => goTo(inviteHref)}
                className={itemCls}
              >
                <PaperPlaneTilt size={18} weight="regular" />
                <span>Invite Influencers</span>
              </button>
            </>
          ) : null}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}