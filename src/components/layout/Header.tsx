import React from "react";
import Link from "next/link";
import { Logo } from "../ui/Logo";
import { ArrowIcon } from "../ui/Icons";
import { MobileNav } from "./MobileNav";

export function Header() {
  return (
    <header className="site-header">
      <nav className="wrap header-inner" aria-label="Main navigation">
        <div className="logo-group">
          <Logo />
          <span className="header-tagline">
            Your Partner in Financial Growth
          </span>
        </div>

        <div className="navlinks">
          <Link href="#goals">Your goals</Link>
          <Link href="#solutions">Savings options</Link>
          <Link href="#process">Our approach</Link>
          <Link href="#contact">Consultation</Link>
          <Link href="#faqs">FAQs</Link>
        </div>

        <div className="nav-actions">
          <Link className="btn primary sm" href="#contact">
            Let’s talk <ArrowIcon />
          </Link>
          <MobileNav />
        </div>
      </nav>
    </header>
  );
}
