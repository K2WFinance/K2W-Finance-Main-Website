"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FormattedFinancial } from "../ui/FormattedFinancial";
import { GOALS_DATA, GOAL_KEYS, GoalKey } from "@/lib/goals-data";
import { selectInterest } from "@/lib/interest-events";

export function Goals() {
  const [selectedKey, setSelectedKey] = useState<GoalKey>(GOAL_KEYS[0]);
  const containerRef = useRef<HTMLElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const selectedGoal = GOALS_DATA[selectedKey];

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

        gsap.from(".goal-nav .goal", {
          y: 16,
          opacity: 0,
          stagger: 0.06,
          duration: 0.5,
          ease: "power3.out",
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: ".goal-layout",
            start: "top 86%",
            once: true,
          },
        });

        gsap.from(".goal-detail", {
          y: 22,
          opacity: 0,
          duration: 0.6,
          delay: 0.1,
          ease: "power3.out",
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: ".goal-layout",
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

  const handleGoalSelect = (key: GoalKey) => {
    setSelectedKey(key);

    if (typeof window !== "undefined") {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (!reducedMotion && detailRef.current) {
        gsap.fromTo(
          detailRef.current,
          { opacity: 0.7 },
          { opacity: 1, duration: 0.16, overwrite: true, clearProps: "opacity" }
        );
      }
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });
    }
  };

  const handleCtaClick = () => {
    selectInterest(selectedGoal.interest);
  };

  return (
    <section ref={containerRef} className="section" id="goals">
      <div className="wrap">
        <div className="section-header">
          <h2>
            Big moments.
            <br />
            Thoughtful beginnings.
          </h2>
          <p>
            Your money has more meaning when it has a destination. Start with
            the milestone that matters to you.
          </p>
        </div>

        <div className="goal-layout">
          <div className="goal-nav" role="tablist" aria-label="Goals">
            {GOAL_KEYS.map((key) => {
              const goal = GOALS_DATA[key];
              const isSelected = key === selectedKey;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  className={`goal${isSelected ? " active" : ""}`}
                  data-goal={key}
                  aria-selected={isSelected}
                  aria-pressed={isSelected}
                  onClick={() => handleGoalSelect(key)}
                >
                  {goal.navLabel}
                </button>
              );
            })}
          </div>

          <div ref={detailRef} className="goal-detail" aria-live="polite">
            <div className="goal-detail-main">
              <p id="goal-horizon" className="goal-tag">
                {selectedGoal.horizon}
              </p>
              <h3 id="goal-title">{selectedGoal.title}</h3>
              <p id="goal-copy">{selectedGoal.copy}</p>
              <div className="goal-suggested">
                <span className="suggested-pill">
                  Suggested option: {selectedGoal.suggestedOption || "Fixed deposits, laddered"}
                </span>
              </div>
              <Link
                href="#contact"
                id="goal-cta"
                className="btn primary rounded-pill goal-cta-btn"
                onClick={handleCtaClick}
              >
                Plan for this goal
              </Link>
            </div>

            <div className="goal-number example-plan-card">
              <p id="goal-kicker" className="example-label">
                <FormattedFinancial text={selectedGoal.kicker} />
              </p>
              <p className="example-val">
                <strong id="goal-number">
                  <FormattedFinancial text={selectedGoal.number} />
                </strong>
                {selectedGoal.unit ? (
                  <span id="goal-unit" className="example-unit">
                    {" "}
                    {selectedGoal.unit}
                  </span>
                ) : null}
              </p>
              <p id="goal-footnote" className="example-sub">
                <FormattedFinancial text={selectedGoal.footnote} />
              </p>
              <p className="example-disclaimer">
                Example only. Try your own numbers in the{" "}
                <a href="#plan-explorer" className="calc-link">
                  calculator above
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
