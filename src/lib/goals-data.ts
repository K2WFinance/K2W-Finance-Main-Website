import { GoalInterest } from "./interest-events";

export type GoalKey = "income" | "vehicle" | "home" | "education" | "retirement";

export interface GoalItem {
  key: GoalKey;
  navLabel: string;
  horizon: string;
  title: string;
  copy: string;
  kicker: string;
  number: string;
  unit: string;
  footnote: string;
  interest: GoalInterest;
}

export const GOALS_DATA: Record<GoalKey, GoalItem> = {
  income: {
    key: "income",
    navLabel: "Monthly expenses",
    horizon: "IMMEDIATE & ONGOING",
    title: "Make room for life’s recurring costs.",
    copy: "Explore how an available lump sum could contribute towards household bills, school fees or other regular expenses.",
    kicker: "ILLUSTRATIVE SCENARIO · ₹5 LAKH ALLOCATION",
    number: "₹4,479",
    unit: "estimated monthly payout at 10.75% p.a.",
    footnote:
      "Calculated as ₹5,00,000 × 10.75% ÷ 12. Illustrative rate only. Current availability, eligibility and terms require provider confirmation.",
    interest: "Monthly expenses",
  },
  vehicle: {
    key: "vehicle",
    navLabel: "A new vehicle",
    horizon: "YOUR NEXT 2–3 YEARS",
    title: "A new vehicle. A deliberate savings plan.",
    copy: "Work backwards from your target and purchase date. A regular savings habit can help you prepare before taking on a commitment.",
    kicker: "EXAMPLE SAVINGS TARGET",
    number: "₹3 lakh",
    unit: "towards your next vehicle",
    footnote:
      "A goal amount, not a promised maturity value. Explore contributions and assumed rates in the plan explorer.",
    interest: "A new vehicle",
  },
  home: {
    key: "home",
    navLabel: "Your own home",
    horizon: "YOUR NEXT 5 YEARS",
    title: "Give your first home a head start.",
    copy: "Create a dedicated plan for your down payment, separate from emergency funds and everyday commitments.",
    kicker: "EXAMPLE DOWN PAYMENT TARGET",
    number: "₹10 lakh",
    unit: "for the place you’ll call home",
    footnote:
      "A planning target only. Actual contributions depend on timeline, returns and costs.",
    interest: "Your own home",
  },
  education: {
    key: "education",
    navLabel: "Education & family",
    horizon: "FUTURE FAMILY MILESTONES",
    title: "Be ready for the moments that matter.",
    copy: "Give higher education and family celebrations their own savings timeline. Review the target as costs and priorities change.",
    kicker: "EXAMPLE MONTHLY CONTRIBUTION",
    number: "₹2,500",
    unit: "set aside for a future family goal",
    footnote:
      "An example contribution only. No maturity amount or scheme benefit is implied.",
    interest: "Education & family",
  },
  retirement: {
    key: "retirement",
    navLabel: "Retirement",
    horizon: "LIFE AFTER WORK",
    title: "Plan an income for your next chapter.",
    copy: "Explore periodic income needs alongside inflation, healthcare, liquidity and how long your savings may need to last.",
    kicker: "ILLUSTRATIVE SCENARIO · ₹20 LAKH ALLOCATION",
    number: "₹17,917",
    unit: "estimated monthly payout at 10.75% p.a.",
    footnote:
      "Calculated as ₹20,00,000 × 10.75% ÷ 12. Illustrative rate only. Current availability, eligibility and terms require provider confirmation.",
    interest: "Retirement",
  },
};

export const GOAL_KEYS: readonly GoalKey[] = [
  "income",
  "vehicle",
  "home",
  "education",
  "retirement",
] as const;
