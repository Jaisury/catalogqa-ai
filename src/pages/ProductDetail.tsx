import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  AlertTriangle,
  CheckCircle,
  Store,
  Edit,
  Trash2,
  Tag,
  DollarSign,
  Image as ImageIcon,
  FileText,
  Settings,
  ChevronRight,
  XCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { supabase, Product, ProductAttribute, QualityIssue, ProductChannelCompliance } from '../lib/supabase';

interface ProductDetail extends Product {
  attributes: ProductAttribute[];
  issues: QualityIssue[];
  compliance: (ProductChannelCompliance & { channel_name: string })[];
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadProduct();
  }, [id]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      // Get product
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (productError) throw productError;
      if (!productData) {
        setProduct(null);
        return;
      }

      // Get attributes
      const { data: attributes } = await supabase
        .from('product_attributes')
        .select('*')
        .eq('product_id', id)
        .order('attribute_name');

      // Get issues
      const { data: issues } = await supabase
        .from('quality_issues')
        .select('*')
        .eq('product_id', id)
        .order('created_at', { ascending: false });

      // Get compliance
      const { data: compliance } = await supabase
        .from('product_channel_compliance')
        .select(`
          *,
          sales_channels!inner(name)
        `)
        .eq('product_id', id);

      const formattedCompliance = compliance?.map(c => ({
        ...c,
        channel_name: (c.sales_channels as { name: string }).name,
      })) || [];

      setProduct({
        ...productData,
        attributes: attributes || [],
        issues: issues || [],
        compliance: formattedCompliance,
      });
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'bg-amber-50 border-amber-200';
    if (score >= 40) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'missing_title':
      case 'missing_description':
        return <FileText className="w-4 h-4" />;
      case 'missing_image':
      case 'low_quality_image':
        return <ImageIcon className="w-4 h-4" />;
      case 'missing_price':
      case 'invalid_price':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const resolveIssue = async (issueId: string) => {
    await supabase
      .from('quality_issues')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', issueId);
    loadProduct();
  };

  const ignoreIssue = async (issueId: string) => {
    await supabase
      .from('quality_issues')
      .update({ status: 'ignored' })
      .eq('id', issueId);
    loadProduct();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Package className="w-12 h-12 text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium">Product not found</p>
        <Link to="/products" className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>
      </div>
    );
  }

  const criticalIssues = product.issues.filter(i => i.severity === 'critical' && i.status === 'open');
  const openIssues = product.issues.filter(i => i.status === 'open');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/products"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{product.title || 'Untitled Product'}</h1>
            <p className="text-slate-500 mt-1">SKU: {product.sku}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2">
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-cyan-600 transition-colors">
            Run Quality Check
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Product Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quality Score Card */}
          <div className={`rounded-xl border-2 p-6 ${getScoreBg(product.quality_score)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Quality Score</p>
                <p className={`text-5xl font-bold ${getScoreColor(product.quality_score)}`}>
                  {product.quality_score}%
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-slate-600">
                    {openIssues.length} open issues
                  </span>
                </div>
                {criticalIssues.length > 0 && (
                  <p className="text-sm text-red-600 font-medium">
                    {criticalIssues.length} critical
                  </p>
                )}
              </div>
            </div>

            {/* Score breakdown bars */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-24 text-xs text-slate-500">Title</span>
                <div className="flex-1 h-2 bg-white/50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: product.title ? '100%' : '0%' }}></div>
                </div>
                <span className="w-8 text-xs text-slate-600 text-right">{product.title ? '100%' : '0%'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-24 text-xs text-slate-500">Description</span>
                <div className="flex-1 h-2 bg-white/50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: product.description ? `${Math.min(100, (product.description?.length || 0) / 2)}%` : '0%' }}></div>
                </div>
                <span className="w-8 text-xs text-slate-600 text-right">{product.description ? `${Math.min(100, Math.round((product.description?.length || 0) / 2))}%` : '0%'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-24 text-xs text-slate-500">Images</span>
                <div className="flex-1 h-2 bg-white/50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: product.images?.length > 0 ? '100%' : '0%' }}></div>
                </div>
                <span className="w-8 text-xs text-slate-600 text-right">{product.images?.length || 0}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-24 text-xs text-slate-500">Price</span>
                <div className="flex-1 h-2 bg-white/50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: product.price_cents ? '100%' : '0%' }}></div>
                </div>
                <span className="w-8 text-xs text-slate-600 text-right">{product.price_cents ? '100%' : '0%'}</span>
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Product Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Images */}
              <div>
                <p className="text-sm font-medium text-slate-500 mb-2">Images</p>
                {product.images && product.images.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {product.images.map((img, i) => (
                      <div key={i} className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                        <img
                          src={img.url}
                          alt={img.alt || product.title || 'Product'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="aspect-video rounded-lg bg-slate-100 flex items-center justify-center">
                    <div className="text-center">
                      <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">No images</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Brand</p>
                  <p className="text-slate-900 mt-1">{product.brand || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Category</p>
                  <p className="text-slate-900 mt-1">{product.category || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Product Type</p>
                  <p className="text-slate-900 mt-1">{product.product_type || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                    product.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    product.status === 'draft' ? 'bg-slate-100 text-slate-700' :
                    'bg-slate-200 text-slate-500'
                  }`}>
                    {product.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mt-6">
              <p className="text-sm font-medium text-slate-500 mb-2">Description</p>
              <p className="text-slate-900 whitespace-pre-wrap">
                {product.description || 'No description provided'}
              </p>
            </div>

            {/* Pricing */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Price</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {product.price_cents ? `$${(product.price_cents / 100).toFixed(2)}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Compare at</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {product.compare_at_price_cents ? `$${(product.compare_at_price_cents / 100).toFixed(2)}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Cost</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {product.cost_cents ? `$${(product.cost_cents / 100).toFixed(2)}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Inventory</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {product.inventory_quantity}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Attributes */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Attributes</h2>
              <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                Add Attribute
              </button>
            </div>

            {product.attributes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {product.attributes.map(attr => (
                  <div key={attr.id} className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{attr.attribute_name}</p>
                      {attr.is_required && (
                        <span className="text-xs text-red-500">Required</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{attr.attribute_value || '—'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Settings className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No custom attributes</p>
              </div>
            )}
          </div>

          {/* Open Issues */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Issues</h2>
              <span className="text-sm text-slate-500">{openIssues.length} open</span>
            </div>

            {product.issues.length > 0 ? (
              <div className="space-y-3">
                {product.issues.map(issue => (
                  <div
                    key={issue.id}
                    className={`p-4 rounded-lg border ${
                      issue.status === 'open' ? 'bg-slate-50 border-slate-200' :
                      issue.status === 'resolved' ? 'bg-emerald-50 border-emerald-200' :
                      'bg-slate-100 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          issue.severity === 'critical' ? 'bg-red-100' :
                          issue.severity === 'high' ? 'bg-orange-100' :
                          'bg-amber-100'
                        }`}>
                          {getIssueIcon(issue.issue_type)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{issue.title}</p>
                          <p className="text-sm text-slate-500 mt-1">{issue.description}</p>
                          {issue.suggested_fix && (
                            <p className="text-sm text-emerald-600 mt-2">
                              Suggestion: {issue.suggested_fix}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityStyles(issue.severity)}`}>
                          {issue.severity}
                        </span>
                        {issue.status === 'open' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => resolveIssue(issue.id)}
                              className="px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-100 rounded transition-colors"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => ignoreIssue(issue.id)}
                              className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded transition-colors"
                            >
                              Ignore
                            </button>
                          </div>
                        )}
                        {issue.status === 'resolved' && (
                          <span className="text-xs text-emerald-600">Resolved</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-slate-600 font-medium">No issues found</p>
                <p className="text-sm text-slate-400 mt-1">This product has been validated</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Channel Compliance */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Channel Compliance</h2>

            <div className="space-y-3">
              {product.compliance.map(comp => (
                <div
                  key={comp.id}
                  className={`p-4 rounded-lg border ${
                    comp.is_compliant ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-slate-600" />
                      <span className="font-medium text-slate-900 capitalize">
                        {comp.channel_name.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {comp.is_compliant ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    )}
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-500">Compliance Score</span>
                      <span className="font-medium text-slate-900">{comp.compliance_score}%</span>
                    </div>
                    <div className="h-2 bg-white rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${comp.is_compliant ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${comp.compliance_score}%` }}
                      ></div>
                    </div>
                  </div>

                  {comp.issues && comp.issues.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {comp.issues.slice(0, 3).map((issue, i) => (
                        <p key={i} className="text-xs text-amber-700">
                          • {issue.message}
                        </p>
                      ))}
                    </div>
                  )}

                  <button className="mt-3 w-full py-2 text-sm font-medium text-slate-600 hover:bg-white rounded-lg transition-colors">
                    View Requirements
                  </button>
                </div>
              ))}
            </div>

            <Link
              to="/channels"
              className="mt-4 flex items-center justify-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Manage Channels
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Tags</h2>
            {product.tags && product.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag, i) => (
                  <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-sm rounded-full flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No tags</p>
            )}
          </div>

          {/* SEO */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">SEO</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-500">SEO Title</p>
                <p className="text-sm text-slate-900 mt-1">{product.seo_title || product.title || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">SEO Description</p>
                <p className="text-sm text-slate-900 mt-1">{product.seo_description || product.description?.slice(0, 160) || '—'}</p>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Metadata</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Created</span>
                <span className="text-slate-900 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(product.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Last Updated</span>
                <span className="text-slate-900 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(product.updated_at).toLocaleDateString()}
                </span>
              </div>
              {product.weight_grams && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Weight</span>
                  <span className="text-slate-900">{product.weight_grams} {product.weight_unit}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
