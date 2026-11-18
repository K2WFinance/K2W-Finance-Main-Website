"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  selector?: string;
  y?: number;
  duration?: number;
  stagger?: number;
  delay?: number;
  start?: string;
}

export function ScrollReveal({
  children,
  className,
  selector,
  y = 22,
  duration = 0.6,
  stagger = 0.08,
  delay = 0,
  start = "top 88%",
}: ScrollRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (typeof window === "undefined" || !root) return;

    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    mm.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        const targets = selector ? root.querySelectorAll(selector) : root;
        if (targets instanceof NodeList && targets.length === 0) return;

        gsap.from(targets, {
          y,
          opacity: 0,
          duration,
          delay,
          stagger: selector ? stagger : 0,
          ease: "power3.out",
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: root,
            start,
            once: true,
          },
        });
      },
      root
    );

    return () => {
      mm.revert();
    };
  }, [selector, y, duration, stagger, delay, start]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
