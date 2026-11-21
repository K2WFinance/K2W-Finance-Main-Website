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

  const [amountText, setAmountText] = useState<string>(
    config.defaultAmount.toLocaleString("en-IN")
  );
  const [rateText, setRateText] = useState<string>(String(config.defaultRate));
  const [tenureText, setTenureText] = useState<string>(
    String(config.defaultTenure)
  );

  const containerRef = useRef<HTMLElement>(null);

  // Switch mode handler
  const handleModeChange = (newMode: CalculatorMode) => {
    setMode(newMode);
    const newConfig = CALCULATOR_CONFIGS[newMode];
    setAmount(newConfig.defaultAmount);
    setRate(newConfig.defaultRate);
    setTenure(newConfig.defaultTenure);
    setAmountText(newConfig.defaultAmount.toLocaleString("en-IN"));
    setRateText(String(newConfig.defaultRate));
    setTenureText(String(newConfig.defaultTenure));
  };

  const handleTenureChange = (newTenure: number) => {
    setTenure(newTenure);
    const scheduledRate = getProductRateForTenure(mode, newTenure);
    setRate(scheduledRate);
    setRateText(String(scheduledRate));
  };

  // Amount handlers
  const handleAmountSlider = (val: number) => {
    setAmount(val);
    setAmountText(val.toLocaleString("en-IN"));
  };

  const handleAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setAmountText(raw);
    const cleanDigits = raw.replace(/[^0-9]/g, "");
    if (cleanDigits) {
      const num = parseInt(cleanDigits, 10);
      if (!isNaN(num) && num > 0) {
        setAmount(Math.min(num, config.maxAmount));
      }
    }
  };

  const handleAmountInputBlur = () => {
    const cleanDigits = amountText.replace(/[^0-9]/g, "");
    let num = parseInt(cleanDigits, 10);
    if (isNaN(num) || num < config.minAmount) num = config.minAmount;
    if (num > config.maxAmount) num = config.maxAmount;
    setAmount(num);
    setAmountText(num.toLocaleString("en-IN"));
  };

  // Rate handlers
  const handleRateSlider = (val: number) => {
    setRate(val);
    setRateText(String(val));
  };

  const handleRateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setRateText(raw);
    const num = parseFloat(raw);
    if (!isNaN(num) && num > 0) {
      setRate(Math.min(num, config.maxRate));
    }
  };

  const handleRateInputBlur = () => {
    let num = parseFloat(rateText);
    if (isNaN(num) || num < config.minRate) num = config.minRate;
    if (num > config.maxRate) num = config.maxRate;
    setRate(num);
    setRateText(String(num));
  };

  // Tenure handlers
  const handleTenureSlider = (val: number) => {
    setTenure(val);
    setTenureText(String(val));
    const scheduledRate = getProductRateForTenure(mode, val);
    setRate(scheduledRate);
    setRateText(String(scheduledRate));
  };

  const handleTenureInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setTenureText(raw);
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num > 0) {
      const clamped = Math.min(num, config.maxTenure);
      setTenure(clamped);
      const scheduledRate = getProductRateForTenure(mode, clamped);
      setRate(scheduledRate);
      setRateText(String(scheduledRate));
    }
  };

  const handleTenureInputBlur = () => {
    let num = parseInt(tenureText, 10);
    if (isNaN(num) || num < config.minTenure) num = config.minTenure;
    if (num > config.maxTenure) num = config.maxTenure;
    setTenure(num);
    setTenureText(String(num));
    const scheduledRate = getProductRateForTenure(mode, num);
    setRate(scheduledRate);
    setRateText(String(scheduledRate));
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
              <p className="calc-hint">
                Type any value directly or adjust with the sliders.
              </p>
            </div>

            <div className="seg" aria-label="Calculator type">
              <button
                type="button"
                data-mode="growth"
                aria-pressed={mode === "growth"}
                onClick={() => handleModeChange("growth")}
              >
                Fixed deposit
              </button>
              <button
                type="button"
                data-mode="monthly"
                aria-pressed={mode === "monthly"}
                onClick={() => handleModeChange("monthly")}
              >
                Recurring deposit
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

            <div className="calc-field">
              <div className="calc-row-label">
                <label htmlFor="amount-input" id="amount-label">
                  {config.amountLabel}
                </label>
                <div className="calc-input-box">
                  <span className="calc-affix" aria-hidden="true">
                    ₹
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    id="amount-input"
                    className="calc-number-input"
                    aria-label={`${config.amountLabel} value`}
                    value={amountText}
                    onChange={handleAmountInputChange}
                    onBlur={handleAmountInputBlur}
                  />
                  <b
                    id="amount-value"
                    className="calc-sr-value"
                    aria-hidden="true"
                  >
                    {formatIndianCurrency(amount)}
                  </b>
                </div>
              </div>
              <input
                type="range"
                id="amount"
                aria-label={`${config.amountLabel} slider`}
                min={config.minAmount}
                max={config.maxAmount}
                step={config.stepAmount}
                value={amount}
                onChange={(e) => handleAmountSlider(Number(e.target.value))}
              />
            </div>

            <div className="calc-field">
              <div className="calc-row-label">
                <label htmlFor="rate-input" id="rate-label">
                  Illustrative annual rate
                </label>
                <div className="calc-input-box">
                  <input
                    type="text"
                    inputMode="decimal"
                    id="rate-input"
                    className="calc-number-input rate-input"
                    aria-label="Illustrative annual rate value"
                    value={rateText}
                    onChange={handleRateInputChange}
                    onBlur={handleRateInputBlur}
                  />
                  <span className="calc-affix suffix" aria-hidden="true">
                    %
                  </span>
                  <b
                    id="rate-value"
                    className="calc-sr-value"
                    aria-hidden="true"
                  >
                    {formatRate(rate)}
                  </b>
                </div>
              </div>
              <input
                type="range"
                id="rate"
                aria-label="Illustrative annual rate slider"
                min={config.minRate}
                max={config.maxRate}
                step={config.stepRate}
                value={rate}
                onChange={(e) => handleRateSlider(Number(e.target.value))}
              />
            </div>

            <div
              id="tenure-control"
              className="calc-field"
              hidden={!config.hasTenure}
            >
              <div className="calc-row-label">
                <label htmlFor="tenure-input" id="tenure-label">
                  {config.tenureLabel || "Time to grow"}
                </label>
                <div className="calc-input-box">
                  <input
                    type="text"
                    inputMode="numeric"
                    id="tenure-input"
                    className="calc-number-input tenure-input"
                    aria-label={`${config.tenureLabel || "Time to grow"} value`}
                    value={tenureText}
                    onChange={handleTenureInputChange}
                    onBlur={handleTenureInputBlur}
                  />
                  <span className="calc-affix suffix" aria-hidden="true">
                    {tenure === 1 ? "Year" : "Years"}
                  </span>
                  <b
                    id="tenure-value"
                    className="calc-sr-value"
                    aria-hidden="true"
                  >
                    {formatTenure(tenure)}
                  </b>
                </div>
              </div>
              <input
                type="range"
                id="tenure"
                aria-label={`${config.tenureLabel || "Time to grow"} slider`}
                min={config.minTenure}
                max={config.maxTenure}
                step={config.stepTenure}
                value={tenure}
                onChange={(e) => handleTenureSlider(Number(e.target.value))}
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
