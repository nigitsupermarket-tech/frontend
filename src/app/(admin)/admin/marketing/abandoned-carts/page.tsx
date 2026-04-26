'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Send, Loader2 } from 'lucide-react';
import { apiGet, apiPost, getApiError } from '@/lib/api';
import { useToast } from '@/store/uiStore';
import { formatPrice, formatDateTime, timeAgo } from '@/lib/utils';
import { TableRowSkeleton, EmptyState } from '@/components/shared/loading-spinner';

export default function AdminAbandonedCartsPage() {
  const [carts, setCarts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [config, setConfig] = useState({ delayHours: 2, enabled: true });
  const toast = useToast();

  useEffect(() => {
    apiGet<any>('/marketing/abandoned-carts').then((r) => setCarts(r.data.carts || [])).catch(() => {}).finally(() => setIsLoading(false));
    apiGet<any>('/marketing/abandoned-cart-config').then((r) => setConfig(r.data.config || config)).catch(() => {});
  }, []);

  const sendRecovery = async (cartId: string) => {
    setSending(cartId);
    try { await apiPost(`/marketing/abandoned-carts/${cartId}/recover`, {}); toast('Recovery email sent!', 'success'); }
    catch (err) { toast(getApiError(err), 'error'); }
    finally { setSending(null); }
  };

  const saveConfig = async () => {
    try { await apiPost('/marketing/abandoned-cart-config', config); toast('Settings saved', 'success'); }
    catch (err) { toast(getApiError(err), 'error'); }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Abandoned Cart Recovery</h1>

      {/* Config */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Recovery Settings</h2>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.enabled} onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} className="rounded border-gray-300 text-brand-600" />
            <span className="text-sm font-medium text-gray-700">Auto-send recovery emails</span>
          </label>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Send after</label>
            <input type="number" min={1} max={72} value={config.delayHours} onChange={(e) => setConfig({ ...config, delayHours: Number(e.target.value) })}
              className="w-16 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-center focus:outline-none focus:border-brand-500" />
            <label className="text-sm text-gray-700">hours of inactivity</label>
          </div>
          <button onClick={saveConfig} className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors">Save</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Abandoned Carts', value: carts.length },
          { label: 'Recovery Emails Sent', value: carts.filter((c) => c.recoverySentAt).length },
          { label: 'Recovered Value', value: formatPrice(carts.filter((c) => c.recovered).reduce((s, c) => s + (c.total || 0), 0)) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              {['Customer', 'Items', 'Value', 'Abandoned', 'Email Sent', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />) :
             carts.length === 0 ? <tr><td colSpan={6}><EmptyState icon={<ShoppingCart className="w-12 h-12" />} title="No abandoned carts" description="Great! All customers are completing their purchases." /></td></tr> :
             carts.map((c) => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{c.user?.name || 'Guest'}</p>
                  <p className="text-xs text-gray-400">{c.user?.email || '—'}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.items?.length || 0}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{formatPrice(c.total || 0)}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{timeAgo(c.updatedAt)}</td>
                <td className="px-4 py-3">
                  {c.recoverySentAt ? <span className="text-green-600 text-xs">✓ {timeAgo(c.recoverySentAt)}</span> : <span className="text-gray-400 text-xs">Not sent</span>}
                </td>
                <td className="px-4 py-3">
                  {!c.recoverySentAt && !c.recovered && c.user?.email && (
                    <button onClick={() => sendRecovery(c.id)} disabled={sending === c.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-brand-50 text-brand-600 text-xs font-medium rounded-lg hover:bg-brand-100 disabled:opacity-50 transition-colors">
                      {sending === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Send
                    </button>
                  )}
                  {c.recovered && <span className="px-2 py-1 bg-green-50 text-green-600 text-xs font-medium rounded-lg">Recovered</span>}
                </td>
              </tr>
             ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
