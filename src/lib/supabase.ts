import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface Product {
  id: string;
  sku: string;
  title: string | null;
  description: string | null;
  brand: string | null;
  category: string | null;
  price_cents: number | null;
  compare_at_price_cents: number | null;
  currency: string;
  cost_cents: number | null;
  inventory_quantity: number;
  status: 'draft' | 'active' | 'archived';
  product_type: string | null;
  tags: string[];
  images: { url: string; alt?: string }[];
  seo_title: string | null;
  seo_description: string | null;
  weight_grams: number | null;
  weight_unit: string;
  requires_shipping: boolean;
  is_taxable: boolean;
  created_at: string;
  updated_at: string;
  quality_score: number;
  issues_count: number;
}

export interface ProductAttribute {
  id: string;
  product_id: string;
  attribute_name: string;
  attribute_value: string | null;
  attribute_type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect';
  is_required: boolean;
  created_at: string;
}

export interface QualityIssue {
  id: string;
  product_id: string;
  issue_type: 'missing_title' | 'missing_description' | 'missing_image' | 'missing_price' |
    'missing_sku' | 'missing_category' | 'missing_brand' | 'short_description' |
    'short_title' | 'invalid_price' | 'low_quality_image' | 'missing_attribute' |
    'non_compliant_channel' | 'duplicate_sku' | 'broken_image_url';
  severity: 'critical' | 'high' | 'medium' | 'low';
  channel: 'shopify' | 'google_merchant_center' | 'all' | null;
  title: string;
  description: string | null;
  attribute_name: string | null;
  suggested_fix: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'ignored';
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface SalesChannel {
  id: string;
  name: 'shopify' | 'google_merchant_center';
  display_name: string;
  is_active: boolean;
  config: Record<string, unknown>;
  created_at: string;
}

export interface ChannelRequirement {
  id: string;
  channel_id: string;
  field_name: string;
  requirement_type: 'required' | 'recommended' | 'format';
  validation_rule: string | null;
  error_message: string | null;
  is_active: boolean;
}

export interface ProductChannelCompliance {
  id: string;
  product_id: string;
  channel_id: string;
  is_compliant: boolean;
  compliance_score: number;
  issues: { field: string; message: string }[];
  last_checked_at: string;
}
