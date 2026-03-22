"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function MobileRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // only redirect from homepage
    if (pathname !== "/") return;

    // mobile screen check
    if (window.innerWidth < 768) {
      router.replace("/book");
    }
  }, [pathname, router]);

  return null;
}
