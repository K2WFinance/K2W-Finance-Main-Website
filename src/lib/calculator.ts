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
  tenureLabel?: string;
  resultLabel: string;
  disclaimer: string;
}

export const CALCULATOR_CONFIGS: Record<CalculatorMode, CalculatorConfig> = {
  growth: {
    label: "One-time savings",
    amountLabel: "Starting amount",
    minAmount: 10000,
    maxAmount: 5000000,
    stepAmount: 10000,
    defaultAmount: 100000,
    minRate: 1,
    maxRate: 15,
    stepRate: 0.25,
    defaultRate: 11.25,
    minTenure: 1,
    maxTenure: 7,
    stepTenure: 1,
    defaultTenure: 3,
    hasTenure: true,
    tenureLabel: "Time to grow",
    resultLabel: "Illustrative future value",
    disclaimer:
      "Illustration only. Annual compounding; before taxes and charges. Rates are based on product terms or your assumption, not a guaranteed return.",
  },
  monthly: {
    label: "Monthly savings",
    amountLabel: "Monthly contribution",
    minAmount: 500,
    maxAmount: 100000,
    stepAmount: 500,
    defaultAmount: 5000,
    minRate: 1,
    maxRate: 15,
    stepRate: 0.25,
    defaultRate: 10.25,
    minTenure: 1,
    maxTenure: 7,
    stepTenure: 1,
    defaultTenure: 3,
    hasTenure: true,
    tenureLabel: "Time to grow",
    resultLabel: "Illustrative future value",
    disclaimer:
      "Illustration only. Assumes regular monthly contributions and annual compounding, before taxes and charges. No return is guaranteed.",
  },
  income: {
    label: "Monthly income",
    amountLabel: "Starting amount",
    minAmount: 20000,
    maxAmount: 5000000,
    stepAmount: 20000,
    defaultAmount: 1000000,
    minRate: 1,
    maxRate: 15,
    stepRate: 0.25,
    defaultRate: 10.25,
    minTenure: 1,
    maxTenure: 7,
    stepTenure: 1,
    defaultTenure: 3,
    hasTenure: true,
    tenureLabel: "Term",
    resultLabel: "Illustrative monthly payout",
    disclaimer:
      "Illustration only. Annual simple interest divided into 12 payouts, before taxes and charges. Actual payout terms depend on the provider. No return is guaranteed.",
  },
};

/**
 * Returns the default illustrative rate based on the approved product schedule:
 * - MIP (Monthly Income Plan): 12M = 8.50%, 24M = 9.75%, 36M = 10.25%, 60M = 10.75%, 84M = 10.75%
 * - FD (One-time savings): 12M = 9.75%, 24M = 10.25%, 36M = 11.25%, 60M = 12.25%
 * - RD (Monthly savings): 12M = 9.75%, 24M = 10.00%, 36M = 10.25%, 48M = 10.50%, 60M = 11.25%
 */
export function getProductRateForTenure(
  mode: CalculatorMode,
  tenureYears: number
): number {
  const t = Math.round(tenureYears);
  if (mode === "income") {
    if (t <= 1) return 8.5;
    if (t === 2) return 9.75;
    if (t === 3) return 10.25;
    if (t === 4) return 10.5;
    return 10.75; // 5 to 7 years
  }
  if (mode === "growth") {
    if (t <= 1) return 9.75;
    if (t === 2) return 10.25;
    if (t === 3) return 11.25;
    if (t === 4) return 11.75;
    return 12.25; // 5 to 7 years
  }
  if (mode === "monthly") {
    if (t <= 1) return 9.75;
    if (t === 2) return 10.0;
    if (t === 3) return 10.25;
    if (t === 4) return 10.5;
    return 11.25; // 5+ years
  }
  return 8;
}

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
        incomeNote: `Based on ${formatIndianCurrency(amount)} allocated for ${formatTenure(t)} at your assumed rate.`,
      },
    };
  }

  if (mode === "monthly") {
    invested = amount * Math.round(t * 12);
    if (r === 0) {
      result = invested;
    } else {
      const fullYears = Math.floor(t);
      const remainingFraction = t - fullYears;
      let balance = 0;

      // Annual compounding RD formula matching approved client schedule:
      // In each full year: previous balance compounds at (1 + r),
      // plus 12 monthly deposits of `amount` earning interest = 6.5 * amount * r
      for (let y = 0; y < fullYears; y++) {
        balance = balance * (1 + r) + 12 * amount + amount * 6.5 * r;
      }

      if (remainingFraction > 0) {
        const months = Math.round(remainingFraction * 12);
        const fracInterest = amount * ((months * (months + 1)) / 24) * r;
        balance =
          balance * (1 + r * remainingFraction) + months * amount + fracInterest;
      }
      result = balance;
    }
  } else {
    // Mode "growth" (FD): annual compounding P * (1 + r)^t
    result = amount * Math.pow(1 + r, t);
    invested = amount;
  }

  const growth = Math.max(0, result - invested);

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
