import React from "react";
import Link from "next/link";
import { Logo } from "../ui/Logo";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-top">
          <div>
            <Logo />
            <p>Your Partner in Financial Growth.</p>
          </div>
          <div className="footer-links">
            <Link href="#goals">Your goals</Link>
            <Link href="#solutions">Savings options</Link>
            <Link href="#process">Our approach</Link>
            <Link href="#contact">Consultation</Link>
            <Link href="#faqs">FAQs</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            Planning illustrations are not product offers or guaranteed
            outcomes. Rates, eligibility, taxation, liquidity and risks depend on
            the provider and applicable terms. Review the relevant product
            documents before making a decision.
          </p>
          <p className="copyright">
            © {currentYear} K2WFINANCE. Your Partner in Financial Growth.
          </p>
        </div>
      </div>
    </footer>
  );
}
