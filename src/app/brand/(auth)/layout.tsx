import { Suspense } from "react";

export default function BrandAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full">
      <Suspense fallback={null}>
        {children}
      </Suspense>
    </div>
  );
}