import React from "react";
import Link from "next/link";

interface LogoProps {
  className?: string;
}

export function Logo({ className = "" }: LogoProps) {
  return (
    <Link
      href="#top"
      className={`logo logo-art ${className}`.trim()}
      aria-label="K2WFINANCE home"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/k2wfinance-logo.png"
        alt=""
        width={1600}
        height={533}
      />
    </Link>
  );
}
