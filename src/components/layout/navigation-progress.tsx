"use client";

import NextTopLoader from "nextjs-toploader";

/** Thin top bar for in-app navigations (links, router.push, etc.). */
export function NavigationProgress() {
  return (
    <NextTopLoader
      color="#0d9488"
      showSpinner={false}
      height={3}
      crawlSpeed={180}
      speed={280}
      easing="ease"
      shadow="0 0 10px #0d9488,0 0 4px #0d9488"
      zIndex={1600}
    />
  );
}