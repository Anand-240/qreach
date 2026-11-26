"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CheckBox({ initial = "", big = false }: { initial?: string; big?: boolean }) {
  const [v, setV] = useState(initial);
  const router = useRouter();
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim()) router.push(`/check?u=${encodeURIComponent(v.trim())}`);
      }}
    >
      <input
        className={`input ${big ? "min-h-[60px] text-lg" : ""}`}
        placeholder="Paste a post link: x.com/riya/status/123..."
        value={v}
        onChange={(e) => setV(e.target.value)}
        aria-label="Post link"
        inputMode="url"
        autoComplete="off"
      />
      <button className={`btn btn-pink ${big ? "btn-lg" : ""}`} type="submit" disabled={!v.trim()}>
        Is this post paid?
      </button>
    </form>
  );
}
