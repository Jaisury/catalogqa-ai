import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Package,
  Eye,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { supabase, QualityIssue } from '../lib/supabase';

const ITEMS_PER_PAGE = 25;

interface IssueWithProduct extends QualityIssue {
  products: { sku: string; title: string | null };
}

export default function Issues() {
  const [issues, setIssues] = useState<IssueWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [totalCount, setTotalCount] = useState(0);
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());

  const search = searchParams.get('search') || '';
  const severity = searchParams.get('severity') || '';
  const status = searchParams.get('status') || 'open';
  const issueType = searchParams.get('type') || '';
  const channel = searchParams.get('channel') || '';
  const page = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    loadIssues();
  }, [page, severity, status, issueType, channel, search]);

  const loadIssues = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('quality_issues')
        .select(`
          id,
          product_id,
          issue_type,
          severity,
          channel,
          title,
          description,
          suggested_fix,
          status,
          created_at,
          resolved_at,
          products!inner(sku, title)
        `, { count: 'exact' });

      // Apply filters
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (severity) {
        query = query.eq('severity', severity);
      }
      if (issueType) {
        query = query.eq('issue_type', issueType);
      }
      if (channel) {
        query = query.eq('channel', channel);
      }

      // Pagination
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setIssues(data as IssueWithProduct[] || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const toggleSelectAll = () => {
    if (selectedIssues.size === issues.length) {
      setSelectedIssues(new Set());
    } else {
      setSelectedIssues(new Set(issues.map(i => i.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIssues);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIssues(newSet);
  };

  const resolveIssues = async (issueIds: string[]) => {
    await supabase
      .from('quality_issues')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .in('id', issueIds);
    setSelectedIssues(new Set());
    loadIssues();
  };

  const ignoreIssues = async (issueIds: string[]) => {
    await supabase
      .from('quality_issues')
      .update({ status: 'ignored' })
      .in('id', issueIds);
    setSelectedIssues(new Set());
    loadIssues();
  };

  const getSeverityStyles = (s: string) => {
    switch (s) {
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

  const getStatusStyles = (s: string) => {
    switch (s) {
      case 'open':
        return 'bg-amber-100 text-amber-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'resolved':
        return 'bg-emerald-100 text-emerald-700';
      case 'ignored':
        return 'bg-slate-100 text-slate-500';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getIssueTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      missing_title: 'Missing Title',
      missing_description: 'Missing Description',
      missing_image: 'Missing Image',
      missing_price: 'Missing Price',
      missing_sku: 'Missing SKU',
      missing_category: 'Missing Category',
      missing_brand: 'Missing Brand',
      short_description: 'Short Description',
      short_title: 'Short Title',
      invalid_price: 'Invalid Price',
      low_quality_image: 'Low Quality Image',
      missing_attribute: 'Missing Attribute',
      non_compliant_channel: 'Channel Non-Compliant',
      duplicate_sku: 'Duplicate SKU',
      broken_image_url: 'Broken Image URL',
    };
    return labels[type] || type;
  };

  const issueTypes = [
    { value: 'missing_title', label: 'Missing Title' },
    { value: 'missing_description', label: 'Missing Description' },
    { value: 'missing_image', label: 'Missing Image' },
    { value: 'missing_price', label: 'Missing Price' },
    { value: 'missing_brand', label: 'Missing Brand' },
    { value: 'missing_category', label: 'Missing Category' },
    { value: 'short_description', label: 'Short Description' },
    { value: 'non_compliant_channel', label: 'Channel Non-Compliant' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quality Issues</h1>
          <p className="text-slate-500 mt-1">
            Track and resolve product data quality issues
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => handleFilterChange('severity', 'critical')}
          className={`p-4 rounded-xl border transition-colors ${
            severity === 'critical' ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-white hover:border-red-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-left">
              <p className="text-sm text-slate-500">Critical</p>
              <p className="text-xl font-bold text-slate-900">
                {issues.filter(i => i.severity === 'critical' && i.status === 'open').length}
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleFilterChange('severity', 'high')}
          className={`p-4 rounded-xl border transition-colors ${
            severity === 'high' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-white hover:border-orange-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-left">
              <p className="text-sm text-slate-500">High</p>
              <p className="text-xl font-bold text-slate-900">
                {issues.filter(i => i.severity === 'high' && i.status === 'open').length}
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleFilterChange('severity', 'medium')}
          className={`p-4 rounded-xl border transition-colors ${
            severity === 'medium' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white hover:border-amber-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-left">
              <p className="text-sm text-slate-500">Medium</p>
              <p className="text-xl font-bold text-slate-900">
                {issues.filter(i => i.severity === 'medium' && i.status === 'open').length}
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleFilterChange('status', 'resolved')}
          className={`p-4 rounded-xl border transition-colors ${
            status === 'resolved' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-left">
              <p className="text-sm text-slate-500">Resolved</p>
              <p className="text-xl font-bold text-slate-900">
                {issues.filter(i => i.status === 'resolved').length}
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search issues..."
              value={search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex gap-2 flex-wrap">
            <select
              value={status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="ignored">Ignored</option>
            </select>

            <select
              value={severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            >
              <option value="">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={issueType}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            >
              <option value="">All Types</option>
              {issueTypes.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <select
              value={channel}
              onChange={(e) => handleFilterChange('channel', e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            >
              <option value="">All Channels</option>
              <option value="shopify">Shopify</option>
              <option value="google_merchant_center">Google Merchant Center</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIssues.size > 0 && (
        <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
          <span className="text-sm text-emerald-700 font-medium">
            {selectedIssues.size} issues selected
          </span>
          <div className="flex-1"></div>
          <button
            onClick={() => resolveIssues(Array.from(selectedIssues))}
            className="px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1"
          >
            <CheckCircle className="w-4 h-4" />
            Resolve All
          </button>
          <button
            onClick={() => ignoreIssues(Array.from(selectedIssues))}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
          >
            <XCircle className="w-4 h-4" />
            Ignore All
          </button>
        </div>
      )}

      {/* Issues List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedIssues.size === issues.length && issues.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-sm text-slate-500">
              {totalCount} issues
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No issues found</p>
            <p className="text-sm text-slate-400 mt-1">
              {status === 'open' ? 'All issues have been resolved!' : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className={`p-4 hover:bg-slate-50 transition-colors ${
                  issue.status === 'ignored' ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIssues.has(issue.id)}
                    onChange={() => toggleSelect(issue.id)}
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getSeverityStyles(issue.severity)}`}>
                        {issue.severity}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusStyles(issue.status)}`}>
                        {issue.status}
                      </span>
                      {issue.channel && (
                        <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded">
                          {issue.channel}
                        </span>
                      )}
                    </div>

                    <h3 className="font-medium text-slate-900 mt-2">{issue.title}</h3>
                    {issue.description && (
                      <p className="text-sm text-slate-500 mt-1">{issue.description}</p>
                    )}

                    <div className="flex items-center gap-4 mt-3">
                      <Link
                        to={`/products/${issue.product_id}`}
                        className="text-sm text-slate-600 hover:text-emerald-600 flex items-center gap-1"
                      >
                        <Package className="w-4 h-4" />
                        {issue.products.sku} - {issue.products.title || 'Untitled'}
                      </Link>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(issue.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {issue.status === 'open' && (
                      <>
                        <button
                          onClick={() => resolveIssues([issue.id])}
                          className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                          title="Resolve"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => ignoreIssues([issue.id])}
                          className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Ignore"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    <Link
                      to={`/products/${issue.product_id}`}
                      className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                      title="View Product"
                    >
                      <Eye className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleFilterChange('page', String(page - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handleFilterChange('page', String(pageNum))}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      pageNum === page
                        ? 'bg-emerald-500 text-white'
                        : 'hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => handleFilterChange('page', String(page + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
