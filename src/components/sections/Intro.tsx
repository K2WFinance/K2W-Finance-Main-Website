import React from "react";
import { ScrollReveal } from "../motion/ScrollReveal";

export function Intro() {
  return (
    <section className="intro" aria-label="Our purpose">
      <ScrollReveal className="wrap" selector="p" y={24} duration={0.65}>
        <p>
          The future isn’t one big goal.
          <br />
          <span>It’s all the things that matter.</span>
        </p>
      </ScrollReveal>
    </section>
  );
}
