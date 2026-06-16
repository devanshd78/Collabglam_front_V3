"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type InfluencerCounts = {
  all: number;
  applied:number;
  active: number;
  shortlisted: number;
  undecided: number;
  rejected: number;
};

type CountsContextType = {
  counts: InfluencerCounts;
  setCounts: (counts: InfluencerCounts) => void;
};

const CountsContext = createContext<CountsContextType | undefined>(undefined);

export function InfluencerCountsProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<InfluencerCounts>({
    all: 0,
    applied:0,
    active: 0,
    shortlisted: 0,
    undecided: 0,
    rejected: 0,
  });

  return (
    <CountsContext.Provider value={{ counts, setCounts }}>
      {children}
    </CountsContext.Provider>
  );
}

export function useInfluencerCounts() {
  const context = useContext(CountsContext);
  if (!context) {
    throw new Error("useInfluencerCounts must be used within an InfluencerCountsProvider");
  }
  return context;
}