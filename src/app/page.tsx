import React from "react";
import { Hero } from "@/components/sections/Hero";
import { Intro } from "@/components/sections/Intro";
import { PlanExplorer } from "@/components/sections/PlanExplorer";
import { Goals } from "@/components/sections/Goals";
import { Solutions } from "@/components/sections/Solutions";
import { Process } from "@/components/sections/Process";
import { BrandStory } from "@/components/sections/BrandStory";
import { Faqs } from "@/components/sections/Faqs";
import { ContactForm } from "@/components/sections/ContactForm";

export default function HomePage() {
  return (
    <main id="main">
      <Hero />
      <Intro />
      <PlanExplorer />
      <Goals />
      <Solutions />
      <Process />
      <BrandStory />
      <Faqs />
      <ContactForm />
    </main>
  );
}
