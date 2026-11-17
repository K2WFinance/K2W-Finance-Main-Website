"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowIcon } from "../ui/Icons";

export function BrandStory() {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.from(".story-image", {
        clipPath: "inset(0 0 12% 0)",
        opacity: 0.7,
        duration: 0.65,
        ease: "power3.out",
        clearProps: "clipPath,opacity",
        scrollTrigger: {
          trigger: ".brand-story",
          start: "top 80%",
          once: true,
        },
      });
    }, containerRef);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <section ref={containerRef} className="brand-story">
      <div className="wrap story-grid">
        <div className="story-image">
          <Image
            src="/assets/family-moment.webp"
            alt="A mother spending time with her children and a tablet at home"
            width={1600}
            height={1067}
            loading="lazy"
            sizes="(max-width: 820px) 100vw, 50vw"
          />
        </div>
        <div className="story-copy">
          <h2>
            For the life
            <br />
            you’re building.
          </h2>
          <p>
            A meaningful financial roadmap begins with your commitments, your
            comfort with risk, and the people and moments that matter to you.
          </p>
          <p>
            Keep the plan practical. Choose contributions that work with your
            income, leave room for emergencies, and review when life changes.
          </p>
          <Link className="text-link" href="#contact">
            Start with your story <ArrowIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}
