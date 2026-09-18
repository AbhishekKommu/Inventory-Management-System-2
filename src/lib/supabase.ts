import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type InventoryItem = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  category_id: string | null;
  quantity: number;
  price: number;
  low_stock_threshold: number;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
};

export type InventoryItemWithCategory = InventoryItem & {
  categories: { name: string } | null;
};
