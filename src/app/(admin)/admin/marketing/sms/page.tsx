'use client';

import { useState, useEffect } from 'react';
import { Send, Loader2, Users } from 'lucide-react';
import { apiGet, apiPost, getApiError } from '@/lib/api';
import { useToast } from '@/store/uiStore';

export default function AdminMarketingSmsPage() {
  const [form, setForm] = useState({ message: '', targetSegment: 'ALL', scheduledFor: '' });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const toast = useToast();
  const maxChars = 160;

  useEffect(() => {
    apiGet<any>('/marketing/sms-campaigns').then((r) => setCampaigns(r.data.campaigns || [])).catch(() => {});
    apiGet<any>('/marketing/recipients/count', { segment: 'ALL' }).then((r) => setRecipientCount(r.data.count)).catch(() => {});
  }, []);

  const updateCount = async (segment: string) => {
    try { const r = await apiGet<any>('/marketing/recipients/count', { segment }); setRecipientCount(r.data.count); } catch {}
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault(); setSending(true);
    try {
      await apiPost('/marketing/sms-campaigns', { ...form, scheduledFor: form.scheduledFor || undefined });
      toast(form.scheduledFor ? 'SMS campaign scheduled!' : 'SMS campaign sent!', 'success');
      setForm({ message: '', targetSegment: 'ALL', scheduledFor: '' });
      const r = await apiGet<any>('/marketing/sms-campaigns'); setCampaigns(r.data.campaigns || []);
    } catch (err) { toast(getApiError(err), 'error'); }
    finally { setSending(false); }
  };

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 transition-colors';

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">SMS Marketing</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-5">New SMS Campaign</h2>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Audience</label>
              <select value={form.targetSegment} onChange={(e) => { setForm({ ...form, targetSegment: e.target.value }); updateCount(e.target.value); }}
                className={inputCls + ' bg-white'}>
                {['ALL', 'NEW', 'REGULAR', 'VIP', 'WHOLESALE'].map((s) => <option key={s} value={s}>{s} Customers</option>)}
              </select>
              {recipientCount !== null && <p className="mt-1 text-xs text-gray-500 flex items-center gap-1"><Users className="w-3 h-3" />{recipientCount} recipients</p>}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Message *</label>
                <span className={`text-xs font-mono ${form.message.length > maxChars ? 'text-red-500' : 'text-gray-400'}`}>{form.message.length}/{maxChars}</span>
              </div>
              <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required rows={4}
                maxLength={maxChars} className={inputCls + ' resize-none'} placeholder="Your SMS message (max 160 chars)…" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Schedule (optional)</label>
              <input type="datetime-local" value={form.scheduledFor} onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })} className={inputCls} />
            </div>
            <button type="submit" disabled={sending || form.message.length > maxChars}
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {form.scheduledFor ? 'Schedule' : 'Send Now'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-5">Campaign History</h2>
          {campaigns.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No campaigns yet</p> : (
            <div className="space-y-3">
              {campaigns.slice(0, 10).map((c) => (
                <div key={c.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-gray-900 line-clamp-2 flex-1">{c.message}</p>
                    <span className={`ml-2 shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'SENT' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{c.status}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span>{c.targetSegment}</span>
                    {c.sentCount && <span>· {c.sentCount} sent</span>}
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
