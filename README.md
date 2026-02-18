# NestFlow Modular Template Demo

A lightweight front-end prototype that demonstrates modular and stackable transaction templates.

## What it supports

- One base template per transaction (Buyer, Seller, Prospect).
- Add stage packs later (Coming Soon, On Market, Under Contract, Closing Week, Post Closing).
- Duplicate prevention when applying packs using:
  - `template_task_id`
  - normalized task title
- Anchor-based due date rules per task:
  - `anchor_type` (`consult_date`, `list_date`, `contract_date`, `closing_date`, `custom`)
  - `offset_days` (negative or positive)
  - `manual_override_date` (optional)
- Due date calculation:
  - `due_date = anchor_date + offset_days`
  - manual override date takes precedence
  - changing an anchor date recalculates linked task due dates
  - completed tasks remain completed after recalculation
- In-task editing for anchor type, offset days, and manual override date.
- Persistent local storage with versioned key: `nestflow_state_v1`.
- Automatic save after all app changes with subtle save-status indicator.
- Export JSON and Import JSON for backup/migration.
- Uses River Blues + Pink branding palette.

## Run

Open `index.html` in a browser.
