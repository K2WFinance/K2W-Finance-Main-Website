"use client";

import React from "react";
import Link from "next/link";
import { ArrowIcon } from "../ui/Icons";
import { selectInterest, GoalInterest } from "@/lib/interest-events";

export function Solutions() {
  const handlePreselect = (interest: GoalInterest) => {
    selectInterest(interest);
  };

  return (
    <section className="section solutions" id="solutions">
      <div className="wrap">
        <div className="split-section">
          <div className="split-heading">
            <h2>
              Different goals.
              <br />
              Different ways
              <br />
              to save.
            </h2>
            <p>
              Understand how each deposit structure works before choosing a plan
              for your time horizon and cash-flow needs.
            </p>
            <Link href="#contact" className="text-link">
              Let’s explore your options <ArrowIcon />
            </Link>
          </div>

          <div className="solution-list">
            <details open>
              <summary>Fixed deposits</summary>
              <p>
                Put a one-time amount towards a future milestone, with a defined
                tenure and product-specific terms. Match the maturity date to
                your goal and review early withdrawal conditions.
              </p>
              <ul>
                <li>For existing savings</li>
                <li>A defined time horizon</li>
              </ul>
              <Link
                href="#contact"
                className="text-link"
                data-interest="Fixed deposits"
                onClick={() => handlePreselect("Fixed deposits")}
              >
                Discuss fixed deposits <ArrowIcon />
              </Link>
            </details>

            <details>
              <summary>Recurring deposits</summary>
              <p>
                Set aside a manageable amount each month for a vehicle, home down
                payment or family milestone. Build the contribution around your
                budget and review missed-payment conditions.
              </p>
              <ul>
                <li>For regular monthly savings</li>
                <li>A consistent contribution habit</li>
              </ul>
              <Link
                href="#contact"
                className="text-link"
                data-interest="Recurring deposits"
                onClick={() => handlePreselect("Recurring deposits")}
              >
                Discuss recurring deposits <ArrowIcon />
              </Link>
            </details>

            <details>
              <summary>Monthly income plans</summary>
              <p>
                Explore deposit options with periodic payouts to help plan
                ongoing expenses or retirement. Understand the payout schedule,
                issuer risk, liquidity and repayment terms before committing.
              </p>
              <ul>
                <li>For an available lump sum</li>
                <li>Regular payout planning</li>
              </ul>
              <Link
                href="#contact"
                className="text-link"
                data-interest="Monthly income plans"
                onClick={() => handlePreselect("Monthly income plans")}
              >
                Discuss income plans <ArrowIcon />
              </Link>
            </details>
          </div>
        </div>

        <p className="help-note">
          Product availability, eligibility, rates and terms require confirmation
          with the relevant provider. Co-operative society deposits and bank
          deposits have different protections and conditions.
        </p>
      </div>
    </section>
  );
}
