"use client";
import { useState, useRef, useEffect } from "react";
import {
  Download,
  FileText,
  FileSpreadsheet,
  X,
  AlertCircle,
  CheckCircle,
  Printer,
  Clock,
  ShieldAlert,
  Loader2,
  AlertTriangle,
  FileWarning,
  Scale,
  SkipForward,
  History,
  Undo2,
  Info,
  Users,
} from "lucide-react";
import { apiGet, apiPost, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";

// Same unit vocabulary as the "Add Product" form's Scale/Weight tab
// (SCALE_UNITS in product-form.tsx) — kept as a short, focused list here
// since CECON scale sheets are weight-based in practice, plus a "custom"
// escape hatch for anything else.
const SCALE_UNIT_OPTIONS = [
  { value: "kg", label: "kg (kilogram)" },
  { value: "g", label: "g (gram)" },
  { value: "lb", label: "lb (pound)" },
  { value: "L", label: "L (litre)" },
  { value: "custom", label: "Custom…" },
];

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string; data: any }>;
  stockRequests?: number;
  stockRequestsFailed?: number;
  // Only present for the CECON scale-sheet import — rows whose Scale Ware
  // Code already belongs to an existing product, left untouched.
  skipped?: number;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface ImportBatch {
  id: string;
  type: "CSV" | "SCALE_GOODS";
  fileName: string | null;
  performedByName: string;
  performedByRole: string;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  stockRequestCount: number;
  status: "COMPLETED" | "UNDONE";
  undoneAt: string | null;
  undoneByName: string | null;
  createdAt: string;
  undoable: boolean;
  undoBlockedReason: string | null;
}

interface ImportProgress {
  stage:
    | "reading"
    | "validating"
    | "uploading"
    | "processing"
    | "done"
    | "error";
  percent: number;
  message: string;
}

// ── Validate CSV client-side before uploading ────────────────────────────────
function validateCSV(content: string): {
  valid: boolean;
  errors: string[];
  rowCount: number;
} {
  const lines = content.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return {
      valid: false,
      errors: ["CSV file is empty or has no data rows."],
      rowCount: 0,
    };
  }

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, ""));
  const errors: string[] = [];

  // Required headers
  const required = ["sku"];
  required.forEach((col) => {
    if (!headers.includes(col)) {
      errors.push(
        `Missing required column: "${col}". Make sure you're using the correct template.`,
      );
    }
  });

  // Warn about known template columns missing (non-blocking)
  const expectedCols = ["name", "price", "stockQuantity", "categoryId"];
  const missing = expectedCols.filter((c) => !headers.includes(c));
  if (missing.length > 0 && errors.length === 0) {
    errors.push(
      `Warning: Some expected columns are missing (${missing.join(", ")}). Only present columns will be updated.`,
    );
  }

  const rowCount = lines.length - 1;

  // Check a few rows for obviously bad data
  for (let i = 1; i <= Math.min(5, lines.length - 1); i++) {
    const cols = lines[i].split(",");
    if (cols.length < headers.length - 3) {
      errors.push(
        `Row ${i + 1}: Fewer columns than expected. Check for missing commas or malformed data.`,
      );
    }
  }

  return {
    valid: errors.length === 0 || errors[0].startsWith("Warning"),
    errors,
    rowCount,
  };
}

// ── Trigger file download from fetch response ────────────────────────────────
async function downloadBlob(url: string, filename: string, token: string) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const text = await response.text();
    let msg = `Export failed (${response.status})`;
    try {
      msg = JSON.parse(text).message || msg;
    } catch {}
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

// ── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
          {label}
        </span>
        <span className="font-bold text-brand-700">{percent}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full bg-brand-600 transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
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
  const [isExporting, setIsExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [preValidation, setPreValidation] = useState<{
    errors: string[];
    rowCount: number;
  } | null>(null);
  const [showAllErrors, setShowAllErrors] = useState(false);

  // ── Import "type" — a standard product CSV, or a CECON scale PLU sheet
  // (SCALE_GOODS.xlsx and its like) that gets auto-converted into new
  // products. Scale-sheet import stays admin-only, mirroring the backend.
  const [importSource, setImportSource] = useState<"csv" | "scale">("csv");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [scaleCategoryId, setScaleCategoryId] = useState("");
  // Every row this importer creates is marked as a scalable/weighed
  // product (see backend importScaleGoodsSheet) — these fields control
  // what unit/step/order-limits/presets it's scalable BY, same fields the
  // "Add Product" form's Scale/Weight tab exposes. All optional except
  // unit and step, which the backend always needs some value for.
  const [scaleUnit, setScaleUnit] = useState("kg");
  const [scaleUnitCustom, setScaleUnitCustom] = useState("");
  // Default matches the CECON scale's own precision (down to the gram) —
  // 0.1 was silently coarser than what most goods on a real sheet need.
  const [scaleStep, setScaleStep] = useState("0.001");
  const [scaleMinOrderQty, setScaleMinOrderQty] = useState("");
  const [scaleMaxOrderQty, setScaleMaxOrderQty] = useState("");
  const [scalePresets, setScalePresets] = useState("");

  // ── Recent imports + undo ───────────────────────────────────────────────
  const [importBatches, setImportBatches] = useState<ImportBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [undoingBatchId, setUndoingBatchId] = useState<string | null>(null);
  const [confirmUndoId, setConfirmUndoId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scaleFileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  // Roles that can create brand-new products via CSV import — mirrors the
  // backend's `canCreate` check in importProductsCSV. Everyone else
  // (e.g. SALES) can still import a CSV, but only to update existing
  // products; new rows are rejected server-side.
  const canCreateProducts =
    isAdmin || user?.role === "MANAGER" || user?.role === "STAFF";

  const loadImportBatches = () => {
    setLoadingBatches(true);
    apiGet<any>("/export/products/import-batches")
      .then((res) => setImportBatches(res.data.batches || []))
      .catch(() => {})
      .finally(() => setLoadingBatches(false));
  };

  useEffect(() => {
    if (!isOpen) return;
    apiGet<any>("/categories")
      .then((res) => setCategories(res.data.categories || []))
      .catch(() => {});
    loadImportBatches();
  }, [isOpen]);

  const handleUndoBatch = async (batchId: string) => {
    setUndoingBatchId(batchId);
    try {
      const res = await apiPost<any>(
        `/export/products/import-batches/${batchId}/undo`,
        {},
      );
      toast(res.message || "Import undone", "success");
      loadImportBatches();
      onSuccess(); // product list may have lost rows — refresh it
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setUndoingBatchId(null);
      setConfirmUndoId(null);
    }
  };

  if (!isOpen) return null;

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("accessToken") || ""
      : "";

  const isImporting =
    progress !== null &&
    progress.stage !== "done" &&
    progress.stage !== "error";

  // ── Exports ─────────────────────────────────────────────────────────────────
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await downloadBlob(
        `${API_URL}/export/products/csv`,
        `products-${Date.now()}.csv`,
        token,
      );
      toast("Products exported as CSV", "success");
    } catch (error) {
      toast(getApiError(error), "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await downloadBlob(
        `${API_URL}/export/products/pdf`,
        `products-${Date.now()}.pdf`,
        token,
      );
      toast("Products exported as PDF", "success");
    } catch (error: any) {
      const msg: string = error?.message || "";
      if (msg.includes("500") || msg.includes("failed")) {
        await handlePrintFallback();
      } else {
        toast(getApiError(error), "error");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintFallback = async () => {
    try {
      const res = await apiGet<any>("/products?limit=500");
      const products = res.data.products || [];
      const html = `<html><head><title>Product Report</title>
        <style>body{font-family:Arial,sans-serif;font-size:11px;margin:20px}h1{font-size:18px;margin-bottom:4px}table{width:100%;border-collapse:collapse}th{background:#f3f4f6;text-align:left;padding:6px 8px;font-size:10px;text-transform:uppercase}td{padding:5px 8px;border-bottom:1px solid #e5e7eb}@media print{body{margin:10px}}</style>
        </head><body>
        <h1>Product Inventory Report</h1>
        <p style="color:#666;font-size:10px">Generated: ${new Date().toLocaleString()} | Total: ${products.length}</p>
        <table><tr><th>Product</th><th>SKU</th><th>Barcode</th><th>Price</th><th>Stock</th><th>Status</th><th>Category</th></tr>
        ${products.map((p: any) => `<tr><td>${p.name.substring(0, 50)}</td><td style="font-family:monospace">${p.sku}</td><td style="font-family:monospace">${p.barcode || "—"}</td><td>₦${Number(p.price).toLocaleString()}</td><td>${p.stockQuantity}</td><td>${p.status}</td><td>${p.category?.name || "—"}</td></tr>`).join("")}
        </table><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script></body></html>`;
      const win = window.open("", "_blank", "width=900,height=700");
      if (win) {
        win.document.write(html);
        win.document.close();
      } else toast("Allow popups to generate PDF", "error");
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      // Pulled live from the backend's PRODUCT_CSV_COLUMNS (same source of
      // truth the CSV export uses) rather than a static file — so the
      // template can never silently drift out of sync with what export
      // actually produces or import actually expects.
      await downloadBlob(
        `${API_URL}/export/products/template`,
        "product-import-template.csv",
        token,
      );
      toast("Template downloaded", "success");
    } catch (error) {
      toast(getApiError(error), "error");
    }
  };

  // ── Import with progress ────────────────────────────────────────────────────
  // CSV keeps its exact original flow below (read as text, run the
  // client-side validateCSV pre-check, then upload) — nothing about that
  // path changed. Excel (.xlsx/.xls) is a binary format validateCSV can't
  // parse as text, so it skips straight to upload instead, the same way
  // the scale-sheet importer already does — the backend's parseImportFile
  // handles the real validation either way, and the results screen below
  // renders identically regardless of which format was actually uploaded.
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset state
    setImportResult(null);
    setPreValidation(null);
    setShowAllErrors(false);

    // ── Stage 1: Read file ──────────────────────────────────────────────────
    setProgress({ stage: "reading", percent: 10, message: "Reading file…" });

    const lowerName = file.name.toLowerCase();
    const isCsv = lowerName.endsWith(".csv");
    const isExcel = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");
    if (!isCsv && !isExcel) {
      toast(
        "Only .csv, .xlsx, or .xls files are supported. Please use the template provided.",
        "error",
      );
      setProgress({ stage: "error", percent: 0, message: "Invalid file type" });
      resetInput();
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast("File is too large. Maximum size is 20MB.", "error");
      setProgress({ stage: "error", percent: 0, message: "File too large" });
      resetInput();
      return;
    }

    if (isCsv) {
      let csvContent = "";
      try {
        csvContent = await file.text();
      } catch {
        toast("Could not read the file. Make sure it's a valid CSV.", "error");
        setProgress({ stage: "error", percent: 0, message: "File read failed" });
        resetInput();
        return;
      }

      // ── Stage 2: Validate client-side (CSV only) ───────────────────────────
      setProgress({
        stage: "validating",
        percent: 25,
        message: "Validating CSV structure…",
      });
      await new Promise((r) => setTimeout(r, 150)); // let UI update

      const validation = validateCSV(csvContent);
      setPreValidation({
        errors: validation.errors,
        rowCount: validation.rowCount,
      });

      if (!validation.valid) {
        toast(validation.errors[0], "error");
        setProgress({ stage: "error", percent: 0, message: "Validation failed" });
        resetInput();
        return;
      }

      if (validation.rowCount === 0) {
        toast("No data rows found in the CSV.", "error");
        setProgress({ stage: "error", percent: 0, message: "Empty file" });
        resetInput();
        return;
      }

      setProgress({
        stage: "uploading",
        percent: 40,
        message: `Uploading ${validation.rowCount} rows…`,
      });
    } else {
      // Excel — no row count to report yet, the server parses it.
      setProgress({ stage: "uploading", percent: 40, message: "Uploading…" });
    }
    await new Promise((r) => setTimeout(r, 100));

    // ── Stage 3: Upload ─────────────────────────────────────────────────────
    let response: Response;
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simulate progress during upload using XHR for real upload progress
      response = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_URL}/export/products/import`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const uploadPct = Math.round((event.loaded / event.total) * 25); // 40→65
            setProgress({
              stage: "uploading",
              percent: 40 + uploadPct,
              message: `Uploading… ${Math.round((event.loaded / event.total) * 100)}%`,
            });
          }
        };

        xhr.onload = () => {
          const res = new Response(xhr.responseText, {
            status: xhr.status,
            headers: { "Content-Type": "application/json" },
          });
          resolve(res);
        };
        xhr.onerror = () =>
          reject(
            new Error("Network error — check your connection and try again."),
          );
        xhr.ontimeout = () =>
          reject(new Error("Request timed out. The file may be too large."));
        xhr.timeout = 120_000; // 2 minutes
        xhr.send(formData);
      });
    } catch (err: any) {
      toast(err.message || "Upload failed. Check your connection.", "error");
      setProgress({ stage: "error", percent: 0, message: "Upload failed" });
      resetInput();
      return;
    }

    // ── Stage 4: Process response ───────────────────────────────────────────
    setProgress({
      stage: "processing",
      percent: 80,
      message: "Processing results…",
    });
    await new Promise((r) => setTimeout(r, 200));

    let data: any;
    try {
      data = await response.json();
    } catch {
      toast(
        "Server returned an unexpected response. Please try again.",
        "error",
      );
      setProgress({
        stage: "error",
        percent: 0,
        message: "Invalid server response",
      });
      resetInput();
      return;
    }

    if (!response.ok) {
      const errMsg =
        data?.message || data?.error || `Server error (${response.status})`;
      toast(errMsg, "error");
      setProgress({ stage: "error", percent: 0, message: errMsg });
      resetInput();
      return;
    }

    // ── Stage 5: Done ───────────────────────────────────────────────────────
    setProgress({ stage: "done", percent: 100, message: "Import complete" });
    const result: ImportResult = data.data;
    setImportResult(result);
    loadImportBatches();

    const hasErrors =
      result.failed > 0 || (result.stockRequestsFailed ?? 0) > 0;

    if (!isAdmin && (result.stockRequests ?? 0) > 0) {
      toast(
        `${result.stockRequests} stock change(s) submitted for admin approval`,
        "success",
      );
      if (result.success > 0) onSuccess();
    } else if (result.success > 0 && !hasErrors) {
      toast(`${result.success} product(s) imported successfully`, "success");
      onSuccess();
    } else if (result.success > 0 && hasErrors) {
      toast(
        `${result.success} imported, ${result.failed} failed — see details below`,
        "error",
      );
      onSuccess();
    } else if (result.failed > 0 && result.success === 0) {
      toast(
        `Import failed: all ${result.failed} rows had errors — see details below`,
        "error",
      );
    }

    resetInput();
  };

  const resetInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (scaleFileInputRef.current) scaleFileInputRef.current.value = "";
  };

  const resetImport = () => {
    setProgress(null);
    setImportResult(null);
    setPreValidation(null);
    setShowAllErrors(false);
    resetInput();
  };

  // ── Import: CECON scale sheet (.xlsx) ──────────────────────────────────────
  const handleScaleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportResult(null);
    setPreValidation(null);
    setShowAllErrors(false);

    setProgress({
      stage: "reading",
      percent: 10,
      message: "Reading spreadsheet…",
    });

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast(
        "Only .xlsx files are supported for the scale sheet import.",
        "error",
      );
      setProgress({ stage: "error", percent: 0, message: "Invalid file type" });
      resetInput();
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast("File is too large. Maximum size is 10MB.", "error");
      setProgress({ stage: "error", percent: 0, message: "File too large" });
      resetInput();
      return;
    }

    if (scaleUnit === "custom" && !scaleUnitCustom.trim()) {
      toast("Enter a custom unit name (e.g. scoop, wrap, portion).", "error");
      setProgress({ stage: "error", percent: 0, message: "Missing unit name" });
      resetInput();
      return;
    }

    setProgress({ stage: "uploading", percent: 35, message: "Uploading…" });

    let response: Response;
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (scaleCategoryId) formData.append("categoryId", scaleCategoryId);
      formData.append(
        "scaleUnit",
        scaleUnit === "custom" ? scaleUnitCustom.trim() : scaleUnit,
      );
      formData.append("scaleStep", scaleStep || "0.001");
      if (scaleMinOrderQty) formData.append("minOrderQty", scaleMinOrderQty);
      if (scaleMaxOrderQty) formData.append("maxOrderQty", scaleMaxOrderQty);
      if (scalePresets) formData.append("scalePresets", scalePresets);

      response = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_URL}/export/products/import-scale-goods`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const uploadPct = Math.round((event.loaded / event.total) * 30); // 35→65
            setProgress({
              stage: "uploading",
              percent: 35 + uploadPct,
              message: `Uploading… ${Math.round((event.loaded / event.total) * 100)}%`,
            });
          }
        };

        xhr.onload = () => {
          const res = new Response(xhr.responseText, {
            status: xhr.status,
            headers: { "Content-Type": "application/json" },
          });
          resolve(res);
        };
        xhr.onerror = () =>
          reject(
            new Error("Network error — check your connection and try again."),
          );
        xhr.ontimeout = () =>
          reject(new Error("Request timed out. The file may be too large."));
        xhr.timeout = 120_000;
        xhr.send(formData);
      });
    } catch (err: any) {
      toast(err.message || "Upload failed. Check your connection.", "error");
      setProgress({ stage: "error", percent: 0, message: "Upload failed" });
      resetInput();
      return;
    }

    setProgress({
      stage: "processing",
      percent: 80,
      message: "Creating products…",
    });
    await new Promise((r) => setTimeout(r, 200));

    let data: any;
    try {
      data = await response.json();
    } catch {
      toast(
        "Server returned an unexpected response. Please try again.",
        "error",
      );
      setProgress({
        stage: "error",
        percent: 0,
        message: "Invalid server response",
      });
      resetInput();
      return;
    }

    if (!response.ok) {
      const errMsg =
        data?.message || data?.error || `Server error (${response.status})`;
      toast(errMsg, "error");
      setProgress({ stage: "error", percent: 0, message: errMsg });
      resetInput();
      return;
    }

    setProgress({ stage: "done", percent: 100, message: "Import complete" });
    const result: ImportResult = data.data;
    setImportResult(result);
    loadImportBatches();

    if (result.success > 0 && result.failed === 0) {
      toast(
        `${result.success} product(s) created` +
          (result.skipped ? `, ${result.skipped} already existed` : ""),
        "success",
      );
      onSuccess();
    } else if (result.success > 0 && result.failed > 0) {
      toast(
        `${result.success} created, ${result.failed} failed — see details below`,
        "error",
      );
      onSuccess();
    } else if (result.failed > 0) {
      toast(
        `Import failed: all ${result.failed} rows had errors — see details below`,
        "error",
      );
    } else if (data.message) {
      toast(data.message, "error");
    }

    resetInput();
  };

  const totalErrors =
    (importResult?.failed ?? 0) + (importResult?.stockRequestsFailed ?? 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <h2 className="font-semibold text-gray-900">
            Import / Export Products
          </h2>
          <button onClick={onClose} disabled={isImporting}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0">
          {(["export", "import"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                resetImport();
              }}
              disabled={isImporting}
              className={`flex-1 py-3 text-sm font-medium transition-colors capitalize ${activeTab === tab ? "border-b-2 border-brand-600 text-brand-700" : "text-gray-500 hover:text-gray-700"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* ── EXPORT TAB ── */}
          {activeTab === "export" && (
            <>
              <p className="text-xs text-gray-500">
                Download your product catalogue in your preferred format. The
                CSV export uses the same columns as the import template and can
                be re-imported directly.
              </p>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={handleExportCSV}
                  disabled={isExporting}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all disabled:opacity-50 text-left"
                >
                  <FileSpreadsheet className="w-8 h-8 text-green-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-gray-900">
                      Export as CSV
                    </p>
                    <p className="text-xs text-gray-500">
                      Same columns as the import template — ready to re-import
                    </p>
                  </div>
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 text-gray-400 ml-auto animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 text-gray-400 ml-auto" />
                  )}
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-red-400 hover:bg-red-50 transition-all disabled:opacity-50 text-left"
                >
                  <FileText className="w-8 h-8 text-red-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-gray-900">
                      Export as PDF
                    </p>
                    <p className="text-xs text-gray-500">
                      Printable inventory report
                    </p>
                  </div>
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 text-gray-400 ml-auto animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4 text-gray-400 ml-auto" />
                  )}
                </button>
              </div>
            </>
          )}

          {/* ── IMPORT TAB ── */}
          {activeTab === "import" && (
            <>
              {/* Import type selector — visible to anyone who can create
                  products via CSV (ADMIN/MANAGER/STAFF). The scale-sheet
                  path itself uses the exact same permission tier now (see
                  importScaleGoodsSheet), so this is a single check. */}
              {canCreateProducts && !isImporting && progress?.stage !== "done" && (
                <div className="flex gap-2 p-1 bg-gray-50 rounded-xl">
                  <button
                    onClick={() => {
                      setImportSource("csv");
                      resetImport();
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${importSource === "csv" ? "bg-white shadow-sm text-brand-700" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Product CSV
                  </button>
                  <button
                    onClick={() => {
                      setImportSource("scale");
                      resetImport();
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${importSource === "scale" ? "bg-white shadow-sm text-brand-700" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    <Scale className="w-3.5 h-3.5" /> CECON Scale Sheet
                  </button>
                </div>
              )}

              {/* ── CECON SCALE SHEET IMPORT ── */}
              {importSource === "scale" && canCreateProducts ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2 text-xs text-blue-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Upload the scale's own PLU export (e.g. SCALE_GOODS.xlsx —
                      Name, Code, Price, and an optional Category column). Every
                      new row becomes a product: SKU, slug, and barcode are
                      generated automatically, the barcode and Scale Ware Code
                      are set to the sheet's Code, description gets a generic
                      placeholder. New products are created with{" "}
                      <strong>0 stock, as a Draft</strong> — not for sale until
                      you set real stock and publish them. Rows whose Code is
                      already a product are always skipped, stock and all — safe
                      to re-upload the same master sheet after adding new rows
                      to it.
                    </span>
                  </div>

                  {!isImporting && progress?.stage !== "done" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Category{" "}
                          <span className="text-gray-400 font-normal">
                            (optional)
                          </span>
                        </label>
                        <select
                          value={scaleCategoryId}
                          onChange={(e) => setScaleCategoryId(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                        >
                          <option value="">
                            Use sheet's Category column, or a generic default
                          </option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">
                          Used as the fallback for any row without its own
                          Category cell — or for every row if the sheet has no
                          Category column at all. If you leave this blank too,
                          those rows land in an auto-created{" "}
                          <strong>"Scalable Products"</strong> category.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Unit of measurement
                          </label>
                          <select
                            value={scaleUnit}
                            onChange={(e) => setScaleUnit(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                          >
                            {SCALE_UNIT_OPTIONS.map((u) => (
                              <option key={u.value} value={u.value}>
                                {u.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Scale step
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="0.001"
                            value={scaleStep}
                            onChange={(e) => setScaleStep(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                      {scaleUnit === "custom" && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Custom unit name
                          </label>
                          <input
                            type="text"
                            value={scaleUnitCustom}
                            onChange={(e) => setScaleUnitCustom(e.target.value)}
                            placeholder="e.g. scoop, wrap, portion"
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                          />
                        </div>
                      )}

                      {/* Optional — none of these have a column in a CECON
                          sheet, so there's nothing per-row to read; set once
                          here and it applies to every product this import
                          creates. All blank by default, matching how these
                          products behaved before this was added. */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Min order{" "}
                            <span className="text-gray-400 font-normal">
                              (optional)
                            </span>
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="0.001"
                            placeholder={`defaults to step (${scaleStep || "0.001"})`}
                            value={scaleMinOrderQty}
                            onChange={(e) => setScaleMinOrderQty(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Max order{" "}
                            <span className="text-gray-400 font-normal">
                              (optional)
                            </span>
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="0.001"
                            placeholder="no limit"
                            value={scaleMaxOrderQty}
                            onChange={(e) => setScaleMaxOrderQty(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Default presets{" "}
                          <span className="text-gray-400 font-normal">
                            (optional)
                          </span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 0.25, 0.5, 1, 2"
                          value={scalePresets}
                          onChange={(e) => setScalePresets(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Comma-separated quick-select weights, applied to every
                          product from this sheet — e.g. tappable "0.5 kg" / "1
                          kg" shortcuts at POS and on the storefront, instead of
                          only the +/- stepper. Leave blank for none.
                        </p>
                      </div>

                      <p className="text-xs text-gray-400 -mt-2">
                        Every product from this sheet is created as scalable,
                        with{" "}
                        <strong>
                          Price per 1{" "}
                          {scaleUnit === "custom"
                            ? scaleUnitCustom || "unit"
                            : scaleUnit}
                        </strong>{" "}
                        set from the sheet's own Price column — no need to open
                        each one afterwards to toggle "sold by
                        measurement/scale" on.
                      </p>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Upload Scale Sheet (.xlsx)
                        </label>
                        <input
                          ref={scaleFileInputRef}
                          type="file"
                          accept=".xlsx"
                          onChange={handleScaleFileChange}
                          disabled={isImporting}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-700 file:font-medium file:text-xs hover:file:bg-brand-100 disabled:opacity-50"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Max 10MB · .xlsx only
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Progress bar */}
                  {progress &&
                    progress.stage !== "done" &&
                    progress.stage !== "error" && (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <ProgressBar
                          percent={progress.percent}
                          label={progress.message}
                        />
                      </div>
                    )}

                  {/* Error stage */}
                  {progress?.stage === "error" && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-sm text-red-700">
                      <FileWarning className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold">
                          Import could not proceed
                        </p>
                        <p className="text-xs mt-0.5 text-red-600">
                          {progress.message}
                        </p>
                      </div>
                      <button
                        onClick={resetImport}
                        className="text-xs text-red-500 hover:text-red-700 underline shrink-0"
                      >
                        Try again
                      </button>
                    </div>
                  )}

                  {/* Results */}
                  {importResult && progress?.stage === "done" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Import complete
                        </div>
                        <button
                          onClick={resetImport}
                          className="text-xs text-brand-600 hover:underline"
                        >
                          Import another file
                        </button>
                      </div>

                      <div className="w-full bg-green-100 rounded-full h-2">
                        <div className="h-2 rounded-full bg-green-500 w-full" />
                      </div>

                      {importResult.success > 0 && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
                          <CheckCircle className="w-4 h-4 shrink-0" />
                          <span>
                            {importResult.success} new product(s) created
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div className="bg-gray-50 rounded-xl p-2">
                          <p className="font-bold text-lg text-gray-900">
                            {importResult.success}
                          </p>
                          <p className="text-gray-500">Created</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-2">
                          <p className="font-bold text-lg text-gray-500 flex items-center justify-center gap-1">
                            <SkipForward className="w-3.5 h-3.5" />
                            {importResult.skipped ?? 0}
                          </p>
                          <p className="text-gray-500">Skipped</p>
                        </div>
                        <div
                          className={`rounded-xl p-2 col-span-2 ${importResult.failed > 0 ? "bg-red-50" : "bg-gray-50"}`}
                        >
                          <p
                            className={`font-bold text-lg ${importResult.failed > 0 ? "text-red-600" : "text-gray-400"}`}
                          >
                            {importResult.failed}
                          </p>
                          <p
                            className={
                              importResult.failed > 0
                                ? "text-red-500"
                                : "text-gray-400"
                            }
                          >
                            Errors
                          </p>
                        </div>
                      </div>

                      {importResult.failed > 0 &&
                        importResult.errors.length > 0 && (
                          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-red-700">
                                {importResult.failed} row
                                {importResult.failed !== 1 ? "s" : ""} had
                                errors:
                              </p>
                              {importResult.errors.length > 5 && (
                                <button
                                  onClick={() =>
                                    setShowAllErrors(!showAllErrors)
                                  }
                                  className="text-xs text-red-500 hover:underline"
                                >
                                  {showAllErrors
                                    ? "Show less"
                                    : `Show all ${importResult.errors.length}`}
                                </button>
                              )}
                            </div>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {(showAllErrors
                                ? importResult.errors
                                : importResult.errors.slice(0, 5)
                              ).map((e, i) => (
                                <div
                                  key={i}
                                  className="text-xs text-red-600 flex gap-1.5"
                                >
                                  <span className="font-bold shrink-0">
                                    Row {e.row}:
                                  </span>
                                  <span>{e.error}</span>
                                </div>
                              ))}
                              {!showAllErrors &&
                                importResult.errors.length > 5 && (
                                  <p className="text-xs text-red-400 italic">
                                    + {importResult.errors.length - 5} more
                                    errors…
                                  </p>
                                )}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Role notice */}
                  {isAdmin ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2 text-xs text-blue-700">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        Use the template to ensure correct column format.
                        Products are matched and updated by SKU. New rows create
                        new products, with stock applied immediately.
                      </span>
                    </div>
                  ) : canCreateProducts ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-xs text-amber-800">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                      <div className="space-y-1">
                        <p className="font-semibold">
                          You can create new products — stock still needs admin
                          approval
                        </p>
                        <p>
                          New rows create new products immediately (name, price,
                          category, etc.), but every
                          <strong> stockQuantity</strong> value — for a new
                          product or an existing one — is submitted as a pending
                          stock request instead of applied directly.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-xs text-amber-800">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                      <div className="space-y-1">
                        <p className="font-semibold">
                          Stock changes require admin approval
                        </p>
                        <p>
                          <strong>stockQuantity</strong> values will be
                          submitted as pending requests. Other fields update
                          immediately. Your role cannot create new products via
                          CSV — only existing SKUs can be updated.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Template download */}
                  <button
                    onClick={handleDownloadTemplate}
                    disabled={isImporting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-brand-400 hover:text-brand-700 disabled:opacity-50 transition-colors"
                  >
                    <Download className="w-4 h-4" /> Download CSV Template
                  </button>

                  {/* File input — hidden while importing */}
                  {!isImporting && progress?.stage !== "done" && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Upload CSV or Excel File
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileChange}
                        disabled={isImporting}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-700 file:font-medium file:text-xs hover:file:bg-brand-100 disabled:opacity-50"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Max 20MB · .csv, .xlsx, or .xls · Columns must match the
                        template
                      </p>
                    </div>
                  )}

                  {/* Pre-validation warnings */}
                  {preValidation &&
                    preValidation.errors.length > 0 &&
                    !isImporting &&
                    progress?.stage !== "error" && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-xs text-amber-800">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                        <div>
                          {preValidation.errors.map((e, i) => (
                            <p key={i}>{e}</p>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Progress bar */}
                  {progress &&
                    progress.stage !== "done" &&
                    progress.stage !== "error" && (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <ProgressBar
                          percent={progress.percent}
                          label={progress.message}
                        />
                        {preValidation && (
                          <p className="text-xs text-gray-400 mt-2 text-center">
                            {preValidation.rowCount} row
                            {preValidation.rowCount !== 1 ? "s" : ""} detected
                          </p>
                        )}
                      </div>
                    )}

                  {/* Error stage */}
                  {progress?.stage === "error" && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-sm text-red-700">
                      <FileWarning className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold">
                          Import could not proceed
                        </p>
                        <p className="text-xs mt-0.5 text-red-600">
                          {progress.message}
                        </p>
                      </div>
                      <button
                        onClick={resetImport}
                        className="text-xs text-red-500 hover:text-red-700 underline shrink-0"
                      >
                        Try again
                      </button>
                    </div>
                  )}

                  {/* Results */}
                  {importResult && progress?.stage === "done" && (
                    <div className="space-y-2">
                      {/* Done header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Import complete
                        </div>
                        <button
                          onClick={resetImport}
                          className="text-xs text-brand-600 hover:underline"
                        >
                          Import another file
                        </button>
                      </div>

                      {/* Completed progress bar at 100% */}
                      <div className="w-full bg-green-100 rounded-full h-2">
                        <div className="h-2 rounded-full bg-green-500 w-full" />
                      </div>

                      {/* Stock requests (non-admin) */}
                      {!isAdmin && (importResult.stockRequests ?? 0) > 0 && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                          <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                          <div>
                            <p className="font-semibold">
                              {importResult.stockRequests} stock change
                              {importResult.stockRequests !== 1 ? "s" : ""}{" "}
                              pending approval
                            </p>
                            <p className="text-xs mt-0.5 text-amber-600">
                              Admin will review in the Stock Approvals section.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Success */}
                      {importResult.success > 0 && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
                          <CheckCircle className="w-4 h-4 shrink-0" />
                          <span>
                            {isAdmin
                              ? `${importResult.success} product(s) imported / updated`
                              : canCreateProducts
                                ? `${importResult.success} product(s) created / updated`
                                : `${importResult.success} product(s) updated (non-stock fields)`}
                          </span>
                        </div>
                      )}

                      {/* Summary counts */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-gray-50 rounded-xl p-2">
                          <p className="font-bold text-lg text-gray-900">
                            {importResult.success}
                          </p>
                          <p className="text-gray-500">Updated</p>
                        </div>
                        {!isAdmin && (
                          <div className="bg-amber-50 rounded-xl p-2">
                            <p className="font-bold text-lg text-amber-700">
                              {importResult.stockRequests ?? 0}
                            </p>
                            <p className="text-amber-600">Pending approval</p>
                          </div>
                        )}
                        <div
                          className={`rounded-xl p-2 ${totalErrors > 0 ? "bg-red-50" : "bg-gray-50"}`}
                        >
                          <p
                            className={`font-bold text-lg ${totalErrors > 0 ? "text-red-600" : "text-gray-400"}`}
                          >
                            {totalErrors}
                          </p>
                          <p
                            className={
                              totalErrors > 0 ? "text-red-500" : "text-gray-400"
                            }
                          >
                            Errors
                          </p>
                        </div>
                      </div>

                      {/* Error detail list */}
                      {totalErrors > 0 && importResult.errors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-red-700">
                              {totalErrors} row{totalErrors !== 1 ? "s" : ""}{" "}
                              had errors:
                            </p>
                            {importResult.errors.length > 5 && (
                              <button
                                onClick={() => setShowAllErrors(!showAllErrors)}
                                className="text-xs text-red-500 hover:underline"
                              >
                                {showAllErrors
                                  ? "Show less"
                                  : `Show all ${importResult.errors.length}`}
                              </button>
                            )}
                          </div>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {(showAllErrors
                              ? importResult.errors
                              : importResult.errors.slice(0, 5)
                            ).map((e, i) => (
                              <div
                                key={i}
                                className="text-xs text-red-600 flex gap-1.5"
                              >
                                <span className="font-bold shrink-0">
                                  Row {e.row}:
                                </span>
                                <span>{e.error}</span>
                              </div>
                            ))}
                            {!showAllErrors &&
                              importResult.errors.length > 5 && (
                                <p className="text-xs text-red-400 italic">
                                  + {importResult.errors.length - 5} more
                                  errors…
                                </p>
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ── RECENT IMPORTS / UNDO ── */}
              {!isImporting && (
                <div className="border-t border-gray-100 pt-4 mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                      <History className="w-3.5 h-3.5" /> Recent imports
                    </div>
                    {loadingBatches && (
                      <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                    )}
                  </div>

                  {importBatches.length === 0 && !loadingBatches ? (
                    <p className="text-xs text-gray-400">No imports yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {importBatches.map((b) => (
                        <div
                          key={b.id}
                          className={`rounded-xl border p-3 text-xs ${b.status === "UNDONE" ? "border-gray-200 bg-gray-50 opacity-60" : "border-gray-200 bg-white"}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                {b.type === "SCALE_GOODS" ? (
                                  <Scale className="w-3 h-3 text-gray-400 shrink-0" />
                                ) : (
                                  <FileSpreadsheet className="w-3 h-3 text-gray-400 shrink-0" />
                                )}
                                <p className="font-medium text-gray-800 truncate">
                                  {b.fileName ||
                                    (b.type === "SCALE_GOODS"
                                      ? "Scale sheet"
                                      : "CSV")}
                                </p>
                              </div>
                              <p className="text-gray-400 mt-0.5 flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {b.performedByName} ({b.performedByRole}) ·{" "}
                                {new Date(b.createdAt).toLocaleString()}
                              </p>
                              <p className="text-gray-500 mt-1">
                                {b.createdCount > 0 && (
                                  <span>{b.createdCount} created </span>
                                )}
                                {b.updatedCount > 0 && (
                                  <span>{b.updatedCount} updated </span>
                                )}
                                {b.failedCount > 0 && (
                                  <span className="text-red-500">
                                    {b.failedCount} failed{" "}
                                  </span>
                                )}
                                {b.stockRequestCount > 0 && (
                                  <span className="text-amber-600">
                                    {b.stockRequestCount} pending stock
                                    request(s)
                                  </span>
                                )}
                              </p>
                              {b.status === "UNDONE" && (
                                <p className="text-gray-400 mt-1 italic">
                                  Undone by {b.undoneByName} ·{" "}
                                  {b.undoneAt
                                    ? new Date(b.undoneAt).toLocaleString()
                                    : ""}
                                </p>
                              )}
                            </div>

                            {b.status !== "UNDONE" && (
                              <div className="shrink-0">
                                {!isAdmin ? (
                                  <span
                                    className="text-gray-300"
                                    title="Only admins can undo an import"
                                  >
                                    <Undo2 className="w-4 h-4" />
                                  </span>
                                ) : !b.undoable ? (
                                  <span
                                    className="flex items-center gap-1 text-gray-300 cursor-not-allowed"
                                    title={
                                      b.undoBlockedReason || "Can't be undone"
                                    }
                                  >
                                    <Undo2 className="w-4 h-4" />
                                  </span>
                                ) : confirmUndoId === b.id ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleUndoBatch(b.id)}
                                      disabled={undoingBatchId === b.id}
                                      className="text-red-600 hover:underline font-medium disabled:opacity-50"
                                    >
                                      {undoingBatchId === b.id
                                        ? "Undoing…"
                                        : "Confirm"}
                                    </button>
                                    <button
                                      onClick={() => setConfirmUndoId(null)}
                                      className="text-gray-400 hover:text-gray-600"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmUndoId(b.id)}
                                    className="flex items-center gap-1 text-brand-600 hover:text-brand-700 hover:underline"
                                    title="Undo this import"
                                  >
                                    <Undo2 className="w-3.5 h-3.5" /> Undo
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          {b.status !== "UNDONE" && !b.undoable && isAdmin && (
                            <p className="flex items-center gap-1 text-gray-400 mt-1.5">
                              <Info className="w-3 h-3 shrink-0" />{" "}
                              {b.undoBlockedReason}
                            </p>
                          )}
                        </div>
                      ))}
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
