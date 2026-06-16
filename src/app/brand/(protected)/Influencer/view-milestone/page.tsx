"use client";

import { Suspense } from "react";
import ViewMilestonePage from "./viewMilestone";

export default function ViewMilestone() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <ViewMilestonePage />
    </Suspense>
  );
}
