import React from "react";

export function Faqs() {
  return (
    <section className="section faqs" id="faqs">
      <div className="wrap split-section">
        <div className="split-heading">
          <h2>
            Clarity before
            <br />
            commitment.
          </h2>
          <p>
            Good questions make for more considered decisions. Start here, then
            discuss the details of your chosen product.
          </p>
        </div>
        <div>
          <details open>
            <summary>Where do I begin if I have several goals?</summary>
            <p>
              Start with essential expenses and emergency needs. List your goals
              by date and importance. This helps you decide what needs to remain
              accessible and what can be set aside for longer.
            </p>
          </details>

          <details>
            <summary>How do fixed and recurring deposits differ?</summary>
            <p>
              A fixed deposit starts with a lump sum. A recurring deposit builds
              through regular contributions. Tenure, interest calculation,
              missed-payment rules and withdrawal conditions depend on the
              provider.
            </p>
          </details>

          <details>
            <summary>Are calculator results guaranteed?</summary>
            <p>
              No. Results use the amount, assumed rate and tenure you enter. They
              exclude taxes, charges and product-specific conditions. They are
              planning illustrations, not quotes or return guarantees.
            </p>
          </details>

          <details>
            <summary>What should I check about a co-operative deposit?</summary>
            <p>
              Confirm the exact legal entity, eligibility, applicable
              protections, audited information, repayment terms and early
              withdrawal rules. Do not assume a society deposit has the same
              protections as a bank deposit.
            </p>
          </details>

          <details>
            <summary>Can I plan for a regular monthly payout?</summary>
            <p>
              Some deposit structures offer periodic payouts. Available amounts,
              frequency, tenure and repayment conditions depend on the provider.
              Discuss these alongside your income needs and liquidity
              requirements.
            </p>
          </details>

          <details>
            <summary>Can I invest through this prototype?</summary>
            <p>
              No. This is a website design prototype. It does not open an
              account, accept money, book a consultation, or send your
              information.
            </p>
          </details>
        </div>
      </div>
    </section>
  );
}
