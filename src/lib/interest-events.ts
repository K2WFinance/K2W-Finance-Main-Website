export type GoalInterest =
  | "Gifts on special days"
  | "Start your own business"
  | "Pay off your loans"
  | "Emergency fund"
  | "Education & family"
  | "Your own home"
  | "A new vehicle"
  | "Grow your wealth"
  | "Travel & personal dreams"
  | "Enjoy peace of mind"
  | "Monthly expenses"
  | "Retirement"
  | "Fixed deposits"
  | "Recurring deposits"
  | "Monthly income plans"
  | "I need help deciding";

export const ALLOWED_INTERESTS: readonly GoalInterest[] = [
  "Gifts on special days",
  "Start your own business",
  "Pay off your loans",
  "Emergency fund",
  "Education & family",
  "Your own home",
  "A new vehicle",
  "Grow your wealth",
  "Travel & personal dreams",
  "Enjoy peace of mind",
  "Monthly expenses",
  "Retirement",
  "Fixed deposits",
  "Recurring deposits",
  "Monthly income plans",
  "I need help deciding",
] as const;

const INTEREST_EVENT_NAME = "k2w_select_interest";

export function selectInterest(interest: GoalInterest): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<GoalInterest>(INTEREST_EVENT_NAME, { detail: interest })
    );
  }
}

export function subscribeToInterest(
  callback: (interest: GoalInterest) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<GoalInterest>;
    if (customEvent.detail && ALLOWED_INTERESTS.includes(customEvent.detail)) {
      callback(customEvent.detail);
    }
  };
  window.addEventListener(INTEREST_EVENT_NAME, handler);
  return () => {
    window.removeEventListener(INTEREST_EVENT_NAME, handler);
  };
}
