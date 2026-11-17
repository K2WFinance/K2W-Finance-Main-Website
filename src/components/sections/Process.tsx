"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function Process() {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.from(".steps article", {
        y: 14,
        opacity: 0.55,
        stagger: 0.08,
        duration: 0.5,
        ease: "power3.out",
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: ".steps",
          start: "top 85%",
          once: true,
        },
      });
    }, containerRef);

    return () => {
      ctx.revert();
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
