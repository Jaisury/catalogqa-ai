import { useEffect, useState } from 'react';
import {
  Store,
  CheckCircle,
  AlertTriangle,
  Settings,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  Play,
  Pause,
} from 'lucide-react';
import { supabase, SalesChannel, ChannelRequirement } from '../lib/supabase';

interface ChannelWithStats extends SalesChannel {
  requirements: ChannelRequirement[];
  compliant_count: number;
  total_products: number;
}

export default function Channels() {
  const [channels, setChannels] = useState<ChannelWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    setLoading(true);
    try {
      // Get channels
      const { data: channelsData } = await supabase
        .from('sales_channels')
        .select('*')
        .order('name');

      // Get requirements for each channel
      const { data: requirements } = await supabase
        .from('channel_requirements')
        .select('*');

      // Get total products
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Get compliance counts
      const { data: complianceData } = await supabase
        .from('product_channel_compliance')
        .select('channel_id, is_compliant');

      const complianceMap = complianceData?.reduce((acc, c) => {
        if (!acc[c.channel_id]) acc[c.channel_id] = { compliant: 0, total: 0 };
        acc[c.channel_id].total++;
        if (c.is_compliant) acc[c.channel_id].compliant++;
        return acc;
      }, {} as Record<string, { compliant: number; total: number }>) || {};

      const formattedChannels = channelsData?.map(c => ({
        ...c,
        requirements: requirements?.filter(r => r.channel_id === c.id) || [],
        compliant_count: complianceMap[c.id]?.compliant || 0,
        total_products: totalProducts || 0,
      })) || [];

      setChannels(formattedChannels);
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChannelIcon = (name: string) => {
    if (name === 'shopify') {
      return (
        <svg viewBox="0 0 109 124" className="w-6 h-6 fill-current">
          <path d="M74.4 33.6c-.1-.1-.2-.1-.3-.2l-12.6-1.9c-.2 0-.4-.2-.4-.3l-1-3.4c-.1-.3-.4-.5-.7-.5h-3.9c-.3 0-.5.2-.6.5l-.6 2.3c-.1.3-.3.4-.6.4h-.5c-.3 0-.5-.1-.6-.4l-.6-2.3c-.1-.3-.3-.5-.6-.5h-4.2c-.3 0-.6.2-.7.5l-.9 3.2c-.1.3-.3.4-.5.4H41c-.3 0-.6.2-.7.5l-9.2 38.4c-.1.5.2.9.7.9h45.8c.4 0 .8-.3.8-.7l.1-.2c0-.1-.1-.3-.2-.4L74.4 33.6z" />
        </svg>
      );
    }
    return <Store className="w-6 h-6" />;
  };

  const getRequirementTypeStyles = (type: string) => {
    switch (type) {
      case 'required':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'recommended':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'format':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales Channels</h1>
          <p className="text-slate-500 mt-1">
            Configure compliance requirements for your sales channels
          </p>
        </div>
        <button
          onClick={loadChannels}
          className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Channel Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {channels.map(channel => {
          const complianceRate = channel.total_products > 0
            ? Math.round((channel.compliant_count / channel.total_products) * 100)
            : 0;

          return (
            <div
              key={channel.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              {/* Channel Header */}
              <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                      channel.name === 'shopify' ? 'bg-green-100 text-green-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {getChannelIcon(channel.name)}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{channel.display_name}</h2>
                      <p className="text-sm text-slate-500">
                        {channel.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      title="Settings"
                    >
                      <Settings className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 ${
                        channel.is_active
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      }`}
                    >
                      {channel.is_active ? (
                        <>
                          <Pause className="w-4 h-4" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Enable
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Compliance Stats */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Compliance Rate</span>
                    <span className="text-sm font-medium text-slate-900">
                      {channel.compliant_count} / {channel.total_products} products
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        complianceRate >= 80 ? 'bg-emerald-500' :
                        complianceRate >= 60 ? 'bg-amber-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${complianceRate}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xl font-bold text-slate-900">{complianceRate}%</span>
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      {complianceRate >= 80 ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                      {complianceRate >= 80 ? 'Good' : 'Needs attention'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirements */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-700">Requirements</h3>
                  <span className="text-xs text-slate-500">
                    {channel.requirements.filter(r => r.is_active).length} active
                  </span>
                </div>

                <div className="space-y-2">
                  {channel.requirements.slice(0, 5).map(req => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getRequirementTypeStyles(req.requirement_type)}`}>
                          {req.requirement_type}
                        </span>
                        <span className="text-sm text-slate-700">{req.field_name}</span>
                      </div>
                      {req.validation_rule && (
                        <span className="text-xs text-slate-400">{req.validation_rule}</span>
                      )}
                    </div>
                  ))}
                </div>

                {channel.requirements.length > 5 && (
                  <button className="mt-3 w-full py-2 text-sm text-slate-600 hover:text-emerald-600 hover:bg-slate-50 rounded-lg transition-colors">
                    View all {channel.requirements.length} requirements
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 pb-6">
                <div className="flex gap-2">
                  <button className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-cyan-600 transition-colors text-sm">
                    Run Compliance Check
                  </button>
                  <button className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-sm flex items-center gap-1">
                    View Issues
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Channel */}
      <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-8">
        <div className="text-center">
          <Store className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-900">Add Another Channel</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Connect additional marketplaces and sales channels
          </p>
          <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition-colors text-sm">
            Browse Available Channels
          </button>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <ExternalLink className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Channel Compliance Guide</h3>
            <p className="text-sm text-slate-600 mt-1">
              Learn more about the requirements and best practices for each sales channel.
              Our compliance checks help ensure your products meet marketplace standards.
            </p>
            <div className="flex gap-4 mt-3">
              <a
                href="https://help.shopify.com/en/manual/products/details"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Shopify Product Requirements
              </a>
              <a
                href="https://support.google.com/merchants/answer/7052112"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Google Merchant Center Guidelines
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
