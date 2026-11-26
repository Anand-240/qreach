import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl space-y-6 py-10 text-center">
      <div className="display text-[clamp(5rem,20vw,10rem)] leading-none">404</div>
      <p className="text-lg">This page does not exist.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn">Home</Link>
        <Link href="/check" className="btn btn-pink">Check a post</Link>
      </div>
    </div>
  );
}
