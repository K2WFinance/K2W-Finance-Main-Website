import { GoalInterest } from "./interest-events";

export type GoalKey =
  | "special_days"
  | "business"
  | "loans"
  | "emergency"
  | "education"
  | "home"
  | "family"
  | "wealth"
  | "dreams"
  | "peace"
  | "income"
  | "vehicle"
  | "retirement";

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
  suggestedOption?: string;
}

export const GOALS_DATA: Record<GoalKey, GoalItem> = {
  special_days: {
    key: "special_days",
    navLabel: "Gifts on special days",
    horizon: "TRADITIONS & OCCASIONS",
    title: "Buy gifts on special days. Celebrate traditions.",
    copy: "Celebrate traditions and create lasting value. Plan ahead for festivals, anniversaries and family occasions without disturbing your monthly budget.",
    kicker: "EXAMPLE OCCASION TARGET",
    number: "₹1.5 lakh",
    unit: "set aside for family celebrations",
    footnote:
      "A deliberate allocation target to celebrate traditions without taking on short-term debt.",
    interest: "Gifts on special days",
  },
  business: {
    key: "business",
    navLabel: "Start Your Own Business",
    horizon: "BUSINESS & ENTERPRISE",
    title: "Start your own business. Turn savings into opportunity.",
    copy: "Keep your startup capital separate from household savings, with a maturity date matched to your launch plan.",
    kicker: "EXAMPLE BUSINESS FUND",
    number: "₹5 lakh",
    unit: "",
    footnote: "set aside for 2 years",
    interest: "Start your own business",
    suggestedOption: "Fixed deposit",
  },
  loans: {
    key: "loans",
    navLabel: "Pay off your loans",
    horizon: "DEBT FREEDOM & CASH FLOW",
    title: "Pay off your loans. Free up your future income.",
    copy: "Reduce debt and free up your future income. Target high-cost liabilities with planned lump-sum prepayments to reduce your interest burden.",
    kicker: "EXAMPLE PREPAYMENT TARGET",
    number: "₹3 lakh",
    unit: "lump sum for early debt reduction",
    footnote:
      "A planned prepayment amount to significantly lower your tenure and total interest paid.",
    interest: "Pay off your loans",
  },
  emergency: {
    key: "emergency",
    navLabel: "Build an Emergency Fund",
    horizon: "SECURITY & RESILIENCE",
    title: "Build an emergency fund. Ready for unexpected costs.",
    copy: "Keep part of your cushion instantly accessible and the rest in short-term deposits. Check early-withdrawal terms before you choose.",
    kicker: "EXAMPLE SAFETY CUSHION",
    number: "6 months",
    unit: "",
    footnote: "of essential household expenses",
    interest: "Emergency fund",
    suggestedOption: "Short-term fixed deposits + savings",
  },
  education: {
    key: "education",
    navLabel: "Invest in education",
    horizon: "HIGHER STUDIES & SKILLS",
    title: "Invest in education. Build skills and opportunities.",
    copy: "Build skills and create better opportunities. Give higher education, global certifications and career advancement their own savings timeline.",
    kicker: "EXAMPLE EDUCATION FUND",
    number: "₹4 lakh",
    unit: "dedicated fund for skills & higher studies",
    footnote:
      "A targeted savings milestone for tuition, materials and living expenses during study.",
    interest: "Education & family",
  },
  home: {
    key: "home",
    navLabel: "Save for Your Dream Home",
    horizon: "HOME & BELONGING",
    title: "Save for your dream home. Turn vision into reality.",
    copy: "Build towards the down payment, registration and moving costs with a monthly habit timed to your purchase date.",
    kicker: "EXAMPLE MONTHLY PLAN",
    number: "₹15,000 / month",
    unit: "",
    footnote: "for 5 years, towards your down payment",
    interest: "Your own home",
    suggestedOption: "Recurring deposit",
  },
  family: {
    key: "family",
    navLabel: "Secure Your Family's Future",
    horizon: "EDUCATION & FAMILY",
    title: "Secure your family's future. Prepare for every milestone.",
    copy: "Time deposits to mature when each fee or milestone is due, so the money arrives when the commitment does.",
    kicker: "EXAMPLE PLAN",
    number: "Every June",
    unit: "",
    footnote: "a deposit maturing when annual school fees are due",
    interest: "Education & family",
    suggestedOption: "Fixed deposits, laddered",
  },
  wealth: {
    key: "wealth",
    navLabel: "Grow your wealth",
    horizon: "LONG-TERM ACCUMULATION",
    title: "Grow your wealth. Disciplined long-term compounding.",
    copy: "Choose suitable investments for long-term financial goals. Harness the proven compounding power of regular, disciplined deposits over 5–7 years.",
    kicker: "EXAMPLE WEALTH TARGET",
    number: "₹15 lakh",
    unit: "accumulated through compounding deposits",
    footnote:
      "Planning illustration for long-term corpus accumulation over a 5–7 year horizon.",
    interest: "Grow your wealth",
  },
  dreams: {
    key: "dreams",
    navLabel: "Fulfil Your Dreams",
    horizon: "TRAVEL & EXPERIENCES",
    title: "Fulfil your dreams. Plan for travel and experiences.",
    copy: "Set aside a fixed amount each month and give your plans a date instead of a someday.",
    kicker: "EXAMPLE MONTHLY PLAN",
    number: "₹5,000 / month",
    unit: "",
    footnote: "for 3 years, towards a family trip or milestone celebration",
    interest: "Travel & personal dreams",
    suggestedOption: "Recurring deposit",
  },
  peace: {
    key: "peace",
    navLabel: "Enjoy peace of mind",
    horizon: "FINANCIAL SECURITY & CONFIDENCE",
    title: "Enjoy peace of mind. Build security and confidence.",
    copy: "Build financial security and confidence. Knowing that your monthly income, family commitments and future are covered brings true peace of mind.",
    kicker: "ESTIMATED MONTHLY SECURITY",
    number: "₹8,542",
    unit: "monthly predictable payout at 10.25% p.a.",
    footnote:
      "Calculated as ₹10,00,000 × 10.25% ÷ 12. Predictable monthly cash flow so you can focus on life.",
    interest: "Monthly income plans",
  },
  // Backward compatibility aliases
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
  "dreams",
  "business",
  "emergency",
  "home",
  "family",
] as const;
