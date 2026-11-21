"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowIcon, CheckIcon } from "../ui/Icons";
import {
  CalculatorMode,
  CALCULATOR_CONFIGS,
  calculateValues,
  formatIndianCurrency,
  formatRate,
  formatTenure,
  getProductRateForTenure,
} from "@/lib/calculator";

export function PlanExplorer() {
  const [mode, setMode] = useState<CalculatorMode>("growth");
  const config = CALCULATOR_CONFIGS[mode];

  const [amount, setAmount] = useState<number>(config.defaultAmount);
  const [rate, setRate] = useState<number>(config.defaultRate);
  const [tenure, setTenure] = useState<number>(config.defaultTenure);

  const containerRef = useRef<HTMLElement>(null);

  // Switch mode handler
  const handleModeChange = (newMode: CalculatorMode) => {
    setMode(newMode);
    const newConfig = CALCULATOR_CONFIGS[newMode];
    setAmount(newConfig.defaultAmount);
    setRate(newConfig.defaultRate);
    setTenure(newConfig.defaultTenure);
  };

  const handleTenureChange = (newTenure: number) => {
    setTenure(newTenure);
    const scheduledRate = getProductRateForTenure(mode, newTenure);
    setRate(scheduledRate);
  };

  const { formattedResult, resultLabel, resultNote } = calculateValues(
    mode,
    amount,
    rate,
    tenure
  );

  // GSAP scroll-reveal animation
  useEffect(() => {
    const root = containerRef.current;
    if (typeof window === "undefined" || !root) return;

    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    mm.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        gsap.from(
          ".feature-copy h2, .feature-copy > p, .feature-copy .text-link, .feature-points > div",
          {
            y: 20,
            opacity: 0,
            stagger: 0.07,
            duration: 0.6,
            ease: "power3.out",
            clearProps: "transform,opacity",
            scrollTrigger: {
              trigger: root,
              start: "top 84%",
              once: true,
            },
          }
        );

        gsap.from(".calc", {
          y: 24,
          opacity: 0,
          duration: 0.65,
          delay: 0.08,
          ease: "power3.out",
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: root,
            start: "top 80%",
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
    <div className="feature-shell">
      <section ref={containerRef} className="feature" id="plan-explorer">
        <div className="wrap feature-grid">
          <div className="feature-copy">
            <h2>
              Your savings.
              <br />
              With a purpose.
            </h2>
            <p>
              A one-time amount. A monthly habit. A plan for regular income.
              Explore how your savings could support the next chapter of your
              life.
            </p>
            <Link className="text-link" href="#goals">
              Find your starting point <ArrowIcon />
            </Link>

            <div className="feature-points">
              <div>
                <CheckIcon />
                <span>Adjust the amount to your budget.</span>
              </div>
              <div>
                <CheckIcon />
                <span>Choose a timeline that fits your goal.</span>
              </div>
              <div>
                <CheckIcon />
                <span>Understand the assumptions before you decide.</span>
              </div>
            </div>
          </div>

          <div className="calc" id="calculator">
            <div className="calc-top">
              <h2>Explore your possibilities.</h2>
            </div>

            <div className="seg" aria-label="Calculator type">
              <button
                type="button"
                data-mode="growth"
                aria-pressed={mode === "growth"}
                onClick={() => handleModeChange("growth")}
              >
                One-time savings
              </button>
              <button
                type="button"
                data-mode="monthly"
                aria-pressed={mode === "monthly"}
                onClick={() => handleModeChange("monthly")}
              >
                Monthly savings
              </button>
              <button
                type="button"
                data-mode="income"
                aria-pressed={mode === "income"}
                onClick={() => handleModeChange("income")}
              >
                Monthly income
              </button>
            </div>

            <label htmlFor="amount">
              <span id="amount-label">{config.amountLabel}</span>
              <b id="amount-value">{formatIndianCurrency(amount)}</b>
            </label>
            <input
              type="range"
              id="amount"
              min={config.minAmount}
              max={config.maxAmount}
              step={config.stepAmount}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />

            <label htmlFor="rate">
              Illustrative annual rate{" "}
              <b id="rate-value">{formatRate(rate)}</b>
            </label>
            <input
              type="range"
              id="rate"
              min={config.minRate}
              max={config.maxRate}
              step={config.stepRate}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
            />

            <div id="tenure-control" hidden={!config.hasTenure}>
              <label htmlFor="tenure">
                <span id="tenure-label">
                  {config.tenureLabel || "Time to grow"}
                </span>{" "}
                <b id="tenure-value">{formatTenure(tenure)}</b>
              </label>
              <input
                type="range"
                id="tenure"
                min={config.minTenure}
                max={config.maxTenure}
                step={config.stepTenure}
                value={tenure}
                onChange={(e) => handleTenureChange(Number(e.target.value))}
              />
            </div>

            <div className="out" aria-live="polite">
              <small id="result-label">{resultLabel}</small>
              <div className="big" id="result">
                {formattedResult}
              </div>
              <p id="result-note">
                {resultNote.incomeNote ? (
                  resultNote.incomeNote
                ) : (
                  <>
                    <span className="financial-value">
                      {resultNote.investedPart?.split(" ")[0]}
                    </span>{" "}
                    contributed +{" "}
                    <span className="financial-value">
                      {resultNote.growthPart?.split(" ")[0]}
                    </span>{" "}
                    estimated growth
                  </>
                )}
              </p>
            </div>

            <Link href="#contact" className="btn primary">
              Discuss this plan <ArrowIcon />
            </Link>

            <p className="calc-foot" id="calc-disclaimer">
              {config.disclaimer}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
