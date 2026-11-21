"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowIcon, GoalIcon } from "../ui/Icons";
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
          <div className="goal-nav" aria-label="Choose a financial goal">
            {GOAL_KEYS.map((key) => {
              const goal = GOALS_DATA[key];
              const isSelected = key === selectedKey;
              return (
                <button
                  key={key}
                  type="button"
                  className="goal"
                  data-goal={key}
                  aria-pressed={isSelected}
                  onClick={() => handleGoalSelect(key)}
                >
                  <span aria-hidden="true">
                    <GoalIcon goal={key} />
                  </span>
                  {goal.navLabel}
                </button>
              );
            })}
          </div>

          <div ref={detailRef} className="goal-detail" aria-live="polite">
            <div>
              <span id="goal-horizon" hidden>
                {selectedGoal.horizon}
              </span>
              <h3 id="goal-title">{selectedGoal.title}</h3>
              <p id="goal-copy">{selectedGoal.copy}</p>
              <Link
                href="#contact"
                id="goal-cta"
                onClick={handleCtaClick}
              >
                Plan for this goal <ArrowIcon />
              </Link>
            </div>

            <div className="goal-number">
              <span className="goal-card-icon" aria-hidden="true">
                <GoalIcon goal={selectedKey} />
              </span>
              <small id="goal-kicker">
                <FormattedFinancial text={selectedGoal.kicker} />
              </small>
              <strong id="goal-number">
                <FormattedFinancial text={selectedGoal.number} />
              </strong>
              <small id="goal-unit">{selectedGoal.unit}</small>
              <p id="goal-footnote">
                <FormattedFinancial text={selectedGoal.footnote} />
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
