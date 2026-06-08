"use client";
import { useState, useRef } from "react";
import {
  Download,
  Upload,
  FileText,
  FileSpreadsheet,
  X,
  AlertCircle,
  CheckCircle,
  Printer,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { apiGet, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string; data: any }>;
  // Non-admin fields
  stockRequests?: number;
  stockRequestsFailed?: number;
}

// ── Helper: trigger a file download from a fetch response ────────────────────
async function downloadBlob(url: string, filename: string, token: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const text = await response.text();
    let msg = `Export failed (${response.status})`;
    try { msg = JSON.parse(text).message || msg; } catch {}
    throw new Error(msg);
  }
  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(objectUrl);
  document.body.removeChild(a);
}

export function ImportExportModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";

  if (!isOpen) return null;

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") || "" : "";

  const handleExportCSV = async () => {
    try {
      setIsLoading(true);
      await downloadBlob(`${API_URL}/export/products/csv`, `products-${Date.now()}.csv`, token);
      toast("Products exported as CSV", "success");
    } catch (error) { toast(getApiError(error), "error"); }
    finally { setIsLoading(false); }
  };

  const handleExportPDF = async () => {
    try {
      setIsLoading(true);
      await downloadBlob(`${API_URL}/export/products/pdf`, `products-${Date.now()}.pdf`, token);
      toast("Products exported as PDF", "success");
    } catch (error: any) {
      const msg: string = error?.message || "";
      if (msg.includes("500") || msg.includes("failed")) {
        toast("Generating print-friendly PDF…", "default");
        await handlePrintFallback();
      } else {
        toast(getApiError(error), "error");
      }
    } finally { setIsLoading(false); }
  };

  const handlePrintFallback = async () => {
    try {
      const res = await apiGet<any>("/products?status=ACTIVE&limit=500");
      const products = res.data.products || [];
      const html = `
        <html><head><title>Product Report</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          p.sub { color: #666; margin-bottom: 16px; font-size: 10px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; }
          td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; }
          tr:nth-child(even) td { background: #fafafa; }
          @media print { body { margin: 10px; } }
        </style>
        </head><body>
        <h1>Product Inventory Report</h1>
        <p class="sub">Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Total: ${products.length} products</p>
        <table>
          <tr><th>Product</th><th>SKU</th><th>Price</th><th>Stock</th><th>Status</th><th>Category</th></tr>
          ${products.map((p: any) => `
            <tr>
              <td>${p.name.substring(0, 50)}</td>
              <td style="font-family:monospace">${p.sku}</td>
              <td>₦${Number(p.price).toLocaleString()}</td>
              <td>${p.stockQuantity}</td>
              <td>${p.status}</td>
              <td>${p.category?.name || "—"}</td>
            </tr>
          `).join("")}
        </table>
        <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script>
        </body></html>
      `;
      const win = window.open("", "_blank", "width=900,height=700");
      if (win) { win.document.write(html); win.document.close(); }
      else toast("Allow popups to print PDF", "error");
    } catch (err) { toast(getApiError(err), "error"); }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadBlob(`${API_URL}/export/products/template`, "product-import-template.csv", token);
      toast("Template downloaded", "success");
    } catch (error) { toast(getApiError(error), "error"); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_URL}/export/products/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Import failed");
      setImportResult(data.data);

      // Toast message depends on role
      if (!isAdmin && (data.data.stockRequests ?? 0) > 0) {
        toast(
          `${data.data.stockRequests} stock change(s) submitted for admin approval`,
          "success",
        );
        if (data.data.success > 0) onSuccess();
      } else if (data.data.success > 0) {
        toast(`${data.data.success} products imported`, "success");
        onSuccess();
      }
    } catch (error) { toast(getApiError(error), "error"); }
    finally { setIsLoading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Import / Export Products</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="flex border-b border-gray-100">
          {(["export", "import"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors capitalize ${activeTab === tab ? "border-b-2 border-green-600 text-green-700" : "text-gray-500 hover:text-gray-700"}`}
            >{tab}</button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {activeTab === "export" && (
            <>
              <p className="text-xs text-gray-500">Download your product catalogue in your preferred format.</p>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={handleExportCSV} disabled={isLoading}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-8 h-8 text-green-600 shrink-0" />
                  <div className="text-left">
                    <p className="font-semibold text-sm text-gray-900">Export as CSV</p>
                    <p className="text-xs text-gray-500">Full product data for re-import or editing</p>
                  </div>
                  <Download className="w-4 h-4 text-gray-400 ml-auto" />
                </button>
                <button onClick={handleExportPDF} disabled={isLoading}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-red-400 hover:bg-red-50 transition-all disabled:opacity-50"
                >
                  <FileText className="w-8 h-8 text-red-500 shrink-0" />
                  <div className="text-left">
                    <p className="font-semibold text-sm text-gray-900">Export as PDF</p>
                    <p className="text-xs text-gray-500">Printable inventory report</p>
                  </div>
                  <Printer className="w-4 h-4 text-gray-400 ml-auto" />
                </button>
              </div>
              {isLoading && <p className="text-xs text-center text-gray-500 animate-pulse">Generating export…</p>}
            </>
          )}

          {activeTab === "import" && (
            <>
              {/* Role-specific notice */}
              {!isAdmin ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-xs text-amber-800">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  <div className="space-y-1">
                    <p className="font-semibold">Approval required for stock changes</p>
                    <p>
                      Any <strong>stockQuantity</strong> values in your CSV will be submitted
                      as pending requests for admin approval — they will not update immediately.
                      Other product fields (price, name, etc.) will update normally.
                    </p>
                    <p className="text-amber-600">
                      You cannot create new products via CSV — only update existing ones by SKU.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2 text-xs text-blue-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Use the CSV template to ensure correct formatting. Existing products with matching SKUs will be updated.</span>
                </div>
              )}

              <button
                onClick={handleDownloadTemplate}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-green-400 hover:text-green-700"
              >
                <Download className="w-4 h-4" /> Download CSV Template
              </button>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Upload CSV File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleImport}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 file:font-medium file:text-xs hover:file:bg-green-100"
                />
              </div>

              {isLoading && (
                <p className="text-xs text-center text-gray-500 animate-pulse">
                  {isAdmin ? "Importing products…" : "Processing CSV…"}
                </p>
              )}

              {/* Result display */}
              {importResult && (
                <div className="space-y-2">
                  {/* Non-admin: stock requests block */}
                  {!isAdmin && (importResult.stockRequests ?? 0) > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                      <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                      <div>
                        <p className="font-semibold">
                          {importResult.stockRequests} stock change{importResult.stockRequests !== 1 ? "s" : ""} pending approval
                        </p>
                        <p className="text-xs mt-0.5 text-amber-600">
                          An admin will review and approve these in the Stock Approvals section.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Other fields updated */}
                  {importResult.success > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>
                        {isAdmin
                          ? `${importResult.success} product(s) imported successfully`
                          : `${importResult.success} product(s) updated (non-stock fields)`}
                      </span>
                    </div>
                  )}

                  {/* Errors */}
                  {(importResult.failed > 0 || (importResult.stockRequestsFailed ?? 0) > 0) && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-red-700 mb-2">
                        {(importResult.failed + (importResult.stockRequestsFailed ?? 0))} row(s) had errors:
                      </p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {importResult.errors.slice(0, 10).map((e, i) => (
                          <p key={i} className="text-xs text-red-600">Row {e.row}: {e.error}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
