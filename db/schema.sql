-- NestFlow modular template packs schema
-- Supports reusable packs that can be attached to any transaction.

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS template_packs (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_base_template BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS template_tasks (
  id UUID PRIMARY KEY,
  pack_id UUID NOT NULL REFERENCES template_packs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_template_tasks_pack_name UNIQUE (pack_id, name),
  CONSTRAINT uq_template_tasks_pack_position UNIQUE (pack_id, position)
);

-- Assigns reusable template packs to any transaction.
CREATE TABLE IF NOT EXISTS transaction_pack_assignments (
  id UUID PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  template_pack_id UUID NOT NULL REFERENCES template_packs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_txn_pack UNIQUE (transaction_id, template_pack_id)
);

-- Task instances copied from template tasks at assignment time.
-- These rows are editable/reorderable per transaction without mutating the template.
CREATE TABLE IF NOT EXISTS transaction_tasks (
  id UUID PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES transaction_pack_assignments(id) ON DELETE SET NULL,
  template_task_id UUID REFERENCES template_tasks(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_txn_task_position UNIQUE (transaction_id, position)
);
