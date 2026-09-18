/*
# Inventory Management System Schema

## Overview
Creates the database tables for a multi-user inventory management system.
Each authenticated user manages their own inventory items and categories.

## New Tables

### categories
- `id` (uuid, primary key)
- `name` (text, not null) — category name (e.g. "Electronics", "Clothing")
- `description` (text) — optional description
- `user_id` (uuid, not null, defaults to authenticated user) — owner
- `created_at` (timestamptz)

### inventory_items
- `id` (uuid, primary key)
- `name` (text, not null) — item name
- `sku` (text) — stock keeping unit / product code
- `description` (text) — optional item description
- `category_id` (uuid, references categories) — optional category link
- `quantity` (integer, not null, default 0) — current stock count
- `price` (numeric, not null, default 0) — unit price
- `low_stock_threshold` (integer, default 10) — alert when stock drops below this
- `user_id` (uuid, not null, defaults to authenticated user) — owner
- `created_at` (timestamptz)
- `updated_at` (timestamptz) — auto-updated on change

## Security
- RLS enabled on both tables.
- Owner-scoped CRUD: each authenticated user can only access their own rows.
- Categories and inventory_items are both scoped by user_id.
- An unauthenticated user cannot read or write any data.

## Notes
1. Both tables use DEFAULT auth.uid() on user_id so inserts that omit the owner column succeed.
2. inventory_items.updated_at auto-updates via a trigger.
3. Indexes added on user_id for query performance.
*/

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_categories" ON categories;
CREATE POLICY "select_own_categories" ON categories FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_categories" ON categories;
CREATE POLICY "insert_own_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_categories" ON categories;
CREATE POLICY "update_own_categories" ON categories FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_categories" ON categories;
CREATE POLICY "delete_own_categories" ON categories FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Inventory items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text,
  description text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 0,
  price numeric(12,2) NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 10,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_items" ON inventory_items;
CREATE POLICY "select_own_items" ON inventory_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_items" ON inventory_items;
CREATE POLICY "insert_own_items" ON inventory_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_items" ON inventory_items;
CREATE POLICY "update_own_items" ON inventory_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_items" ON inventory_items;
CREATE POLICY "delete_own_items" ON inventory_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Auto-update updated_at on inventory_items
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_inventory_items_updated_at ON inventory_items;
CREATE TRIGGER trigger_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id ON inventory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category_id ON inventory_items(category_id);
