# Sell My Exotic Fast — Dealer AI pilot

Public sales page for an AI assistant installed on an exotic dealership's existing website. Offer: $500 one-time setup + $500/month for one dealership website. SMS carrier and message usage are additional and confirmed before activation.

## Page and inquiry flow

- `index.html`, `styles.css`, `app.js`: responsive landing page and inquiry form.
- `api/dealer-inquiry.js`: validates dealership name, location, website, email, and requested AI tasks; sends an inquiry to `LEAD_TO_EMAIL` using Resend.
- Existing `RESEND_API_KEY`, `FROM_EMAIL`, and `LEAD_TO_EMAIL` environment variables are reused. This endpoint does not use `DEALER_TO_EMAIL` or send an automatic email to the visitor.
- An inquiry is successful only when Resend accepts the owner notification. Errors preserve the form and offer an email fallback.
- The contact form is not SMS consent, a payment authorization, or a subscription signup.
- The displayed conversation is clearly illustrative; this marketing page does not implement the customer-facing AI product.
- The legacy VIN and vehicle-lead functions remain in source for rollback compatibility and are no longer linked from the page.

## Pilot delivery scope

1. Agree on one dealer website, approved inventory source, refresh frequency, and lead recipient.
2. Connect approved inventory and dealer policies. Show the dealer the assistant before installation.
3. Answer supported vehicle and dealership questions. Route unknown history, condition, warranty, availability, negotiated pricing, and appointment confirmation to staff.
4. Enable customer SMS only after sender registration, recorded opt-in, opt-out handling, and a written usage allowance/cost agreement.
5. Send a lead summary with the vehicle, contact, buyer intent, and requested next step.
6. Track useful conversations, qualified leads, requested appointments, and dealer-confirmed outcomes during the pilot. Do not promise a sales lift before measuring it.

## Deployment

The existing GitHub `main` branch deploys to Vercel and serves `https://www.sellmyexoticfast.com/`. No new host or DNS changes are required. Review the Vercel deployment status and then verify the live HTML, assets, and inquiry validation after publishing. Validate real email delivery with the owner before outreach; local delivery tests use a mock and do not send emails.
