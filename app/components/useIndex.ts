"use client";
import { useQuery } from "@tanstack/react-query";
import { loadIndex } from "@/lib/indexer";

export function useIndex() {
  return useQuery({ queryKey: ["index"], queryFn: loadIndex, refetchInterval: 15_000 });
}
