"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { publicClient } from "@/lib/clients";

/**
 * The current time as the chain sees it (latest block timestamp, advanced by the local clock).
 * The contract compares deadlines with block.timestamp, so buttons are enabled by this clock.
 * Returns 0 until the first read, so nothing time-dependent renders on the server.
 */
export function useChainNow() {
  const { data: offset } = useQuery({
    queryKey: ["chainClockOffset"],
    queryFn: async () => {
      const b = await publicClient.getBlock();
      return Number(b.timestamp) - Date.now() / 1000;
    },
    refetchInterval: 20_000,
  });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 5_000);
    return () => clearInterval(t);
  }, []);
  void tick;
  return offset === undefined ? 0 : Math.floor(Date.now() / 1000 + offset);
}
