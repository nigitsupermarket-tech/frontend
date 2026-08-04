'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Users, Upload, FileSpreadsheet, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { apiGet, apiPost, apiUpload, getApiError } from '@/lib/api';
import { useToast } from '@/store/uiStore';

type ParsedRecipient = { name: string; email: string };

type UploadPreview = {
  recipients: ParsedRecipient[];
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  skippedCount: number;
  skipped: { row: number; reason: string }[];
};

export default function AdminMarketingEmailsPage() {
  const [form, setForm] = useState({ subject: '', body: '', targetSegment: 'ALL', scheduledFor: '' });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);

  // Recipient source: pick a customer audience segment, or upload a spreadsheet instead.
  const [recipientSource, setRecipientSource] = useState<'SEGMENT' | 'UPLOAD'>('SEGMENT');
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<UploadPreview | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toast = useToast();

  useEffect(() => {
    apiGet<any>('/marketing/email-campaigns').then((r) => setCampaigns(r.data.campaigns || [])).catch(() => {});
    apiGet<any>('/marketing/recipients/count', { segment: form.targetSegment }).then((r) => setRecipientCount(r.data.count)).catch(() => {});
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
      const r = await apiUpload<any>('/marketing/recipients/upload', fd);
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
      const payload: any = { subject: form.subject, body: form.body, scheduledFor: form.scheduledFor || undefined };
      if (recipientSource === 'UPLOAD') {
        payload.customRecipients = uploadPreview!.recipients;
      } else {
        payload.targetSegment = form.targetSegment;
      }

      await apiPost('/marketing/email-campaigns', payload);
      toast(form.scheduledFor ? 'Campaign scheduled!' : 'Campaign sent!', 'success');
      setForm({ subject: '', body: '', targetSegment: 'ALL', scheduledFor: '' });
      clearUpload();
      const r = await apiGet<any>('/marketing/email-campaigns'); setCampaigns(r.data.campaigns || []);
    } catch (err) { toast(getApiError(err), 'error'); }
    finally { setSending(false); }
  };

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 transition-colors';
  const activeRecipientCount = recipientSource === 'UPLOAD' ? (uploadPreview?.validCount ?? 0) : recipientCount;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Email Marketing</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Compose */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-5">New Email Campaign</h2>
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
                    <option value="ALL">All Customers</option>
                    <option value="NEW">New Customers</option>
                    <option value="REGULAR">Regular Customers</option>
                    <option value="VIP">VIP Customers</option>
                    <option value="WHOLESALE">Wholesale Customers</option>
                  </select>
                  {recipientCount !== null && (
                    <p className="mt-1 text-xs text-gray-500 flex items-center gap-1"><Users className="w-3 h-3" />{recipientCount} recipients</p>
                  )}
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
                          <span className="text-xs text-gray-400">Needs a "Name" and "Email" column — any order, any case</span>
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
                          <span>{uploadPreview.skippedCount} row{uploadPreview.skippedCount !== 1 ? 's' : ''} skipped (missing/invalid/duplicate email)</span>
                        </div>
                      )}
                      {uploadPreview.recipients.length > 0 && (
                        <div className="max-h-28 overflow-y-auto text-xs text-gray-500 space-y-0.5 border-t border-gray-100 pt-2">
                          {uploadPreview.recipients.slice(0, 5).map((r, i) => (
                            <div key={i} className="truncate">{r.name} · {r.email}</div>
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
            <button type="submit" disabled={sending || uploading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {form.scheduledFor ? 'Schedule Campaign' : 'Send Now'}
              {activeRecipientCount !== null && !sending && ` · ${activeRecipientCount} recipient${activeRecipientCount !== 1 ? 's' : ''}`}
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
                    <span>{c.segment === 'CUSTOM_LIST' ? 'Uploaded list' : c.segment}</span>
                    {c.sentCount ? <span>· {c.sentCount} sent</span> : null}
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
