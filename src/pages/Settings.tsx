import { useState } from 'react';
import {
  Settings as SettingsIcon,
  Database,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  Sparkles,
  Package,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const CATEGORIES = [
  'Electronics',
  'Clothing',
  'Home & Garden',
  'Sports & Outdoors',
  'Beauty & Personal Care',
  'Health & Wellness',
  'Fashion Accessories',
  'Footwear',
];

const BRANDS = [
  'TechPro', 'StyleMax', 'HomeEssentials', 'SportGear', 'GlowBeauty',
  'WellnessPlus', 'FashionFirst', 'StepRight', 'Acme', 'PrimeGoods',
];

const ISSUE_TYPES = [
  { type: 'missing_title', severity: 'critical' as const, title: 'Missing Product Title', description: 'Product title is required for all sales channels' },
  { type: 'missing_description', severity: 'critical' as const, title: 'Missing Product Description', description: 'Description is required for Google Merchant Center' },
  { type: 'short_description', severity: 'high' as const, title: 'Description Too Short', description: 'Description should be at least 50 characters for optimal SEO' },
  { type: 'missing_image', severity: 'high' as const, title: 'Missing Primary Image', description: 'At least one product image is required' },
  { type: 'missing_price', severity: 'critical' as const, title: 'Missing Price', description: 'Price is required for all sales channels' },
  { type: 'missing_brand', severity: 'high' as const, title: 'Missing Brand Name', description: 'Brand is required for Google Merchant Center' },
  { type: 'missing_category', severity: 'medium' as const, title: 'Missing Category', description: 'Category improves browse navigation and filtering' },
  { type: 'missing_attribute', severity: 'medium' as const, title: 'Missing Required Attributes', description: 'Variant-specific attributes are incomplete' },
  { type: 'non_compliant_channel', severity: 'high' as const, title: 'Channel Compliance Issue', description: 'Product does not meet channel requirements' },
  { type: 'invalid_price', severity: 'critical' as const, title: 'Invalid Price Format', description: 'Price must be a positive number' },
];

export default function Settings() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: products } = await supabase
        .from('products')
        .select('*');

      if (products) {
        const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `catalog-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setMessage({ type: 'success', text: `Exported ${products.length} products` });
      }
    } catch (error) {
      console.error('Export error:', error);
      setMessage({ type: 'error', text: 'Failed to export products' });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const products = JSON.parse(text);

      if (!Array.isArray(products)) {
        throw new Error('Invalid file format');
      }

      const productsToInsert = products.map((p: Record<string, unknown>) => ({
        sku: p.sku,
        title: p.title,
        description: p.description,
        brand: p.brand,
        category: p.category,
        price_cents: p.price_cents || (p.price ? Math.round((p.price as number) * 100) : null),
        compare_at_price_cents: p.compare_at_price_cents,
        cost_cents: p.cost_cents,
        inventory_quantity: p.inventory_quantity || 0,
        status: p.status || 'draft',
        product_type: p.product_type,
        tags: p.tags || [],
        images: p.images || [],
        quality_score: p.quality_score || 0,
        issues_count: p.issues_count || 0,
      }));

      const { error } = await supabase
        .from('products')
        .upsert(productsToInsert, { onConflict: 'sku' });

      if (error) throw error;

      setMessage({ type: 'success', text: `Imported ${products.length} products` });
    } catch (error) {
      console.error('Import error:', error);
      setMessage({ type: 'error', text: 'Failed to import products. Check file format.' });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const generateSampleData = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      const products = [];
      const issues: { product_id: string; sku: string; issues: typeof ISSUE_TYPES }[] = [];

      // Generate 50 products with realistic quality distribution
      for (let i = 0; i < 50; i++) {
        const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
        const brand = BRANDS[Math.floor(Math.random() * BRANDS.length)];
        const hasTitle = Math.random() > 0.08;
        const hasDescription = Math.random() > 0.12;
        const descLength = hasDescription ? Math.floor(Math.random() * 300) + 20 : 0;
        const hasImage = Math.random() > 0.15;
        const hasPrice = Math.random() > 0.08;
        const hasBrand = Math.random() > 0.2;
        const hasCategory = Math.random() > 0.15;

        // Calculate quality score
        let score = 100;
        if (!hasTitle) score -= 25;
        if (!hasDescription) score -= 20;
        else if (descLength < 50) score -= 10;
        if (!hasImage) score -= 15;
        if (!hasPrice) score -= 25;
        if (!hasBrand) score -= 8;
        if (!hasCategory) score -= 7;

        score = Math.max(0, Math.min(100, score));

        // Collect issues for low-quality products
        const productIssues: typeof ISSUE_TYPES = [];
        if (!hasTitle) productIssues.push(ISSUE_TYPES.find(t => t.type === 'missing_title')!);
        if (!hasDescription) productIssues.push(ISSUE_TYPES.find(t => t.type === 'missing_description')!);
        else if (descLength < 50) productIssues.push(ISSUE_TYPES.find(t => t.type === 'short_description')!);
        if (!hasImage) productIssues.push(ISSUE_TYPES.find(t => t.type === 'missing_image')!);
        if (!hasPrice) productIssues.push(ISSUE_TYPES.find(t => t.type === 'missing_price')!);
        if (!hasBrand) productIssues.push(ISSUE_TYPES.find(t => t.type === 'missing_brand')!);
        if (!hasCategory) productIssues.push(ISSUE_TYPES.find(t => t.type === 'missing_category')!);

        const sku = `SKU-${String(10000 + i).padStart(5, '0')}`;
        const productId = crypto.randomUUID();

        products.push({
          id: productId,
          sku,
          title: hasTitle ? `${brand} ${category.split(' ')[0]} Product ${i + 1}` : null,
          description: hasDescription
            ? `Discover the exceptional quality of this ${category.toLowerCase()} product from ${brand}. ${'High-quality craftsmanship meets modern design. '.repeat(Math.ceil(descLength / 50)).slice(0, descLength)}`
            : null,
          brand: hasBrand ? brand : null,
          category: hasCategory ? category : null,
          price_cents: hasPrice ? Math.floor(Math.random() * 25000) + 500 : null,
          compare_at_price_cents: hasPrice && Math.random() > 0.5 ? Math.floor(Math.random() * 30000) + 1000 : null,
          cost_cents: hasPrice && Math.random() > 0.3 ? Math.floor(Math.random() * 12000) + 200 : null,
          inventory_quantity: Math.floor(Math.random() * 150),
          status: ['active', 'active', 'active', 'active', 'draft', 'draft', 'archived'][Math.floor(Math.random() * 7)] as 'active' | 'draft' | 'archived',
          product_type: ['physical', 'digital'][Math.floor(Math.random() * 2)],
          tags: ['featured', 'new', 'sale', 'bestseller'].slice(0, Math.floor(Math.random() * 3)),
          images: hasImage ? [
            {
              url: `https://images.unsplash.com/photo-${1523275335684 + i}-37898b6baf30?w=800`,
              alt: `Product ${i + 1}`
            }
          ] : [],
          quality_score: score,
          issues_count: productIssues.length,
        });

        if (productIssues.length > 0) {
          issues.push({ product_id: productId, sku, issues: productIssues });
        }
      }

      // Insert products
      const { error: productError } = await supabase
        .from('products')
        .insert(products);

      if (productError) throw productError;

      // Insert issues
      const allIssues: {
        product_id: string;
        issue_type: string;
        severity: string;
        channel: string | null;
        title: string;
        description: string | null;
        status: string;
      }[] = [];

      for (const { product_id, issues: prodIssues } of issues) {
        for (const issue of prodIssues) {
          allIssues.push({
            product_id,
            issue_type: issue.type,
            severity: issue.severity,
            channel: issue.type === 'non_compliant_channel' ? 'google_merchant_center' : null,
            title: issue.title,
            description: issue.description,
            status: 'open',
          });
        }
      }

      if (allIssues.length > 0) {
        const { error: issuesError } = await supabase
          .from('quality_issues')
          .insert(allIssues);

        if (issuesError) console.error('Issues insert error:', issuesError);
      }

      setMessage({
        type: 'success',
        text: `Generated 50 products with realistic quality scores and ${allIssues.length} issues`
      });
    } catch (error) {
      console.error('Generate error:', error);
      setMessage({ type: 'error', text: 'Failed to generate sample data' });
    } finally {
      setGenerating(false);
    }
  };

  const clearAllData = async () => {
    if (!confirm('Are you sure you want to delete all products? This cannot be undone.')) return;

    try {
      await supabase.from('quality_issues').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('product_attributes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('product_channel_compliance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      setMessage({ type: 'success', text: 'All data cleared' });
    } catch (error) {
      console.error('Clear error:', error);
      setMessage({ type: 'error', text: 'Failed to clear data' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">
          Manage your catalog data and quality rules
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-xl ${
          message.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600" />
          )}
          <span className={message.type === 'success' ? 'text-emerald-700' : 'text-red-700'}>
            {message.text}
          </span>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-slate-400 hover:text-slate-600"
          >
            &times;
          </button>
        </div>
      )}

      {/* Data Management */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-slate-500" />
            Data Management
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {/* Import */}
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-slate-900">Import Products</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Upload a JSON file with product data. Products will be matched by SKU.
                </p>
              </div>
              <label className={`px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 cursor-pointer transition-colors ${
                importing
                  ? 'bg-slate-100 text-slate-400'
                  : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600 shadow-sm'
              }`}>
                <Upload className="w-4 h-4" />
                {importing ? 'Importing...' : 'Import JSON'}
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={importing}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Export */}
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-slate-900">Export Products</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Download your product catalog as a JSON file.
                </p>
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                className={`px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors ${
                  exporting
                    ? 'bg-slate-100 text-slate-400'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Download className="w-4 h-4" />
                {exporting ? 'Exporting...' : 'Export JSON'}
              </button>
            </div>
          </div>

          {/* Generate Sample Data */}
          <div className="p-6 bg-gradient-to-r from-emerald-50/50 to-cyan-50/50">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-slate-900">Generate Demo Catalog</h3>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">Recommended</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Create 50 products with realistic quality scores (55% excellent, 28% good, 12% fair, 5% poor)
                  and associated issues for testing.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-lg text-xs text-slate-600 border border-slate-200">
                    <Sparkles className="w-3 h-3" />
                    Quality scores calculated
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-lg text-xs text-slate-600 border border-slate-200">
                    <AlertTriangle className="w-3 h-3" />
                    15-25 issues generated
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-lg text-xs text-slate-600 border border-slate-200">
                    <Package className="w-3 h-3" />
                    8 categories covered
                  </span>
                </div>
              </div>
              <button
                onClick={generateSampleData}
                disabled={generating}
                className={`px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors ${
                  generating
                    ? 'bg-slate-100 text-slate-400'
                    : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600 shadow-sm'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                {generating ? 'Generating...' : 'Generate Demo Data'}
              </button>
            </div>
          </div>

          {/* Clear Data */}
          <div className="p-6 bg-red-50/50">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-red-700">Clear All Data</h3>
                <p className="text-sm text-red-600/80 mt-1">
                  Permanently delete all products, issues, and attributes.
                </p>
              </div>
              <button
                onClick={clearAllData}
                className="px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Rules */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-slate-500" />
            Quality Scoring Rules
          </h2>
        </div>

        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4">
            These rules are used to calculate product quality scores and detect issues.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { field: 'Product Title', weight: 25, required: true, desc: 'Required for all sales channels' },
              { field: 'Description', weight: 20, required: true, desc: 'Min 50 chars for Google Merchant Center' },
              { field: 'Primary Image', weight: 15, required: true, desc: 'At least one image required' },
              { field: 'Price', weight: 25, required: true, desc: 'Required for all sales channels' },
              { field: 'Brand', weight: 8, required: false, desc: 'Required for Google Merchant Center' },
              { field: 'Category', weight: 7, required: false, desc: 'Improves browse navigation' },
            ].map((rule, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-900">{rule.field}</span>
                  <div className="flex items-center gap-2">
                    {rule.required && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Required</span>
                    )}
                    <span className="text-sm font-semibold text-slate-600">{rule.weight}pts</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500">{rule.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Channel Requirements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shopify */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-emerald-50">
            <h3 className="font-semibold text-emerald-800 flex items-center gap-2">
              <svg viewBox="0 0 109 124" className="w-5 h-5 fill-current text-emerald-600">
                <path d="M74.4 33.6c-.1-.1-.2-.1-.3-.2l-12.6-1.9c-.2 0-.4-.2-.4-.3l-1-3.4c-.1-.3-.4-.5-.7-.5h-3.9c-.3 0-.5.2-.6.5l-.6 2.3c-.1.3-.3.4-.6.4h-.5c-.3 0-.5-.1-.6-.4l-.6-2.3c-.1-.3-.3-.5-.6-.5h-4.2c-.3 0-.6.2-.7.5l-.9 3.2c-.1.3-.3.4-.5.4H41c-.3 0-.6.2-.7.5l-9.2 38.4c-.1.5.2.9.7.9h45.8c.4 0 .8-.3.8-.7l.1-.2c0-.1-.1-.3-.2-.4L74.4 33.6z" />
              </svg>
              Shopify Requirements
            </h3>
          </div>
          <div className="p-6 space-y-3">
            {[
              { field: 'Title', status: 'required', notes: 'Product title is required' },
              { field: 'SKU', status: 'required', notes: 'Unique identifier' },
              { field: 'Price', status: 'required', notes: 'Must be positive number' },
              { field: 'Description', status: 'recommended', notes: 'Improves conversion' },
              { field: 'Images', status: 'recommended', notes: 'At least 1 image' },
              { field: 'Weight', status: 'recommended', notes: 'For shipping rates' },
              { field: 'Category', status: 'recommended', notes: 'For organization' },
              { field: 'Brand', status: 'recommended', notes: 'Builds trust' },
            ].map((req, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{req.field}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{req.notes}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    req.status === 'required' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {req.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Google Merchant Center */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-blue-50">
            <h3 className="font-semibold text-blue-800 flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-blue-600">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google Merchant Center Requirements
            </h3>
          </div>
          <div className="p-6 space-y-3">
            {[
              { field: 'Title', status: 'required', notes: 'Max 150 characters' },
              { field: 'Description', status: 'required', notes: 'Min 50 characters' },
              { field: 'Price', status: 'required', notes: 'Valid price format' },
              { field: 'Brand', status: 'required', notes: 'Required for all products' },
              { field: 'Images', status: 'required', notes: 'Min 100x100px' },
              { field: 'Category', status: 'required', notes: 'Google taxonomy' },
              { field: 'GTIN', status: 'recommended', notes: 'Barcode/UPC' },
              { field: 'MPN', status: 'recommended', notes: 'Manufacturer part number' },
            ].map((req, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{req.field}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{req.notes}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    req.status === 'required' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {req.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-slate-900">About CatalogQA</h3>
            <p className="text-sm text-slate-600 mt-1">
              CatalogQA helps e-commerce teams maintain product data quality across multiple
              sales channels. It detects missing attributes, validates compliance requirements,
              and provides actionable insights to improve product discoverability and conversion rates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
