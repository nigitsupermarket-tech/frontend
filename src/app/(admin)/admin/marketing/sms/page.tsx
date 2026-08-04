'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Users, Upload, FileSpreadsheet, X, AlertTriangle, CheckCircle2, ShieldAlert, Settings } from 'lucide-react';
import Link from 'next/link';
import { apiGet, apiPost, apiUpload, getApiError } from '@/lib/api';
import { useToast } from '@/store/uiStore';

type ParsedPhoneRecipient = { name: string; phone: string };

type UploadPreview = {
  recipients: ParsedPhoneRecipient[];
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  skippedCount: number;
  skipped: { row: number; reason: string }[];
};

type ProviderStatus = { provider: string; configured: boolean; reason?: string };

export default function AdminMarketingSmsPage() {
  const [form, setForm] = useState({ message: '', targetSegment: 'ALL', scheduledFor: '' });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const maxChars = 160;

  // Recipient source tab: audience segment vs. an uploaded spreadsheet (Name + Phone columns).
  const [recipientSource, setRecipientSource] = useState<'SEGMENT' | 'UPLOAD'>('SEGMENT');
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<UploadPreview | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Whether Termii (or whichever provider is selected) is actually configured —
  // checked up front so the "not implemented" state is visible before sending.
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [checkingProvider, setCheckingProvider] = useState(true);

  const toast = useToast();

  useEffect(() => {
    apiGet<any>('/marketing/sms-campaigns').then((r) => setCampaigns(r.data.campaigns || [])).catch(() => {});
    apiGet<any>('/marketing/recipients/count', { segment: 'ALL' }).then((r) => setRecipientCount(r.data.count)).catch(() => {});
    apiGet<any>('/marketing/sms-provider-status')
      .then((r) => setProviderStatus(r.data))
      .catch(() => setProviderStatus({ provider: 'TERMII', configured: false, reason: 'Could not check SMS provider status.' }))
      .finally(() => setCheckingProvider(false));
  }, []);

  const updateCount = async (segment: string) => {
    try { const r = await apiGet<any>('/marketing/recipients/count', { segment }); setRecipientCount(r.data.count); } catch {}
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const okExt = /\.(csv|xlsx|xls)$/i.test(file.name);
    if (!okExt) {
      toast('Please upload a CSV, XLS, or XLSX file.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    setUploadedFileName(file.name);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await apiUpload<any>('/marketing/recipients/upload-phone', fd);
      setUploadPreview(r.data);
      toast(`Found ${r.data.validCount} valid recipient${r.data.validCount !== 1 ? 's' : ''} in ${file.name}`, 'success');
    } catch (err) {
      toast(getApiError(err), 'error');
      setUploadPreview(null);
      setUploadedFileName('');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearUpload = () => {
    setUploadPreview(null);
    setUploadedFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const switchSource = (source: 'SEGMENT' | 'UPLOAD') => {
    setRecipientSource(source);
    if (source === 'SEGMENT') clearUpload();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (recipientSource === 'UPLOAD' && (!uploadPreview || uploadPreview.validCount === 0)) {
      toast('Upload a spreadsheet with valid recipients first.', 'error');
      return;
    }

    setSending(true);
    try {
      const payload: any = { message: form.message, scheduledFor: form.scheduledFor || undefined };
      if (recipientSource === 'UPLOAD') {
        payload.customRecipients = uploadPreview!.recipients;
      } else {
        payload.targetSegment = form.targetSegment;
      }

      await apiPost('/marketing/sms-campaigns', payload);
      toast(form.scheduledFor ? 'SMS campaign scheduled!' : 'SMS campaign sent!', 'success');
      setForm({ message: '', targetSegment: 'ALL', scheduledFor: '' });
      clearUpload();
      const r = await apiGet<any>('/marketing/sms-campaigns'); setCampaigns(r.data.campaigns || []);
    } catch (err) { toast(getApiError(err), 'error'); }
    finally { setSending(false); }
  };

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 transition-colors';
  const activeRecipientCount = recipientSource === 'UPLOAD' ? (uploadPreview?.validCount ?? 0) : recipientCount;
  const blockedByProvider = !checkingProvider && providerStatus && !providerStatus.configured && !form.scheduledFor;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">SMS Marketing</h1>

      {!checkingProvider && providerStatus && !providerStatus.configured && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">SMS sending isn't set up yet ({providerStatus.provider})</p>
            <p className="text-sm text-amber-700 mt-0.5">{providerStatus.reason}</p>
          </div>
          <Link href="/admin/settings/sms" className="shrink-0 flex items-center gap-1.5 text-sm font-medium text-amber-800 hover:text-amber-900 whitespace-nowrap">
            <Settings className="w-4 h-4" /> Go to Settings
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-5">New SMS Campaign</h2>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Recipients</label>
              <div className="flex gap-2 mb-3">
                <button type="button" onClick={() => switchSource('SEGMENT')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${recipientSource === 'SEGMENT' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                  Audience Segment
                </button>
                <button type="button" onClick={() => switchSource('UPLOAD')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${recipientSource === 'UPLOAD' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                  Upload Spreadsheet
                </button>
              </div>

              {recipientSource === 'SEGMENT' ? (
                <>
                  <select value={form.targetSegment} onChange={(e) => { setForm({ ...form, targetSegment: e.target.value }); updateCount(e.target.value); }}
                    className={inputCls + ' bg-white'}>
                    {['ALL', 'NEW', 'REGULAR', 'VIP', 'WHOLESALE'].map((s) => <option key={s} value={s}>{s} Customers</option>)}
                  </select>
                  {recipientCount !== null && <p className="mt-1 text-xs text-gray-500 flex items-center gap-1"><Users className="w-3 h-3" />{recipientCount} recipients with a phone number</p>}
                </>
              ) : (
                <div>
                  {!uploadPreview ? (
                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-8 cursor-pointer hover:border-brand-400 transition-colors">
                      <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        onChange={handleFileSelect} className="hidden" disabled={uploading} />
                      {uploading ? (
                        <>
                          <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
                          <span className="text-sm text-gray-500">Reading {uploadedFileName}…</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-gray-400" />
                          <span className="text-sm text-gray-600 font-medium">Click to upload CSV, XLS, or XLSX</span>
                          <span className="text-xs text-gray-400">Needs a "Name" and "Phone" column — any order, any case</span>
                        </>
                      )}
                    </label>
                  ) : (
                    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileSpreadsheet className="w-4 h-4 text-brand-600 shrink-0" />
                          <span className="text-sm font-medium text-gray-900 truncate">{uploadedFileName}</span>
                        </div>
                        <button type="button" onClick={clearUpload} className="text-gray-400 hover:text-gray-600 shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-green-700">
                        <CheckCircle2 className="w-4 h-4" />
                        {uploadPreview.validCount} valid recipient{uploadPreview.validCount !== 1 ? 's' : ''}
                      </div>
                      {uploadPreview.skippedCount > 0 && (
                        <div className="flex items-start gap-1.5 text-xs text-amber-600">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{uploadPreview.skippedCount} row{uploadPreview.skippedCount !== 1 ? 's' : ''} skipped (missing/invalid/duplicate phone)</span>
                        </div>
                      )}
                      {uploadPreview.recipients.length > 0 && (
                        <div className="max-h-28 overflow-y-auto text-xs text-gray-500 space-y-0.5 border-t border-gray-100 pt-2">
                          {uploadPreview.recipients.slice(0, 5).map((r, i) => (
                            <div key={i} className="truncate">{r.name} · {r.phone}</div>
                          ))}
                          {uploadPreview.recipients.length > 5 && (
                            <div className="text-gray-400">+ {uploadPreview.recipients.length - 5} more</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
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
              {blockedByProvider && <p className="mt-1 text-xs text-amber-600">Sending now is blocked until {providerStatus?.provider} is configured — you can still schedule for later.</p>}
            </div>
            <button type="submit" disabled={sending || uploading || !!blockedByProvider}
              title={blockedByProvider ? `${providerStatus?.provider} isn't configured yet` : undefined}
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {form.scheduledFor ? 'Schedule' : 'Send Now'}
              {activeRecipientCount !== null && !sending && ` · ${activeRecipientCount} recipient${activeRecipientCount !== 1 ? 's' : ''}`}
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
                    <p className="text-sm text-gray-900 line-clamp-2 flex-1">{c.content || c.message}</p>
                    <span className={`ml-2 shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'SENT' ? 'bg-green-100 text-green-700' : c.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' : c.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span>{c.segment === 'CUSTOM_LIST' ? 'Uploaded list' : c.segment}</span>
                    {c.sentCount ? <span>· {c.sentCount} sent</span> : null}
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
