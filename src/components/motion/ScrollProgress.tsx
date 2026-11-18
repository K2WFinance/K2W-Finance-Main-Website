"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.to(barRef.current, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          start: 0,
          end: "max",
          scrub: true,
        },
      });
    });

    let active = true;
    const refresh = () => {
      if (active) {
        ScrollTrigger.refresh();
      }
    };

    const handleToggle = (event: Event) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.tagName === "DETAILS"
      ) {
        refresh();
      }
    };

    document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh, { once: true });
    document.addEventListener("toggle", handleToggle, true);

    return () => {
      active = false;
      window.removeEventListener("load", refresh);
      document.removeEventListener("toggle", handleToggle, true);
      ctx.revert();
    };
  }, []);

  return <div ref={barRef} className="scroll-progress" aria-hidden="true" />;
}
