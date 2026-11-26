"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadIndex } from "@/lib/indexer";

export function useIndex() {
  return useQuery({ queryKey: ["index"], queryFn: () => loadIndex(), refetchInterval: 15_000 });
}

/** After a transaction: load logs up to the receipt's block and push them to every list. */
export function useRefreshIndex() {
  const qc = useQueryClient();
  return async (block: bigint) => {
    qc.setQueryData(["index"], await loadIndex(block));
  };
}
