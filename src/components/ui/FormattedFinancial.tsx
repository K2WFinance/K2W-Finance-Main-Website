import React from "react";

const FINANCIAL_PATTERN_SRC =
  "₹\\s?\\d[\\d,]*(?:\\.\\d+)?(?:\\s*(?:lakhs?|crores?))?|\\b\\d+(?:\\.\\d+)?%";

interface FormattedFinancialProps {
  text: string;
}

export function FormattedFinancial({ text }: FormattedFinancialProps) {
  if (!text) return null;

  const pattern = new RegExp(FINANCIAL_PATTERN_SRC, "gi");
  const matches = [...text.matchAll(pattern)];

  if (matches.length === 0) {
    return <>{text}</>;
  }

  const elements: React.ReactNode[] = [];
  let offset = 0;

  matches.forEach((match, index) => {
    const matchIndex = match.index ?? 0;
    if (matchIndex > offset) {
      elements.push(text.slice(offset, matchIndex));
    }
    elements.push(
      <span key={index} className="financial-value">
        {match[0]}
      </span>
    );
    offset = matchIndex + match[0].length;
  });

  if (offset < text.length) {
    elements.push(text.slice(offset));
  }

  return <>{elements}</>;
}
