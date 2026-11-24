"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { selectInterest, GoalInterest } from "@/lib/interest-events";

export function Solutions() {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (typeof window === "undefined" || !root) return;

    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    mm.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        gsap.from(".split-heading > *", {
          y: 20,
          opacity: 0,
          stagger: 0.08,
          duration: 0.6,
          ease: "power3.out",
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: ".split-section",
            start: "top 86%",
            once: true,
          },
        });

        gsap.from(".solution-list details", {
          y: 20,
          opacity: 0,
          stagger: 0.09,
          duration: 0.55,
          ease: "power3.out",
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: ".solution-list",
            start: "top 86%",
            once: true,
          },
        });

        gsap.from(".help-note", {
          y: 14,
          opacity: 0,
          duration: 0.5,
          ease: "power3.out",
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: ".help-note",
            start: "top 92%",
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

  const handlePreselect = (interest: GoalInterest) => {
    selectInterest(interest);
  };

  return (
    <section ref={containerRef} className="section solutions" id="solutions">
      <div className="wrap">
        <div className="split-section">
          <div className="split-heading">
            <h2>
              Different goals.
              <br />
              Different ways to
              <br />
              save.
            </h2>
            <p>
              Understand how each deposit structure works before choosing a plan
              for your time horizon and cash-flow needs.
            </p>
            <Link href="#contact" className="btn primary rounded-pill solution-hero-btn">
              Let&apos;s explore your options
            </Link>
          </div>

          <div className="solution-right-col">
            <div className="solution-list">
              <details open>
                <summary>Fixed deposits</summary>
                <div className="solution-body">
                  <p>
                    Put a one-time amount towards a future milestone, with a defined
                    tenure and product-specific terms. Match the maturity date to
                    your goal and review early withdrawal conditions.
                  </p>
                  <ul className="solution-checklist">
                    <li>
                      <span className="check-orange" aria-hidden="true">✓</span>{" "}
                      For existing savings
                    </li>
                    <li>
                      <span className="check-orange" aria-hidden="true">✓</span>{" "}
                      A defined time horizon
                    </li>
                  </ul>
                  <Link
                    href="#contact"
                    className="solution-link text-link"
                    data-interest="Fixed deposits"
                    onClick={() => handlePreselect("Fixed deposits")}
                  >
                    Discuss fixed deposits →
                  </Link>
                </div>
              </details>

              <details>
                <summary>Recurring deposits</summary>
                <div className="solution-body">
                  <p>
                    Set aside a manageable amount each month for a vehicle, home down
                    payment or family milestone. Build the contribution around your
                    budget and review missed-payment conditions.
                  </p>
                  <ul className="solution-checklist">
                    <li>
                      <span className="check-orange" aria-hidden="true">✓</span>{" "}
                      For regular monthly savings
                    </li>
                    <li>
                      <span className="check-orange" aria-hidden="true">✓</span>{" "}
                      A consistent contribution habit
                    </li>
                  </ul>
                  <Link
                    href="#contact"
                    className="solution-link text-link"
                    data-interest="Recurring deposits"
                    onClick={() => handlePreselect("Recurring deposits")}
                  >
                    Discuss recurring deposits →
                  </Link>
                </div>
              </details>

              <details>
                <summary>Monthly income plans</summary>
                <div className="solution-body">
                  <p>
                    Explore deposit options with periodic payouts to help plan
                    ongoing expenses or retirement. Understand the payout schedule,
                    issuer risk, liquidity and repayment terms before committing.
                  </p>
                  <ul className="solution-checklist">
                    <li>
                      <span className="check-orange" aria-hidden="true">✓</span>{" "}
                      For an available lump sum
                    </li>
                    <li>
                      <span className="check-orange" aria-hidden="true">✓</span>{" "}
                      Regular payout planning
                    </li>
                  </ul>
                  <Link
                    href="#contact"
                    className="solution-link text-link"
                    data-interest="Monthly income plans"
                    onClick={() => handlePreselect("Monthly income plans")}
                  >
                    Discuss income plans →
                  </Link>
                </div>
              </details>
            </div>

            <p className="help-note">
              Product availability, eligibility, rates and terms require confirmation
              with the relevant provider. Co-operative society deposits and bank
              deposits have different protections and conditions.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
