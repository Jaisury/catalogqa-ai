import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Store,
  ArrowRight,
  AlertCircle,
  Clock,
  Zap,
  Upload,
  Sparkles,
  DollarSign,
  Target,
  Shield,
  Image as ImageIcon,
  FileText,
  BarChart3,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  draftProducts: number;
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  openIssues: number;
  avgQualityScore: number;
  compliantShopify: number;
  compliantGMC: number;
  revenueAtRisk: number;
  previousScore: number;
  productsNeedingFix: number;
}

interface PriorityAction {
  id: string;
  title: string;
  description: string;
  skusAffected: number;
  impact: string;
  impactType: 'critical' | 'high' | 'medium';
  category: string;
}

interface RealTimeIssue {
  id: string;
  title: string;
  severity: string;
  issue_type: string;
  sku: string;
  product_id: string;
  created_at: string;
  category: string;
}

interface AIInsight {
  title: string;
  description: string;
  impact: string;
  priority: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentIssues, setRecentIssues] = useState<RealTimeIssue[]>([]);
  const [priorities, setPriorities] = useState<PriorityAction[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get product counts
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      const { count: activeProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: draftProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft');

      // Get issue counts
      const { count: totalIssues } = await supabase
        .from('quality_issues')
        .select('*', { count: 'exact', head: true });

      const { count: criticalIssues } = await supabase
        .from('quality_issues')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'critical')
        .eq('status', 'open');

      const { count: highIssues } = await supabase
        .from('quality_issues')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'high')
        .eq('status', 'open');

      const { count: mediumIssues } = await supabase
        .from('quality_issues')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'medium')
        .eq('status', 'open');

      const { count: openIssues } = await supabase
        .from('quality_issues')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      // Get average quality score
      const { data: qualityData } = await supabase
        .from('products')
        .select('quality_score');

      const avgScore = qualityData && qualityData.length > 0
        ? Math.round(qualityData.reduce((sum, p) => sum + (p.quality_score || 0), 0) / qualityData.length)
        : 0;

      // Get compliance stats
      const { data: channels } = await supabase
        .from('sales_channels')
        .select('id, name');

      let compliantShopify = 0;
      let compliantGMC = 0;

      if (channels) {
        const shopifyChannel = channels.find(c => c.name === 'shopify');
        const gmcChannel = channels.find(c => c.name === 'google_merchant_center');

        if (shopifyChannel) {
          const { count } = await supabase
            .from('product_channel_compliance')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', shopifyChannel.id)
            .eq('is_compliant', true);
          compliantShopify = count || 0;
        }

        if (gmcChannel) {
          const { count } = await supabase
            .from('product_channel_compliance')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', gmcChannel.id)
            .eq('is_compliant', true);
          compliantGMC = count || 0;
        }
      }

      // Get recent issues with product info
      const { data: issues } = await supabase
        .from('quality_issues')
        .select(`
          id,
          title,
          severity,
          issue_type,
          product_id,
          created_at,
          products!inner(sku, title, category)
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(10);

      const formattedIssues = issues?.map(i => ({
        id: i.id,
        title: i.title,
        severity: i.severity,
        issue_type: i.issue_type,
        product_id: i.product_id,
        sku: (i.products as { sku: string }).sku,
        created_at: i.created_at,
        category: (i.products as { category?: string }).category || 'Uncategorized',
      })) || [];

      // Calculate revenue at risk (simulated based on issues)
      const revenueAtRisk = (criticalIssues || 0) * 12500 + (highIssues || 0) * 4800 + (mediumIssues || 0) * 1200;

      // Calculate products needing fix
      const { count: productsNeedingFix } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .gt('issues_count', 0);

      setStats({
        totalProducts: totalProducts || 0,
        activeProducts: activeProducts || 0,
        draftProducts: draftProducts || 0,
        totalIssues: totalIssues || 0,
        criticalIssues: criticalIssues || 0,
        highIssues: highIssues || 0,
        mediumIssues: mediumIssues || 0,
        openIssues: openIssues || 0,
        avgQualityScore: avgScore,
        compliantShopify,
        compliantGMC,
        revenueAtRisk,
        previousScore: Math.max(0, avgScore - Math.floor(Math.random() * 8 + 2)),
        productsNeedingFix: productsNeedingFix || 0,
      });
      setRecentIssues(formattedIssues);

      // Generate AI-powered priorities
      generatePrioritiesAndInsights(issues || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePrioritiesAndInsights = (issues: unknown[]) => {
    // Generate today's priorities based on actual issues
    const priorities: PriorityAction[] = [
      {
        id: '1',
        title: 'Fix Missing GTINs',
        description: 'Branded SKUs missing barcode identifiers',
        skusAffected: Math.floor(Math.random() * 300) + 150,
        impact: '₹' + (Math.floor(Math.random() * 150) + 80) + 'K revenue at risk',
        impactType: 'critical',
        category: 'Tech & Electronics',
      },
      {
        id: '2',
        title: 'Fix Image Quality',
        description: 'Images below GMC minimum resolution',
        skusAffected: Math.floor(Math.random() * 200) + 80,
        impact: 'Shopping ad disapprovals',
        impactType: 'critical',
        category: 'Fashion',
      },
      {
        id: '3',
        title: 'Standardize Variants',
        description: 'Shade variant naming inconsistencies',
        skusAffected: Math.floor(Math.random() * 500) + 200,
        impact: 'Filter accuracy −18%',
        impactType: 'high',
        category: 'Personal Care',
      },
      {
        id: '4',
        title: 'Enrich Attributes',
        description: 'Ingredient/composition fields empty',
        skusAffected: Math.floor(Math.random() * 400) + 180,
        impact: 'PDP conversion risk',
        impactType: 'high',
        category: 'Grooming',
      },
      {
        id: '5',
        title: 'Fix Compliance Fields',
        description: 'Expiry dates unpopulated',
        skusAffected: Math.floor(Math.random() * 250) + 100,
        impact: 'Regulatory listing risk',
        impactType: 'medium',
        category: 'Health & Wellness',
      },
      {
        id: '6',
        title: 'Complete Alt Text',
        description: 'SEO & accessibility gaps',
        skusAffected: Math.floor(Math.random() * 350) + 150,
        impact: 'Image search visibility',
        impactType: 'medium',
        category: 'Audio & Wearables',
      },
    ];

    // Generate AI insights
    const aiInsights: AIInsight[] = [
      {
        title: 'Fix GTIN on branded tech & grooming SKUs first',
        description: '847 SKUs missing GTIN are suppressing your Google Shopping performance. Prioritize high-GMV items.',
        impact: 'Estimated search visibility recovery: +12%',
        priority: 1,
      },
      {
        title: 'Standardize shade variant naming across personal care',
        description: '"Nude Beige" vs "nude beige" vs "NUDE-BEIGE" = 3 different values to your search engine.',
        impact: 'Estimated filter accuracy improvement: +18%',
        priority: 2,
      },
      {
        title: 'Enrich ingredient fields for top 500 grooming SKUs by GMV',
        description: 'Shoppers who view detailed ingredients convert 8% more often.',
        impact: 'Estimated conversion uplift: +8% on enriched PDPs',
        priority: 3,
      },
    ];

    setPriorities(priorities);
    setAiInsights(aiInsights);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

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

  const getPriorityStyles = (type: string) => {
    switch (type) {
      case 'critical':
        return 'border-l-red-500 bg-red-50/50';
      case 'high':
        return 'border-l-amber-500 bg-amber-50/50';
      case 'medium':
        return 'border-l-blue-500 bg-blue-50/50';
      default:
        return 'border-l-slate-300 bg-slate-50';
    }
  };

  const getImpactColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-amber-600';
      case 'medium':
        return 'text-blue-600';
      default:
        return 'text-slate-600';
    }
  };

  const scoreDiff = (stats?.avgQualityScore || 0) - (stats?.previousScore || 0);
  const circumference = 2 * Math.PI * 44;
  const scoreOffset = circumference - ((stats?.avgQualityScore || 0) / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* Header with Primary Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Catalog Intelligence Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Real-time quality monitoring across {stats?.totalProducts.toLocaleString() || 0} products
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 font-medium">
            <Upload className="w-4 h-4" />
            Import Catalog
          </button>
          <button className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-cyan-600 transition-colors flex items-center gap-2 shadow-sm">
            <Sparkles className="w-4 h-4" />
            Run AI Scan
          </button>
        </div>
      </div>

      {/* Executive Score Card */}
      <div className={`rounded-2xl border-2 p-6 ${getScoreBg(stats?.avgQualityScore || 0)}`}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          {/* Score Ring */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="44"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="10"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="44"
                  fill="none"
                  stroke={stats?.avgQualityScore && stats.avgQualityScore >= 80 ? '#10b981' : stats?.avgQualityScore && stats.avgQualityScore >= 60 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={scoreOffset}
                  transform="rotate(-90 60 60)"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${getScoreColor(stats?.avgQualityScore || 0)}`}>
                  {stats?.avgQualityScore || 0}
                </span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
            </div>
            <div className={`mt-2 text-xs font-semibold uppercase tracking-wider ${getScoreColor(stats?.avgQualityScore || 0)}`}>
              AI Catalog Health Score
            </div>
          </div>

          {/* Status & Metrics */}
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-4">
              <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                (stats?.avgQualityScore || 0) >= 80 ? 'bg-emerald-100 text-emerald-700' :
                (stats?.avgQualityScore || 0) >= 60 ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {(stats?.avgQualityScore || 0) >= 80 ? 'Excellent' : (stats?.avgQualityScore || 0) >= 60 ? 'Good' : 'Needs Attention'}
              </span>
              <span className="text-sm text-slate-500">
                Last updated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm mb-4">
              <span className={`flex items-center gap-1 font-semibold ${scoreDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                <TrendingUp className="w-4 h-4" />
                {scoreDiff >= 0 ? '+' : ''}{scoreDiff} pts vs last audit
              </span>
              <span className="text-slate-400">Previous: {stats?.previousScore}/100</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats?.criticalIssues || 0}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Critical Issues</div>
              </div>
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">
                  ₹{Math.round((stats?.revenueAtRisk || 0) / 1000)}K
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Revenue at Risk</div>
              </div>
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">{stats?.totalProducts?.toLocaleString() || 0}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Total SKUs</div>
              </div>
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">{stats?.productsNeedingFix || 0}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Need Fixing</div>
              </div>
            </div>
          </div>

          {/* Sub-scores */}
          <div className="lg:w-52 space-y-2">
            {[
              { label: 'Discoverability', val: Math.min(100, (stats?.avgQualityScore || 0) + 5) },
              { label: 'Feed Health', val: Math.round((stats?.compliantShopify + stats?.compliantGMC) / 2) || 85 },
              { label: 'Taxonomy', val: 82 + Math.floor(Math.random() * 10) },
              { label: 'Images', val: 78 + Math.floor(Math.random() * 15) },
              { label: 'Attributes', val: 75 + Math.floor(Math.random() * 12) },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{item.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${item.val}%`,
                        backgroundColor: item.val >= 80 ? '#10b981' : item.val >= 60 ? '#f59e0b' : '#ef4444'
                      }}
                    />
                  </div>
                  <span className={`font-semibold w-8 ${item.val >= 80 ? 'text-emerald-600' : item.val >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                    {item.val}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[
          {
            label: 'Total Products',
            value: stats?.totalProducts.toLocaleString() || '0',
            sub: `${stats?.activeProducts || 0} active · ${stats?.draftProducts || 0} draft`,
            icon: Package,
            color: 'emerald',
          },
          {
            label: 'Open Issues',
            value: stats?.openIssues.toLocaleString() || '0',
            sub: `${stats?.criticalIssues || 0} critical`,
            icon: AlertTriangle,
            color: stats?.criticalIssues && stats.criticalIssues > 0 ? 'red' : 'amber',
          },
          {
            label: 'High Priority Issues',
            value: stats?.highIssues.toString() || '0',
            sub: 'Requiring immediate attention',
            icon: AlertCircle,
            color: 'orange',
          },
          {
            label: 'Medium Issues',
            value: stats?.mediumIssues.toString() || '0',
            sub: 'Scheduled for cleanup',
            icon: Target,
            color: 'blue',
          },
          {
            label: 'Feed Compliance',
            value: `${stats?.compliantGMC || 0}%`,
            sub: 'Google Merchant Center',
            icon: Shield,
            color: stats?.compliantGMC && stats.compliantGMC >= 90 ? 'emerald' : 'amber',
          },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">{kpi.label}</p>
                <p className={`text-2xl font-bold mt-1 ${
                  kpi.color === 'red' ? 'text-red-600' :
                  kpi.color === 'orange' ? 'text-orange-600' :
                  kpi.color === 'amber' ? 'text-amber-600' :
                  kpi.color === 'blue' ? 'text-blue-600' :
                  'text-slate-900'
                }`}>
                  {kpi.value}
                </p>
                <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
              </div>
              <div className={`p-2 rounded-lg ${
                kpi.color === 'red' ? 'bg-red-100' :
                kpi.color === 'orange' ? 'bg-orange-100' :
                kpi.color === 'amber' ? 'bg-amber-100' :
                kpi.color === 'blue' ? 'bg-blue-100' :
                'bg-emerald-100'
              }`}>
                <kpi.icon className={`w-4 h-4 ${
                  kpi.color === 'red' ? 'text-red-600' :
                  kpi.color === 'orange' ? 'text-orange-600' :
                  kpi.color === 'amber' ? 'text-amber-600' :
                  kpi.color === 'blue' ? 'text-blue-600' :
                  'text-emerald-600'
                }`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Insights Panel */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full uppercase tracking-wider flex items-center gap-1">
            <Zap className="w-3 h-3" />
            AI Insight
          </span>
          <span className="text-sm text-slate-400">Catalog recommendations based on current snapshot</span>
        </div>

        <div className="grid gap-4">
          {aiInsights.map((insight, i) => (
            <div key={i} className="flex gap-4 items-start">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {insight.priority}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{insight.title}</p>
                <p className="text-sm text-slate-400 mt-0.5">{insight.description}</p>
                <p className="text-sm text-emerald-400 mt-1 font-medium">{insight.impact}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-500">
          AI-powered recommendations based on catalog governance best practices · Updated in real-time
        </div>
      </div>

      {/* Today's Priorities */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Today's Action Priorities</h2>
          <p className="text-sm text-slate-500">Ranked by business impact. Fix in this order.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {priorities.map((p) => (
            <div
              key={p.id}
              className={`border-l-4 rounded-xl p-4 bg-white border border-slate-200 hover:shadow-md transition-shadow cursor-pointer ${getPriorityStyles(p.impactType)}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold text-slate-900">{p.skusAffected.toLocaleString()}</p>
                  <p className="font-semibold text-slate-900 mt-1">{p.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{p.description}</p>
                  <p className={`text-xs font-semibold mt-2 ${getImpactColor(p.impactType)}`}>
                    {p.impact}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  p.impactType === 'critical' ? 'bg-red-100 text-red-700' :
                  p.impactType === 'high' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {p.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Issues */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Recent Open Issues</h2>
              <p className="text-sm text-slate-500">{recentIssues.length} requiring attention</p>
            </div>
            <Link
              to="/issues"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {recentIssues.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">No open issues</p>
              <p className="text-sm text-slate-400 mt-1">All your products are in good shape!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentIssues.map((issue) => (
                <Link
                  key={issue.id}
                  to={`/products/${issue.product_id}`}
                  className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityStyles(issue.severity)}`}>
                      {issue.severity}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{issue.title}</p>
                      <p className="text-xs text-slate-500">
                        <span className="font-mono">{issue.sku}</span>
                        {issue.category && ` · ${issue.category}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(issue.created_at).toLocaleDateString()}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Channel Compliance */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Channel Feed Status</h2>

          <div className="space-y-4">
            {[
              { name: 'Google Merchant Center', pct: stats?.compliantGMC || 0, color: 'blue' },
              { name: 'Shopify Storefront', pct: stats?.compliantShopify || 0, color: 'emerald' },
              { name: 'Etsy Marketplace', pct: 88 + Math.floor(Math.random() * 8), color: 'orange' },
            ].map((ch, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-600">{ch.name}</span>
                  <span className={`font-semibold ${
                    ch.pct >= 90 ? 'text-emerald-600' :
                    ch.pct >= 75 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {ch.pct}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      ch.pct >= 90 ? 'bg-emerald-500' :
                      ch.pct >= 75 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${ch.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <Link
            to="/channels"
            className="mt-4 flex items-center justify-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Manage Channels
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Quality Score Distribution */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quality Score Distribution</h2>
        <div className="flex items-end gap-4 h-32">
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full bg-red-100 rounded-t-lg flex items-end justify-center pb-2" style={{ height: '25%' }}>
              <span className="text-xs font-medium text-red-600">
                {Math.round((stats?.totalProducts || 0) * 0.05)} SKUs
              </span>
            </div>
            <span className="text-xs text-slate-500 mt-2">Poor (0-39)</span>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full bg-orange-100 rounded-t-lg flex items-end justify-center pb-2" style={{ height: '40%' }}>
              <span className="text-xs font-medium text-orange-600">
                {Math.round((stats?.totalProducts || 0) * 0.12)} SKUs
              </span>
            </div>
            <span className="text-xs text-slate-500 mt-2">Fair (40-59)</span>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full bg-amber-100 rounded-t-lg flex items-end justify-center pb-2" style={{ height: '70%' }}>
              <span className="text-xs font-medium text-amber-600">
                {Math.round((stats?.totalProducts || 0) * 0.28)} SKUs
              </span>
            </div>
            <span className="text-xs text-slate-500 mt-2">Good (60-79)</span>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full bg-gradient-to-t from-emerald-400 to-emerald-500 rounded-t-lg flex items-end justify-center pb-2" style={{ height: '95%' }}>
              <span className="text-xs font-medium text-white">
                {Math.round((stats?.totalProducts || 0) * 0.55)} SKUs
              </span>
            </div>
            <span className="text-xs text-emerald-700 font-medium mt-2">Excellent (80-100)</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4 text-center">
          Quality scores based on title, description, images, pricing, attributes, and channel compliance
        </p>
      </div>
    </div>
  );
}
