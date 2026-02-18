# NestFlow Template Pack Seed

This directory provides a portable schema + seed for reusable modular transaction packs.

## Files

- `schema.sql`: creates tables for template packs/tasks and transaction assignments.
- `seed_default_packs.sql`: seeds the default base template + packs requested.

## How it satisfies requirements

- **Packs attachable to any transaction**: `transaction_pack_assignments` maps `transactions` to `template_packs`.
- **No duplicate tasks**: `template_tasks` has unique constraints on `(pack_id, name)` and `(pack_id, position)`.
- **Editable/reorderable tasks**: `transaction_tasks` stores per-transaction task instances and positions.
- **Persisted in database**: all pack/task definitions are stored in relational tables.

## Suggested apply order

```bash
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/seed_default_packs.sql
```
