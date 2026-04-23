# Sell My Exotic Fast MVP

A simple mobile-first landing page for exotic car lead capture.

## What it does

1. Captures a 17-character VIN
2. Decodes the VIN with the NHTSA vPIC API
3. Reveals a short contact form for miles, ZIP, mobile, and contact info
4. Sends the lead by email to you and your dealership partner with Resend
5. Sends a confirmation email to the seller

## File structure

- `index.html` — landing page
- `styles.css` — mobile-first styling
- `app.js` — VIN decode + form submit logic
- `api/decode-vin.js` — Vercel Function for NHTSA VIN decoding
- `api/lead.js` — Vercel Function for Resend lead emails

## Local notes

This repo is designed for Vercel.

## Deploy to Vercel

1. Create a new GitHub repo and upload these files.
2. Import the repo into Vercel.
3. In Vercel Project Settings → Environment Variables, add:
   - `RESEND_API_KEY`
   - `FROM_EMAIL`
   - `LEAD_TO_EMAIL`
   - `DEALER_TO_EMAIL`
4. Deploy.

## Recommended sender domain setup

Use a subdomain for Resend, such as:

- `send.sellmyexoticfast.com`

Then send from:

- `offers@send.sellmyexoticfast.com`

That keeps your root-domain Google Workspace mail setup separate.

## DNS notes for your use case

Keep your Google Workspace mail records.
Replace only the website records for Vercel.
Use the exact DNS records Vercel shows in your project.

