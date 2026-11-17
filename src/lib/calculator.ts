export type CalculatorMode = "growth" | "monthly" | "income";

export interface CalculatorConfig {
  label: string;
  amountLabel: string;
  minAmount: number;
  maxAmount: number;
  stepAmount: number;
  defaultAmount: number;
  minRate: number;
  maxRate: number;
  stepRate: number;
  defaultRate: number;
  minTenure: number;
  maxTenure: number;
  stepTenure: number;
  defaultTenure: number;
  hasTenure: boolean;
  resultLabel: string;
  disclaimer: string;
}

export const CALCULATOR_CONFIGS: Record<CalculatorMode, CalculatorConfig> = {
  growth: {
    label: "One-time savings",
    amountLabel: "Starting amount",
    minAmount: 50000,
    maxAmount: 5000000,
    stepAmount: 25000,
    defaultAmount: 1000000,
    minRate: 1,
    maxRate: 15,
    stepRate: 0.25,
    defaultRate: 8,
    minTenure: 1,
    maxTenure: 15,
    stepTenure: 1,
    defaultTenure: 5,
    hasTenure: true,
    resultLabel: "Illustrative future value",
    disclaimer:
      "Illustration only. Annual compounding; before taxes and charges. The rate is your assumption, not a product offer or guaranteed return.",
  },
  monthly: {
    label: "Monthly savings",
    amountLabel: "Monthly contribution",
    minAmount: 500,
    maxAmount: 100000,
    stepAmount: 500,
    defaultAmount: 10000,
    minRate: 1,
    maxRate: 15,
    stepRate: 0.25,
    defaultRate: 8,
    minTenure: 1,
    maxTenure: 15,
    stepTenure: 1,
    defaultTenure: 5,
    hasTenure: true,
    resultLabel: "Illustrative future value",
    disclaimer:
      "Illustration only. Assumes end-of-month deposits and monthly compounding, before taxes and charges. Your selected rate is an assumption, not a guaranteed return.",
  },
  income: {
    label: "Monthly income",
    amountLabel: "Starting amount",
    minAmount: 50000,
    maxAmount: 5000000,
    stepAmount: 25000,
    defaultAmount: 1000000,
    minRate: 1,
    maxRate: 15,
    stepRate: 0.25,
    defaultRate: 8,
    minTenure: 1,
    maxTenure: 15,
    stepTenure: 1,
    defaultTenure: 5,
    hasTenure: false,
    resultLabel: "Illustrative monthly payout",
    disclaimer:
      "Illustration only. Annual simple interest divided into 12 payouts, before taxes and charges. Actual payout terms depend on the provider. No return is guaranteed.",
  },
};

export function formatIndianCurrency(amount: number): string {
  return "₹" + Math.round(amount).toLocaleString("en-IN");
}

export function formatRate(ratePercent: number): string {
  return ratePercent.toFixed(2) + "%";
}

export function formatTenure(years: number): string {
  return years + (years === 1 ? " year" : " years");
}

export interface CalculationResult {
  result: number;
  formattedResult: string;
  invested: number;
  formattedInvested: string;
  growth: number;
  formattedGrowth: string;
  resultLabel: string;
  resultNote: {
    investedPart?: string;
    growthPart?: string;
    incomeNote?: string;
  };
}

export function calculateValues(
  mode: CalculatorMode,
  amount: number,
  ratePercent: number,
  tenureYears: number
): CalculationResult {
  const r = ratePercent / 100;
  const t = tenureYears;
  let result = 0;
  let invested = amount;

  if (mode === "income") {
    result = (amount * r) / 12;
    return {
      result,
      formattedResult: formatIndianCurrency(result),
      invested: amount,
      formattedInvested: formatIndianCurrency(amount),
      growth: 0,
      formattedGrowth: formatIndianCurrency(0),
      resultLabel: "Illustrative monthly payout",
      resultNote: {
        incomeNote: `Based on ${formatIndianCurrency(amount)} allocated at your assumed rate.`,
      },
    };
  }

  if (mode === "monthly") {
    const monthlyRate = r / 12;
    const n = t * 12;
    result = monthlyRate
      ? (amount * (Math.pow(1 + monthlyRate, n) - 1)) / monthlyRate
      : amount * n;
    invested = amount * n;
  } else {
    result = amount * Math.pow(1 + r, t);
    invested = amount;
  }

  const growth = result - invested;

  return {
    result,
    formattedResult: formatIndianCurrency(result),
    invested,
    formattedInvested: formatIndianCurrency(invested),
    growth,
    formattedGrowth: formatIndianCurrency(growth),
    resultLabel: "Illustrative future value",
    resultNote: {
      investedPart: `${formatIndianCurrency(invested)} contributed`,
      growthPart: `${formatIndianCurrency(growth)} estimated growth`,
    },
  };
}
