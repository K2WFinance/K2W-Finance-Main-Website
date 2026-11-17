# K2WFINANCE — Backend API Integration Handoff

## Current Status
- **Landing Page Mode:** UI Demo Only.
- **Form Submission Status:** The consultation request form (`#lead-form`) performs strict client-side validation against all approved fields, highlights invalid inputs with accessible ARIA attributes, and displays an explicit demo completion message:
  > *"Demo validation complete. No information was sent or saved. Your consultation has not been booked."*
- **Network / Database Requests:** None. No fake API routes, mock endpoints, or fabricated success states are implemented.
- **UTM Attribution Status:** The isolated tracking utility (`src/lib/utm.ts` and `src/components/tracking/UtmCapture.tsx`) is ready with storage key `k2wfinance_attribution_v1`, but active collection remains disabled (`UTM_COLLECTION_ENABLED = false`) until an official K2WFINANCE allowlist is approved.

---

## Required Information Before API Integration

Before connecting the lead consultation form to a live backend, the backend team / project lead must specify and approve:

1. **Endpoint & HTTP Method:**
   - E.g., `POST https://api.k2wfinance.com/v1/leads` or Next.js route handler proxy `POST /api/leads`.
2. **Authentication & Authorization:**
   - Authentication scheme (Bearer Token, API Key, Webhook secret, etc.).
   - Note: Any secret-authenticated service MUST be routed through a Next.js Server Route Handler (`src/app/api/leads/route.ts`) so secrets remain server-side and are NEVER exposed to the client browser.
3. **Request Payload Schema:**
   - Expected field names and formats:
     ```json
     {
       "name": "string (2-80 chars)",
       "phone": "string (10-digit Indian mobile number, e.g. 9876543210)",
       "email": "string (valid email, max 254 chars)",
       "interest": "string (one of the allowlisted goal options)",
       "attribution": {
         "utm_source": "string (optional)",
         "utm_medium": "string (optional)",
         "utm_campaign": "string (optional)"
       }
     }
     ```
4. **Response Envelopes:**
   - Expected success envelope (e.g. `{ "success": true, "leadId": "..." }`).
   - Expected error envelope (e.g. `{ "success": false, "error": { "code": "VALIDATION_FAILED", "message": "..." } }`).
5. **Timeout & Rate Limiting:**
   - Recommended timeout duration (e.g. 8000ms).
   - Rate limiting headers and backoff rules.
6. **Approved UTM Allowlist:**
   - Specific query parameter names authorized for capture and persistence (e.g. `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`).
7. **Environment Variable Names:**
   - Server-side environment variable names (e.g. `K2W_LEAD_API_URL`, `K2W_LEAD_API_SECRET`), to be configured in `.env.local` for local development, and in Vercel Preview/Production settings separately.

---

## Future Integration Architecture

When the backend contract is supplied:
1. A separate integration plan will be proposed for review and approval.
2. Form submission will route through `src/app/api/leads/route.ts` with server-side validation.
3. Consumed session attribution will be cleared from `sessionStorage` (`k2wfinance_attribution_v1`) ONLY after verified API success.
4. Failed requests, network timeouts, or validation errors will preserve entered values and retain stored attribution.
