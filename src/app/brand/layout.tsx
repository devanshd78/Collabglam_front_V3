"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import BrandScaffold from "@/components/ui/brand/brandScaffold";
import { Loader } from "@/components/ui/loader";

export default function BrandAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [hasBrandId, setHasBrandId] = useState(false);

  const PUBLIC_NO_SCAFFOLD_ROUTES = useMemo(
    () => [
      "/brand/login",
      "/brand/signup",
      "/brand/forgot-password",
      "/brand/onboarding",
    ],
    []
  );

  const AUTH_NO_SCAFFOLD_ROUTES = useMemo(
    () => [
      "/brand/influencer-invitation",
    ],
    []
  );

  const isPublicNoScaffoldRoute = PUBLIC_NO_SCAFFOLD_ROUTES.some(
    (route) => pathname === route
  );

  const isAuthNoScaffoldRoute = AUTH_NO_SCAFFOLD_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const skipScaffold = isPublicNoScaffoldRoute || isAuthNoScaffoldRoute;

  useEffect(() => {
    if (isPublicNoScaffoldRoute) {
      setCheckingAuth(false);
      setHasBrandId(true);
      return;
    }

    const token = window.localStorage.getItem("token");

    const brandId =
      window.localStorage.getItem("brandId") ||
      window.localStorage.getItem("currentBrandId");

    if (!token || !brandId) {
      setHasBrandId(false);
      setCheckingAuth(false);

      const returnUrl = `${window.location.pathname}${window.location.search}`;

      router.replace(`/brand/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setHasBrandId(true);
    setCheckingAuth(false);
  }, [router, pathname, isPublicNoScaffoldRoute]);

  if (isPublicNoScaffoldRoute) {
    return <>{children}</>;
  }

  if (checkingAuth) {
    return (
      <div className="flex h-dvh items-center justify-center bg-white">
        <Loader logoSrc="/logo.png" />
      </div>
    );
  }

  if (!hasBrandId) {
    return null;
  }

  if (skipScaffold) {
    return <>{children}</>;
  }

  return (
    <div className="h-dvh overflow-hidden">
      <BrandScaffold>{children}</BrandScaffold>
    </div>
  );
}