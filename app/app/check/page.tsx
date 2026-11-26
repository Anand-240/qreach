import { Suspense } from "react";
import CheckClient from "./CheckClient";

export const metadata = { title: "Is this post paid? - PaidPost" };

export default function Page() {
  return (
    <Suspense>
      <CheckClient />
    </Suspense>
  );
}
