"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ArrowIcon, DownArrowIcon } from "../ui/Icons";

export function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const imgWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) return;

    const ctx = gsap.context(() => {
      const intro = gsap.timeline({
        defaults: { duration: 0.7, ease: "power3.out" },
      });

      intro
        .from(
          ".hero h1",
          { y: 14, opacity: 0.5, clearProps: "transform,opacity" },
          0
        )
        .from(
          ".hero-art img",
          {
            clipPath: "inset(0 0 100% 0)",
            duration: 0.85,
            clearProps: "clipPath",
          },
          0
        )
        .from(
          ".hero .lead, .hero .cta",
          {
            y: 10,
            opacity: 0.35,
            stagger: 0.08,
            clearProps: "transform,opacity",
          },
          0.16
        );

      const canHover = window.matchMedia(
        "(hover: hover) and (pointer: fine)"
      ).matches;

      if (canHover && surfaceRef.current && imgWrapperRef.current) {
        const surface = surfaceRef.current;
        const art = imgWrapperRef.current;

        const x = gsap.quickTo(art, "rotationY", {
          duration: 0.45,
          ease: "power2.out",
        });
        const y = gsap.quickTo(art, "rotationX", {
          duration: 0.45,
          ease: "power2.out",
        });

        gsap.set(art, { transformPerspective: 1000 });

        const handlePointerMove = (e: PointerEvent) => {
          const box = surface.getBoundingClientRect();
          x(((e.clientX - box.left) / box.width - 0.5) * 3);
          y(-((e.clientY - box.top) / box.height - 0.5) * 3);
        };

        const handlePointerLeave = () => {
          x(0);
          y(0);
        };

        surface.addEventListener("pointermove", handlePointerMove);
        surface.addEventListener("pointerleave", handlePointerLeave);

        return () => {
          surface.removeEventListener("pointermove", handlePointerMove);
          surface.removeEventListener("pointerleave", handlePointerLeave);
          gsap.set(art, { clearProps: "transform" });
        };
      }
    }, heroRef);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <section ref={heroRef} className="hero" id="top">
      <div className="wrap">
        <div className="hero-grid">
          <div className="hero-copy">
            <h1>
              Your income.
              <br />
              Your milestones.
              <br />
              <span>A clearer plan.</span>
            </h1>
            <p className="lead">
              You work for today. Plan for everything ahead, from school fees and
              your first home to life after work. Give every milestone a place in
              your savings.
            </p>
            <div className="cta">
              <Link className="btn primary" href="#contact">
                Build my financial roadmap <ArrowIcon />
              </Link>
              <Link className="text-link" href="#goals">
                Explore my goals <ArrowIcon />
              </Link>
            </div>
          </div>

          <div ref={surfaceRef} className="hero-art">
            <div ref={imgWrapperRef}>
              <Image
                src="/assets/milestone-glass.webp"
                alt="Blue and white milestone artwork representing a home, education and retirement"
                width={1536}
                height={1024}
                priority
                sizes="(max-width: 820px) 100vw, 50vw"
              />
            </div>
            <p className="art-caption">For the life you’re building.</p>
          </div>
        </div>

        <div className="hero-bottom">
          <span>
            Your Partner in Financial Growth · A financial roadmap for working
            professionals.
          </span>
          <Link href="#plan-explorer" className="scroll-link">
            Explore what’s possible <DownArrowIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}
