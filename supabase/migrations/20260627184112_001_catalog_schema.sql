/*
# Product Catalog Quality Management Schema

1. Purpose
   - Manage large product catalogs (10,000+ SKUs)
   - Track product data quality issues
   - Validate compliance for Shopify & Google Merchant Center
   - Enable catalog QA workflows

2. New Tables
   - `products` - Core product catalog (SKU, title, description, pricing, images, category, brand)
   - `product_attributes` - Custom attributes (color, size, material, etc.)
   - `quality_issues` - Detected quality problems (missing attributes, poor content, compliance gaps)
   - `sales_channels` - Marketplace integrations (Shopify, Google Merchant Center)
   - `channel_requirements` - Compliance rules per channel
   - `product_channel_compliance` - Compliance status per product per channel

3. Security
   - Single-tenant app (no sign-in required)
   - RLS enabled with anon+authenticated access on all tables
*/

-- Products table: core catalog
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  title text,
  description text,
  brand text,
  category text,
  price_cents integer,
  compare_at_price_cents integer,
  currency text DEFAULT 'USD',
  cost_cents integer,
  inventory_quantity integer DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  product_type text,
  tags text[] DEFAULT '{}',
  images jsonb DEFAULT '[]'::jsonb,
  seo_title text,
  seo_description text,
  weight_grams integer,
  weight_unit text DEFAULT 'g',
  requires_shipping boolean DEFAULT true,
  is_taxable boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  quality_score integer DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 100),
  issues_count integer DEFAULT 0
);

-- Product attributes: flexible key-value pairs
CREATE TABLE IF NOT EXISTS product_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_name text NOT NULL,
  attribute_value text,
  attribute_type text DEFAULT 'text' CHECK (attribute_type IN ('text', 'number', 'boolean', 'select', 'multiselect')),
  is_required boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, attribute_name)
);

-- Quality issues: detected problems
CREATE TABLE IF NOT EXISTS quality_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  issue_type text NOT NULL CHECK (issue_type IN (
    'missing_title', 'missing_description', 'missing_image', 'missing_price',
    'missing_sku', 'missing_category', 'missing_brand', 'short_description',
    'short_title', 'invalid_price', 'low_quality_image', 'missing_attribute',
    'non_compliant_channel', 'duplicate_sku', 'broken_image_url'
  )),
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  channel text CHECK (channel IN ('shopify', 'google_merchant_center', 'all')),
  title text NOT NULL,
  description text,
  attribute_name text,
  suggested_fix text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'ignored')),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by text
);

-- Sales channels: marketplace integrations
CREATE TABLE IF NOT EXISTS sales_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (name IN ('shopify', 'google_merchant_center')),
  display_name text NOT NULL,
  is_active boolean DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Channel requirements: compliance rules
CREATE TABLE IF NOT EXISTS channel_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES sales_channels(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  requirement_type text NOT NULL CHECK (requirement_type IN ('required', 'recommended', 'format')),
  validation_rule text,
  error_message text,
  is_active boolean DEFAULT true,
  UNIQUE(channel_id, field_name)
);

-- Product channel compliance: status per product per channel
CREATE TABLE IF NOT EXISTS product_channel_compliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES sales_channels(id) ON DELETE CASCADE,
  is_compliant boolean DEFAULT false,
  compliance_score integer DEFAULT 0 CHECK (compliance_score >= 0 AND compliance_score <= 100),
  issues jsonb DEFAULT '[]'::jsonb,
  last_checked_at timestamptz DEFAULT now(),
  UNIQUE(product_id, channel_id)
);

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_channel_compliance ENABLE ROW LEVEL SECURITY;

-- Policies for products (anon + authenticated)
DROP POLICY IF EXISTS "anon_select_products" ON products;
CREATE POLICY "anon_select_products" ON products FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_products" ON products;
CREATE POLICY "anon_insert_products" ON products FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_products" ON products;
CREATE POLICY "anon_update_products" ON products FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_products" ON products;
CREATE POLICY "anon_delete_products" ON products FOR DELETE TO anon, authenticated USING (true);

-- Policies for product_attributes
DROP POLICY IF EXISTS "anon_select_product_attributes" ON product_attributes;
CREATE POLICY "anon_select_product_attributes" ON product_attributes FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_product_attributes" ON product_attributes;
CREATE POLICY "anon_insert_product_attributes" ON product_attributes FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_product_attributes" ON product_attributes;
CREATE POLICY "anon_update_product_attributes" ON product_attributes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_product_attributes" ON product_attributes;
CREATE POLICY "anon_delete_product_attributes" ON product_attributes FOR DELETE TO anon, authenticated USING (true);

-- Policies for quality_issues
DROP POLICY IF EXISTS "anon_select_quality_issues" ON quality_issues;
CREATE POLICY "anon_select_quality_issues" ON quality_issues FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_quality_issues" ON quality_issues;
CREATE POLICY "anon_insert_quality_issues" ON quality_issues FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_quality_issues" ON quality_issues;
CREATE POLICY "anon_update_quality_issues" ON quality_issues FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_quality_issues" ON quality_issues;
CREATE POLICY "anon_delete_quality_issues" ON quality_issues FOR DELETE TO anon, authenticated USING (true);

-- Policies for sales_channels
DROP POLICY IF EXISTS "anon_select_sales_channels" ON sales_channels;
CREATE POLICY "anon_select_sales_channels" ON sales_channels FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sales_channels" ON sales_channels;
CREATE POLICY "anon_insert_sales_channels" ON sales_channels FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sales_channels" ON sales_channels;
CREATE POLICY "anon_update_sales_channels" ON sales_channels FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sales_channels" ON sales_channels;
CREATE POLICY "anon_delete_sales_channels" ON sales_channels FOR DELETE TO anon, authenticated USING (true);

-- Policies for channel_requirements
DROP POLICY IF EXISTS "anon_select_channel_requirements" ON channel_requirements;
CREATE POLICY "anon_select_channel_requirements" ON channel_requirements FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_channel_requirements" ON channel_requirements;
CREATE POLICY "anon_insert_channel_requirements" ON channel_requirements FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_channel_requirements" ON channel_requirements;
CREATE POLICY "anon_update_channel_requirements" ON channel_requirements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_channel_requirements" ON channel_requirements;
CREATE POLICY "anon_delete_channel_requirements" ON channel_requirements FOR DELETE TO anon, authenticated USING (true);

-- Policies for product_channel_compliance
DROP POLICY IF EXISTS "anon_select_product_channel_compliance" ON product_channel_compliance;
CREATE POLICY "anon_select_product_channel_compliance" ON product_channel_compliance FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_product_channel_compliance" ON product_channel_compliance;
CREATE POLICY "anon_insert_product_channel_compliance" ON product_channel_compliance FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_product_channel_compliance" ON product_channel_compliance;
CREATE POLICY "anon_update_product_channel_compliance" ON product_channel_compliance FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_product_channel_compliance" ON product_channel_compliance;
CREATE POLICY "anon_delete_product_channel_compliance" ON product_channel_compliance FOR DELETE TO anon, authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_quality_score ON products(quality_score);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_product_attributes_product_id ON product_attributes(product_id);
CREATE INDEX IF NOT EXISTS idx_quality_issues_product_id ON quality_issues(product_id);
CREATE INDEX IF NOT EXISTS idx_quality_issues_status ON quality_issues(status);
CREATE INDEX IF NOT EXISTS idx_quality_issues_severity ON quality_issues(severity);
CREATE INDEX IF NOT EXISTS idx_quality_issues_type ON quality_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_product_channel_compliance_product_id ON product_channel_compliance(product_id);
CREATE INDEX IF NOT EXISTS idx_product_channel_compliance_channel_id ON product_channel_compliance(channel_id);

-- Insert default sales channels
INSERT INTO sales_channels (name, display_name, is_active) VALUES
  ('shopify', 'Shopify', true),
  ('google_merchant_center', 'Google Merchant Center', true)
ON CONFLICT (name) DO NOTHING;

-- Insert Shopify channel requirements
INSERT INTO channel_requirements (channel_id, field_name, requirement_type, validation_rule, error_message) 
SELECT 
  sc.id,
  req.field,
  req.type,
  req.rule,
  req.message
FROM sales_channels sc,
LATERAL (VALUES
  ('title', 'required', NULL, 'Product title is required for Shopify'),
  ('description', 'recommended', NULL, 'Product description improves conversion'),
  ('price', 'required', 'positive_number', 'Price must be a positive number'),
  ('sku', 'required', 'unique', 'SKU must be unique'),
  ('images', 'recommended', 'min_1_image', 'At least 1 image recommended for better visibility'),
  ('weight', 'recommended', NULL, 'Weight required for accurate shipping rates'),
  ('category', 'recommended', NULL, 'Category improves organization'),
  ('brand', 'recommended', NULL, 'Brand name builds trust')
) AS req(field, type, rule, message)
WHERE sc.name = 'shopify'
ON CONFLICT (channel_id, field_name) DO NOTHING;

-- Insert Google Merchant Center requirements
INSERT INTO channel_requirements (channel_id, field_name, requirement_type, validation_rule, error_message)
SELECT 
  sc.id,
  req.field,
  req.type,
  req.rule,
  req.message
FROM sales_channels sc,
LATERAL (VALUES
  ('title', 'required', 'max_150_chars', 'Title required, max 150 characters for Google'),
  ('description', 'required', 'min_50_chars', 'Description required, minimum 50 characters for Google'),
  ('price', 'required', 'positive_number', 'Price required for Google Shopping'),
  ('brand', 'required', NULL, 'Brand is required for Google Merchant Center'),
  ('gtin', 'recommended', NULL, 'GTIN/UPC improves matching'),
  ('mpn', 'recommended', NULL, 'MPN helps identify products'),
  ('images', 'required', 'min_1_image', 'At least 1 image required'),
  ('category', 'required', 'google_product_category', 'Google product category is required'),
  ('condition', 'required', NULL, 'Condition (new/used/refurbished) required'),
  ('availability', 'required', NULL, 'Availability status required')
) AS req(field, type, rule, message)
WHERE sc.name = 'google_merchant_center'
ON CONFLICT (channel_id, field_name) DO NOTHING;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for products table
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();