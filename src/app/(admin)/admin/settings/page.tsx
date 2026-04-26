'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';
import { SiteSettings } from '@/types';
import { apiGet, apiPut, getApiError } from '@/lib/api';
import { useToast } from '@/store/uiStore';
import { PageLoader } from '@/components/shared/loading-spinner';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Partial<SiteSettings>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    apiGet<any>('/settings').then((res) => setSettings(res.data.settings)).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await apiPut('/settings', settings); toast('Settings saved', 'success'); }
    catch (err) { toast(getApiError(err), 'error'); }
    finally { setSaving(false); }
  };

  const s = (k: string, v: any) => setSettings((p) => ({ ...p, [k]: v }));
  const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-colors';

  if (isLoading) return <PageLoader />;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">General Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Store Information</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { k: 'siteName', l: 'Store Name *', t: 'text' },
              { k: 'currency', l: 'Currency Code', t: 'text' },
              { k: 'currencySymbol', l: 'Currency Symbol', t: 'text' },
              { k: 'taxRate', l: 'Tax Rate (%)', t: 'number' },
            ].map(({ k, l, t }) => (
              <div key={k}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{l}</label>
                <input type={t} value={(settings as any)[k] || ''} onChange={(e) => s(k, t === 'number' ? Number(e.target.value) : e.target.value)} className={inputCls} />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Site Description</label>
              <textarea value={settings.siteDescription || ''} onChange={(e) => s('siteDescription', e.target.value)} rows={3}
                className={inputCls + ' resize-none'} />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Contact Information</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { k: 'email', l: 'Email', t: 'email' },
              { k: 'phone', l: 'Phone', t: 'tel' },
              { k: 'whatsapp', l: 'WhatsApp', t: 'tel' },
            ].map(({ k, l, t }) => (
              <div key={k}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{l}</label>
                <input type={t} value={(settings as any)[k] || ''} onChange={(e) => s(k, e.target.value)} className={inputCls} />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
              <input type="text" value={settings.address || ''} onChange={(e) => s('address', e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Social */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Social Media</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { k: 'facebook', l: 'Facebook URL' },
              { k: 'instagram', l: 'Instagram URL' },
              { k: 'twitter', l: 'Twitter/X URL' },
              { k: 'linkedin', l: 'LinkedIn URL' },
            ].map(({ k, l }) => (
              <div key={k}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{l}</label>
                <input type="url" value={(settings as any)[k] || ''} onChange={(e) => s(k, e.target.value)} placeholder="https://"className={inputCls} />
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
      </form>
    </div>
  );
}
