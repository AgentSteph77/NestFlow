# NestFlow Modular Template Demo

A lightweight front-end prototype that demonstrates modular and stackable transaction templates.

## What it supports

- One base template per transaction (Buyer, Seller, Prospect).
- Add stage packs later (Coming Soon, On Market, Under Contract, Closing Week, Post Closing).
- Duplicate prevention when applying packs using:
  - `template_task_id`
  - normalized task title
- Relative due dates driven by transaction anchor dates:
  - `base_date`
  - `list_date`
  - `contract_date`
  - `closing_date`
- Recalculates due dates when anchor dates change.
- Shows anchors, add-pack action, and applied packs list in-transaction.
- Uses River Blues + Pink branding palette.

## Run

Open `index.html` in a browser.
