"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function Process() {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (typeof window === "undefined" || !root) return;

    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    mm.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        gsap.from(".section-header > *", {
          y: 20,
          opacity: 0,
          stagger: 0.08,
          duration: 0.6,
          ease: "power3.out",
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: ".section-header",
            start: "top 88%",
            once: true,
          },
        });

        gsap.from(".steps article", {
          y: 22,
          opacity: 0,
          stagger: 0.08,
          duration: 0.55,
          ease: "power3.out",
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: ".steps",
            start: "top 86%",
            once: true,
          },
        });
      },
      root
    );

    return () => {
      mm.revert();
    };
  }, []);

  return (
    <section ref={containerRef} className="section process" id="process">
      <div className="wrap">
        <div className="section-header">
          <h2>
            Less guesswork.
            <br />
            More intention.
          </h2>
          <p>
            A simple conversation can help turn your financial ambitions into a
            roadmap you can understand.
          </p>
        </div>

        <div className="steps">
          <article>
            <span className="step-number">01</span>
            <h3>Map your milestones</h3>
            <p>
              Discuss upcoming commitments, available savings and the things you
              want to make possible.
            </p>
          </article>

          <article>
            <span className="step-number">02</span>
            <h3>Explore the options</h3>
            <p>
              Compare structures, timelines and provider terms against your needs
              and comfort with risk.
            </p>
          </article>

          <article>
            <span className="step-number">03</span>
            <h3>Plan contributions</h3>
            <p>
              Decide what you can set aside and review the documentation before
              proceeding.
            </p>
          </article>

          <article>
            <span className="step-number">04</span>
            <h3>Review your progress</h3>
            <p>
              Revisit your roadmap as your income, responsibilities and goals
              evolve.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
