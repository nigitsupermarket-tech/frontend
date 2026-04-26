'use client';

import { useState, useEffect } from 'react';
import { Send, Loader2, Users } from 'lucide-react';
import { apiGet, apiPost, getApiError } from '@/lib/api';
import { useToast } from '@/store/uiStore';

export default function AdminMarketingEmailsPage() {
  const [form, setForm] = useState({ subject: '', body: '', targetSegment: 'ALL', scheduledFor: '' });
  const [templates, setTemplates] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const toast = useToast();

  useEffect(() => {
    apiGet<any>('/marketing/email-campaigns').then((r) => setCampaigns(r.data.campaigns || [])).catch(() => {});
    apiGet<any>('/marketing/recipients/count', { segment: form.targetSegment }).then((r) => setRecipientCount(r.data.count)).catch(() => {});
  }, []);

  const updateCount = async (segment: string) => {
    try { const r = await apiGet<any>('/marketing/recipients/count', { segment }); setRecipientCount(r.data.count); } catch {}
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault(); setSending(true);
    try {
      await apiPost('/marketing/email-campaigns', { ...form, scheduledFor: form.scheduledFor || undefined });
      toast(form.scheduledFor ? 'Campaign scheduled!' : 'Campaign sent!', 'success');
      setForm({ subject: '', body: '', targetSegment: 'ALL', scheduledFor: '' });
      const r = await apiGet<any>('/marketing/email-campaigns'); setCampaigns(r.data.campaigns || []);
    } catch (err) { toast(getApiError(err), 'error'); }
    finally { setSending(false); }
  };

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 transition-colors';

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Email Marketing</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Compose */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-5">New Email Campaign</h2>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Audience</label>
              <select value={form.targetSegment} onChange={(e) => { setForm({ ...form, targetSegment: e.target.value }); updateCount(e.target.value); }}
                className={inputCls + ' bg-white'}>
                <option value="ALL">All Customers</option>
                <option value="NEW">New Customers</option>
                <option value="REGULAR">Regular Customers</option>
                <option value="VIP">VIP Customers</option>
                <option value="WHOLESALE">Wholesale Customers</option>
              </select>
              {recipientCount !== null && (
                <p className="mt-1 text-xs text-gray-500 flex items-center gap-1"><Users className="w-3 h-3" />{recipientCount} recipients</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject *</label>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required className={inputCls} placeholder="Your email subject line…" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Message Body *</label>
              <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required rows={8}
                className={inputCls + ' resize-none'} placeholder="Write your email content here (HTML supported)…" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Schedule (optional)</label>
              <input type="datetime-local" value={form.scheduledFor} onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })} className={inputCls} />
              <p className="mt-1 text-xs text-gray-400">Leave blank to send immediately</p>
            </div>
            <button type="submit" disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {form.scheduledFor ? 'Schedule Campaign' : 'Send Now'}
            </button>
          </form>
        </div>

        {/* Campaign history */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-5">Campaign History</h2>
          {campaigns.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No campaigns yet</p>
          ) : (
            <div className="space-y-3">
              {campaigns.slice(0, 10).map((c) => (
                <div key={c.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-gray-900 text-sm line-clamp-1">{c.subject}</p>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'SENT' ? 'bg-green-100 text-green-700' : c.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span>{c.targetSegment}</span>
                    {c.sentCount && <span>· {c.sentCount} sent</span>}
                    {c.openRate && <span>· {(c.openRate * 100).toFixed(1)}% open</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
