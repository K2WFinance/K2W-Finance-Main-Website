"use client";

import { useEffect } from "react";
import { captureLandingAttribution } from "@/lib/utm";

export function UtmCapture() {
  useEffect(() => {
    // Passive mount capture. If collection is disabled (the default),
    // this safely no-ops without accessing storage or mutating state.
    captureLandingAttribution();
  }, []);

  return null;
}
