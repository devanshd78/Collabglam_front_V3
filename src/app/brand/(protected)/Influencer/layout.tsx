// app/brand/layout.tsx (or wherever your layout is located)
"use client";

import { Suspense } from "react";
import InfluencerNavbar from "./InfluencerNavbar";
import { InfluencerCountsProvider } from "./InfluencerCountsContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <InfluencerCountsProvider>
      <div className="min-h-screen w-full bg-background">
        <Suspense fallback={null}>
          <InfluencerNavbar />
        </Suspense>
        <main className="w-full">
          <Suspense fallback={null}>{children}</Suspense>
        </main>
      </div>
    </InfluencerCountsProvider>
  );
}