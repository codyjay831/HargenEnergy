"use client";

import { useEffect } from "react";

interface ScrollToHashProps {
  hash: string;
}

export function ScrollToHash({ hash }: ScrollToHashProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== hash) return;

    const id = hash.replace(/^#/, "");
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [hash]);

  return null;
}
