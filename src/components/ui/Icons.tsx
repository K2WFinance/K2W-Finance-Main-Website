import React from "react";
import { GoalKey } from "@/lib/goals-data";

export function ArrowIcon({ className = "arrow-icon" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function CheckIcon({ className = "check" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

export function DownArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 25"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <path d="M10 2v19m-6-6 6 6 6-6" />
    </svg>
  );
}

export function GoalIcon({
  goal,
  className = "ui-icon",
}: {
  goal: GoalKey;
  className?: string;
}) {
  const commonProps = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.7",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (goal) {
    case "special_days":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M14.5 9h-4a1.5 1.5 0 0 0 0 3h3a1.5 1.5 0 0 1 0 3h-4m2-7.5v9" />
        </svg>
      );
    case "business":
      return (
        <svg {...commonProps}>
          <path d="m3 9 2-5h14l2 5M3 9v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9M3 9h18M9 21v-7h6v7" />
        </svg>
      );
    case "loans":
      return (
        <svg {...commonProps}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20M6 15h4m5 0 2 2 4-4" />
        </svg>
      );
    case "emergency":
      return (
        <svg {...commonProps}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM12 8v8m-4-4h8" />
        </svg>
      );
    case "education":
      return (
        <svg {...commonProps}>
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      );
    case "home":
      return (
        <svg {...commonProps}>
          <path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7" />
        </svg>
      );
    case "family":
      return (
        <svg {...commonProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "wealth":
      return (
        <svg {...commonProps}>
          <path d="M12 22v-9M12 13a5 5 0 0 0 5-5c0-3-5-4-5-4s-5 1-5 4a5 5 0 0 0 5 5z" />
          <path d="M12 17c3 0 6-2 6-5M7 14c0 3 2.5 4.5 5 4.5" />
        </svg>
      );
    case "dreams":
      return (
        <svg {...commonProps}>
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.8-.2-1.6.3-1.8 1.1-.1.5.1 1 .5 1.4l5.3 4.1-3 3-2.1-.5c-.4-.1-.8.1-1.1.4l-.8.8 3.5 2.1 2.1 3.5.8-.8c.3-.3.5-.7.4-1.1l-.5-2.1 3-3 4.1 5.3c.4.4.9.6 1.4.5.8-.2 1.3-1 1.1-1.8z" />
        </svg>
      );
    case "peace":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" />
        </svg>
      );
    case "income":
      return (
        <svg {...commonProps}>
          <rect x="3" y="6" width="18" height="14" rx="3" />
          <path d="M3 9h18m-6 5h3" />
        </svg>
      );
    case "vehicle":
      return (
        <svg {...commonProps}>
          <path d="m4 10 2-5h12l2 5M3 10h18v8H3zM6 18v3m12-3v3M6 14h2m8 0h2" />
        </svg>
      );
    case "retirement":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1" />
        </svg>
      );
  }
}
