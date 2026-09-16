"use client";

// frontend/src/app/(admin)/admin/reports/page.tsx
import { useEffect, useState, useCallback } from "react";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import {
  FileText,
  RefreshCcw,
  Download,
  Package,
  ClipboardCheck,
  ShoppingCart,
  Store,
  Activity as ActivityIcon,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { apiGet, getApiError } from "@/lib/api";
import { formatPrice, formatPriceCompact, formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { PageLoader } from "@/components/shared/loading-spinner";

const PRIVILEGED = ["ADMIN", "MANAGER", "ACCOUNTANT"];

// Only the summary-card report types live here now. Stock movement, stock
// approvals, and activity are always-on tabs below (see DETAIL_TABS) so
// picking one doesn't hide the other two.
const REPORT_TYPES = [
  { value: "overview", label: "Overview", icon: FileText },
  { value: "sales", label: "Online Sales", icon: ShoppingCart },
  { value: "pos", label: "POS Sales", icon: Store },
];

const DETAIL_TABS = [
  { value: "stock", label: "Stock Movement", icon: Package },
  { value: "stock-approvals", label: "Stock Approvals", icon: ClipboardCheck },
  { value: "activity", label: "Activity Log", icon: ActivityIcon },
  { value: "product-sales", label: "Product Sales", icon: BarChart3 },
];

// The /reports endpoint always nests a type's data under its section key
// (e.g. `{ meta, activity: {...} }`, `{ meta, stockApprovals: {...} }`) —
// never flat — so the tab fetch has to unwrap the right key per tab.
const SECTION_KEY: Record<string, string> = {
  stock: "stock",
  "stock-approvals": "stockApprovals",
  activity: "activity",
  "product-sales": "productSales",
};

const INTERVALS = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
  { value: "year", label: "Last 12 months" },
  { value: "custom", label: "Custom range" },
];

// jsPDF's built-in fonts (Helvetica etc.) only support WinAnsi/Latin-1, which
// doesn't include the Naira sign (₦, U+20A6). Feeding it to autoTable/text()
// doesn't throw — it silently renders each character as a separate glyph
// with stray spacing, which is what was showing up in exported PDFs. Embedding
// a Unicode-aware font is overkill for one symbol, so the PDF just spells out
// "NGN" instead; on-screen formatting (formatPrice) is untouched.
function pdfPrice(amount: number): string {
  return `NGN ${amount.toLocaleString("en-NG")}`;
}

const PAGE_SIZE = 20;
// PDF export pulls the whole filtered range in one call rather than
// paging through it — this just needs to stay under the backend's cap
// (see resolvePagination in report.controller.ts).
const EXPORT_LIMIT = 2000;

interface AppliedFilters {
  interval: string;
  from: string;
  to: string;
  userId: string;
}

function SummaryCard({
  label,
  value,
  fullValue,
}: {
  label: string;
  value: string | number;
  fullValue?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-gray-900" title={fullValue}>
        {value}
      </p>
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useAuthStore();
  const isPrivileged = PRIVILEGED.includes(user?.role || "");

  // ── Filter bar state ────────────────────────────────────────────────
  const [type, setType] = useState("overview");
  const [interval, setIntervalValue] = useState("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [scope, setScope] = useState<"org" | "user">("org");
  const [users, setUsers] = useState<any[]>([]);
  const [userId, setUserId] = useState("");

  // Filters only actually take effect once "Generate" is pressed — this is
  // the single source of truth both the summary cards and the detail tabs
  // fetch from, so changing a dropdown and forgetting to click Generate no
  // longer looks like "the filter did nothing" while stale data lingers.
  const [applied, setApplied] = useState<AppliedFilters>({
    interval: "month",
    from: "",
    to: "",
    userId: "",
  });

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState("");

  // ── Detail tabs state ───────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<string>("stock");
  const [pageByTab, setPageByTab] = useState<Record<string, number>>({
    stock: 1,
    "stock-approvals": 1,
    activity: 1,
    "product-sales": 1,
  });
  const [tabData, setTabData] = useState<any>(null);
  const [tabLoading, setTabLoading] = useState(false);
  const [tabError, setTabError] = useState("");
  const [exporting, setExporting] = useState(false);

  // Stock-movement tab only — filters InventoryLog entries by sales
  // channel. "all" (default) shows everything, same as before this filter
  // existed.
  const [stockSource, setStockSource] = useState<"all" | "online" | "pos">(
    "all",
  );

  // Product search — applies to the stock-movement AND stock-approvals
  // tabs (both track a specific product's history). Raw input is kept
  // separate from the applied value so typing doesn't refetch on every
  // keystroke; it only takes effect on Enter or the Search button.
  const [productQuery, setProductQuery] = useState("");
  const [appliedProduct, setAppliedProduct] = useState("");

  // Product Sales tab — drill-down into every individual line that sold a
  // given product (who bought/rang it up, when, how much). Fetched
  // on-demand per product rather than as part of the tab's own page load.
  const [productDetail, setProductDetail] = useState<any>(null);
  const [productDetailLoading, setProductDetailLoading] = useState(false);
  const [productDetailError, setProductDetailError] = useState("");
  const [productDetailPage, setProductDetailPage] = useState(1);

  const openProductDetail = useCallback(
    async (productId: string, page = 1) => {
      setProductDetailLoading(true);
      setProductDetailError("");
      setProductDetailPage(page);
      try {
        const params: Record<string, string> = {
          type: "product-sales-detail",
          productId,
          interval: applied.interval,
          page: String(page),
          limit: String(PAGE_SIZE),
        };
        if (applied.interval === "custom") {
          params.from = applied.from;
          params.to = applied.to;
        }
        if (isPrivileged && applied.userId) params.userId = applied.userId;

        const res = await apiGet<any>("/reports", params);
        setProductDetail(res.data?.productSalesDetail ?? null);
      } catch (e: any) {
        setProductDetailError(getApiError(e));
      } finally {
        setProductDetailLoading(false);
      }
    },
    [applied, isPrivileged],
  );

  const closeProductDetail = () => {
    setProductDetail(null);
    setProductDetailError("");
  };

  useEffect(() => {
    if (!isPrivileged) return;
    // Populate the user picker so ADMIN/MANAGER/ACCOUNTANT can pull a
    // report for a specific staff member instead of the whole org.
    apiGet<any>("/users", { limit: "100" })
      .then((r) => setUsers(r.data?.users || []))
      .catch(() => {});
  }, [isPrivileged]);

  // ── Summary cards fetch ─────────────────────────────────────────────
  const runReport = useCallback(
    async (filters: AppliedFilters, reportType: string) => {
      setLoading(true);
      setError("");
      try {
        const params: Record<string, string> = {
          type: reportType,
          interval: filters.interval,
        };
        if (filters.interval === "custom") {
          if (!filters.from || !filters.to) {
            setError("Pick both a start and end date for a custom range");
            setLoading(false);
            return;
          }
          params.from = filters.from;
          params.to = filters.to;
        }
        if (isPrivileged && filters.userId) params.userId = filters.userId;

        const res = await apiGet<any>("/reports", params);
        setReport(res.data);
      } catch (e: any) {
        setError(getApiError(e));
      } finally {
        setLoading(false);
      }
    },
    [isPrivileged],
  );

  // ── Detail tab fetch — always filtered by the same applied filters ──
  const fetchTab = useCallback(
    async (
      tab: string,
      page: number,
      filters: AppliedFilters,
      source: "all" | "online" | "pos",
      productFilter: string,
    ) => {
      setTabLoading(true);
      setTabError("");
      try {
        const params: Record<string, string> = {
          type: tab,
          interval: filters.interval,
          page: String(page),
          limit: String(PAGE_SIZE),
        };
        if (filters.interval === "custom") {
          if (!filters.from || !filters.to) {
            setTabLoading(false);
            return;
          }
          params.from = filters.from;
          params.to = filters.to;
        }
        if (isPrivileged && filters.userId) params.userId = filters.userId;
        // Sales-channel filter applies to stock-movement AND product-sales.
        if ((tab === "stock" || tab === "product-sales") && source !== "all") {
          params.source = source;
        }
        // Product search applies to all three product-scoped tabs.
        if (
          (tab === "stock" ||
            tab === "stock-approvals" ||
            tab === "product-sales") &&
          productFilter.trim()
        ) {
          params.product = productFilter.trim();
        }

        const res = await apiGet<any>("/reports", params);
        setTabData(res.data?.[SECTION_KEY[tab]] ?? null);
      } catch (e: any) {
        setTabError(getApiError(e));
      } finally {
        setTabLoading(false);
      }
    },
    [isPrivileged],
  );

  // Summary cards refetch whenever the applied filters or the summary
  // report type change.
  useEffect(() => {
    runReport(applied, type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied, type]);

  // Detail tab refetches on tab switch, page change, applied filters, or
  // (for the stock tab) the sales-channel source filter, or the product
  // search filter — this is what makes the filter bar actually govern the
  // tabbed tables.
  useEffect(() => {
    fetchTab(
      activeTab,
      pageByTab[activeTab] || 1,
      applied,
      stockSource,
      appliedProduct,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, pageByTab[activeTab], applied, stockSource, appliedProduct]);

  const handleGenerate = () => {
    if (interval === "custom" && (!from || !to)) {
      setError("Pick both a start and end date for a custom range");
      return;
    }
    // Changing the filters restarts pagination on every tab so nobody is
    // looking at page 4 of a completely different date range.
    setPageByTab({ stock: 1, "stock-approvals": 1, activity: 1, "product-sales": 1 });
    setApplied({
      interval,
      from,
      to,
      userId: scope === "user" ? userId : "",
    });
  };

  const setTabPage = (tab: string, page: number) => {
    setPageByTab((prev) => ({ ...prev, [tab]: page }));
  };

  const handleStockSourceChange = (source: "all" | "online" | "pos") => {
    setStockSource(source);
    setPageByTab((prev) => ({ ...prev, stock: 1, "product-sales": 1 }));
  };

  const applyProductSearch = () => {
    setAppliedProduct(productQuery.trim());
    setPageByTab((prev) => ({
      ...prev,
      stock: 1,
      "stock-approvals": 1,
      "product-sales": 1,
    }));
  };

  const clearProductSearch = () => {
    setProductQuery("");
    setAppliedProduct("");
    setPageByTab((prev) => ({
      ...prev,
      stock: 1,
      "stock-approvals": 1,
      "product-sales": 1,
    }));
  };

  const downloadPdf = async () => {
    if (!report) return;
    setExporting(true);
    setError("");
    try {
      // Pull the *entire* filtered range for all three detail tables in one
      // shot (rather than exporting only whatever page/tab happens to be on
      // screen) so the PDF is a complete report, not a snapshot of the UI.
      const baseParams: Record<string, string> = {
        interval: applied.interval,
        limit: String(EXPORT_LIMIT),
        page: "1",
      };
      if (applied.interval === "custom") {
        baseParams.from = applied.from;
        baseParams.to = applied.to;
      }
      if (isPrivileged && applied.userId) baseParams.userId = applied.userId;

      const [stockRes, approvalsRes, activityRes, productSalesRes] =
        await Promise.all([
          apiGet<any>("/reports", {
            ...baseParams,
            type: "stock",
            ...(stockSource !== "all" ? { source: stockSource } : {}),
            ...(appliedProduct ? { product: appliedProduct } : {}),
          }),
          apiGet<any>("/reports", {
            ...baseParams,
            type: "stock-approvals",
            ...(appliedProduct ? { product: appliedProduct } : {}),
          }),
          apiGet<any>("/reports", { ...baseParams, type: "activity" }),
          apiGet<any>("/reports", {
            ...baseParams,
            type: "product-sales",
            ...(stockSource !== "all" ? { source: stockSource } : {}),
            ...(appliedProduct ? { product: appliedProduct } : {}),
          }),
        ]);

      const stock = stockRes.data?.stock;
      const approvals = approvalsRes.data?.stockApprovals;
      const activity = activityRes.data?.activity;
      const productSales = productSalesRes.data?.productSales;

      const { meta, sales, pos } = report;
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 16;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("NigitTriple — Business Report", 14, y);
      y += 7;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      const scopeLabel =
        meta.scope === "org"
          ? "Whole business"
          : meta.scope === "user"
            ? "Selected user"
            : "Your activity";
      doc.text(
        `${formatDateTime(meta.range.start)} — ${formatDateTime(meta.range.end)}  ·  ${scopeLabel}  ·  generated ${formatDateTime(meta.generatedAt)}`,
        14,
        y,
      );
      doc.setTextColor(0);
      y += 8;

      // ── Summary cards ────────────────────────────────────────────────
      if (sales) {
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [["Online Sales", "", ""]],
          body: [
            [
              `Orders: ${sales.orderCount}`,
              `Revenue: ${pdfPrice(sales.revenue)}`,
              `Avg Order Value: ${pdfPrice(sales.averageOrderValue)}`,
            ],
          ],
          theme: "plain",
          headStyles: { fontStyle: "bold", fontSize: 10 },
          styles: { fontSize: 9 },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
      }

      if (pos) {
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [["POS Sales", "", "", ""]],
          body: [
            [
              `Completed: ${pos.orderCount}`,
              `Voided: ${pos.voidedCount}`,
              `Revenue: ${pdfPrice(pos.revenue)}`,
              `Avg Order Value: ${pdfPrice(pos.averageOrderValue)}`,
            ],
          ],
          theme: "plain",
          headStyles: { fontStyle: "bold", fontSize: 10 },
          styles: { fontSize: 9 },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // ── Stock Movement ───────────────────────────────────────────────
      if (stock) {
        if (y > 260) {
          doc.addPage();
          y = 16;
        }
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        const sourceLabel =
          stockSource === "online"
            ? " — Online Orders"
            : stockSource === "pos"
              ? " — POS"
              : "";
        const productLabel = appliedProduct ? ` — "${appliedProduct}"` : "";
        doc.text(
          `Stock Movement (${stock.totalMovements})${sourceLabel}${productLabel}`,
          14,
          y,
        );
        y += 4;
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [["Date", "Product", "Type", "From", "To", "Reason", "User"]],
          body: (stock.entries || []).map((r: any) => [
            formatDateTime(r.createdAt),
            r.product?.name || "—",
            r.type,
            r.previousQty,
            r.newQty,
            r.reason || "—",
            r.performedByName || "System",
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [22, 101, 52] },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // ── Stock Approvals ──────────────────────────────────────────────
      if (approvals) {
        if (y > 260) {
          doc.addPage();
          y = 16;
        }
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(
          `Stock Approvals (${approvals.total})${appliedProduct ? ` — "${appliedProduct}"` : ""}`,
          14,
          y,
        );
        y += 4;
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [
            [
              "Date",
              "Product",
              "User",
              "Current",
              "Requested",
              "Status",
              "Reviewed by",
            ],
          ],
          body: (approvals.entries || []).map((r: any) => [
            formatDateTime(r.createdAt),
            r.productName,
            r.requestedByName,
            r.currentQty,
            r.requestedQty,
            r.status,
            r.reviewedByName || "—",
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [22, 101, 52] },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // ── Activity Log ─────────────────────────────────────────────────
      if (activity) {
        if (y > 260) {
          doc.addPage();
          y = 16;
        }
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Activity Log (${activity.total})`, 14, y);
        y += 4;
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [["Date", "User", "Action", "Entity"]],
          body: (activity.entries || []).map((r: any) => [
            formatDateTime(r.createdAt),
            r.userName || "System",
            r.action,
            r.entity || "—",
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [22, 101, 52] },
        });
      }

      // ── Product Sales ─────────────────────────────────────────────────
      // Reads from OrderItem/POSOrderItem's own snapshot fields, so this
      // table keeps reporting units sold for a product even after it's
      // been hard-deleted (see buildProductSalesSection).
      if (productSales) {
        y = (doc as any).lastAutoTable.finalY + 10;
        if (y > 260) {
          doc.addPage();
          y = 16;
        }
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        const sourceLabel =
          stockSource === "online"
            ? " — Online Orders"
            : stockSource === "pos"
              ? " — POS"
              : "";
        doc.text(
          `Product Sales (${productSales.distinctProducts} products, ${productSales.totalUnitsSold} units)${sourceLabel}${appliedProduct ? ` — "${appliedProduct}"` : ""}`,
          14,
          y,
        );
        y += 4;
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [
            ["Product", "SKU", "Online Qty", "POS Qty", "Total Qty", "Revenue"],
          ],
          body: (productSales.entries || []).map((r: any) => [
            r.productName + (r.productExists ? "" : " (deleted)"),
            r.productSku,
            r.onlineQty,
            r.posQty,
            r.totalQty,
            pdfPrice(r.totalRevenue),
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [22, 101, 52] },
        });
      }

      // Footer page numbers
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 28, 290);
      }

      doc.save(`report-${type}-${applied.interval}-${Date.now()}.pdf`);
    } catch (e: any) {
      setError(getApiError(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-600" />
            Reports
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isPrivileged
              ? "Generate a report for the business, or drill into a specific user"
              : "Generate a report of your own activity"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadPdf}
            disabled={!report || exporting}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-40"
          >
            <Download className="w-4 h-4" />{" "}
            {exporting ? "Exporting…" : "Export PDF"}
          </button>
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 px-3 py-2 bg-brand-600 text-white rounded-xl text-sm hover:bg-brand-700"
          >
            <RefreshCcw className="w-4 h-4" /> Generate
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Summary type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
          >
            {REPORT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Time interval
          </label>
          <select
            value={interval}
            onChange={(e) => setIntervalValue(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
          >
            {INTERVALS.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
        </div>

        {interval === "custom" && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                From
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                To
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
              />
            </div>
          </>
        )}

        {isPrivileged && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Scope
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as "org" | "user")}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
              >
                <option value="org">Whole business</option>
                <option value="user">Specific user</option>
              </select>
            </div>
            {scope === "user" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  User
                </label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white min-w-[180px]"
                >
                  <option value="">Select a user…</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
          {error}
        </div>
      )}

      {loading ? (
        <PageLoader />
      ) : report ? (
        <SummaryResults report={report} />
      ) : null}

      {/* Tabbed detail section — always visible, always filtered by the
          same interval/date/scope controls above. */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            {DETAIL_TABS.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setActiveTab(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white shadow-sm text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Sales-channel filter — meaningful on stock-movement
              (InventoryLog rows are tagged ONLINE_SALE/ONLINE_RETURN for
              the website, POS_SALE/RETURN for in-store) and on
              product-sales (splits units sold by channel the same way). */}
          {(activeTab === "stock" || activeTab === "product-sales") && (
            <div className="flex rounded-xl border border-gray-200 overflow-hidden">
              {(
                [
                  { value: "all", label: "All" },
                  { value: "online", label: "Online Orders" },
                  { value: "pos", label: "POS" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleStockSourceChange(opt.value)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                    stockSource === opt.value
                      ? "bg-brand-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product search — find a single product's full inventory
            history: every addition, sale (online or POS), adjustment, and
            who was involved. Available on all three product-scoped tabs. */}
        {(activeTab === "stock" ||
          activeTab === "stock-approvals" ||
          activeTab === "product-sales") && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyProductSearch()}
                placeholder="Search by product name or SKU…"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <button
              onClick={applyProductSearch}
              className="px-3 py-2 bg-gray-900 text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition-colors"
            >
              Search
            </button>
            {appliedProduct && (
              <button
                onClick={clearProductSearch}
                className="flex items-center gap-1 px-3 py-2 border border-gray-200 text-xs font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
                title="Clear product filter"
              >
                <X className="w-3.5 h-3.5" />
                {appliedProduct}
              </button>
            )}
          </div>
        )}

        {tabError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
            {tabError}
          </div>
        )}

        {tabLoading ? (
          <PageLoader />
        ) : (
          <DetailTabPanel
            tab={activeTab}
            data={tabData}
            page={pageByTab[activeTab] || 1}
            onPageChange={(p) => setTabPage(activeTab, p)}
            onViewProductDetail={(productId) => openProductDetail(productId, 1)}
          />
        )}
      </div>

      {/* Product Sales drill-down — every individual sale line for one
          product, with who bought/rang it up. */}
      {(productDetail || productDetailLoading || productDetailError) && (
        <ProductDetailModal
          detail={productDetail}
          loading={productDetailLoading}
          error={productDetailError}
          page={productDetailPage}
          onPageChange={(p) =>
            productDetail && openProductDetail(productDetail.productId, p)
          }
          onClose={closeProductDetail}
        />
      )}
    </div>
  );
}

function SummaryResults({ report }: { report: any }) {
  const { meta, ...sections } = report;

  return (
    <div className="space-y-6">
      <div className="text-xs text-gray-400">
        {formatDateTime(meta.range.start)} — {formatDateTime(meta.range.end)}
        {" · "}
        {meta.scope === "org"
          ? "Whole business"
          : meta.scope === "user"
            ? "Selected user"
            : "Your activity"}
        {" · "}
        generated {formatDateTime(meta.generatedAt)}
      </div>

      {sections.sales && (
        <Section title="Online Sales">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <SummaryCard label="Orders" value={sections.sales.orderCount} />
            <SummaryCard
              label="Revenue"
              value={formatPriceCompact(sections.sales.revenue)}
              fullValue={formatPrice(sections.sales.revenue)}
            />
            <SummaryCard
              label="Avg Order Value"
              value={formatPriceCompact(sections.sales.averageOrderValue)}
              fullValue={formatPrice(sections.sales.averageOrderValue)}
            />
          </div>
        </Section>
      )}

      {sections.pos && (
        <Section title="POS Sales">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard
              label="Completed orders"
              value={sections.pos.orderCount}
            />
            <SummaryCard
              label="Voided orders"
              value={sections.pos.voidedCount}
            />
            <SummaryCard
              label="Revenue"
              value={formatPriceCompact(sections.pos.revenue)}
              fullValue={formatPrice(sections.pos.revenue)}
            />
            <SummaryCard
              label="Avg Order Value"
              value={formatPriceCompact(sections.pos.averageOrderValue)}
              fullValue={formatPrice(sections.pos.averageOrderValue)}
            />
          </div>
        </Section>
      )}
    </div>
  );
}

function DetailTabPanel({
  tab,
  data,
  page,
  onPageChange,
  onViewProductDetail,
}: {
  tab: string;
  data: any;
  page: number;
  onPageChange: (page: number) => void;
  onViewProductDetail: (productId: string) => void;
}) {
  if (!data) return null;

  if (tab === "stock") {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <SummaryCard label="Total movements" value={data.totalMovements} />
          {Object.entries(data.byType || {}).map(([k, v]) => (
            <SummaryCard key={k} label={k} value={v as number} />
          ))}
        </div>
        <EntryTable
          rows={data.entries}
          columns={[
            {
              key: "createdAt",
              label: "Date",
              render: (r: any) => formatDateTime(r.createdAt),
            },
            {
              key: "product",
              label: "Product",
              render: (r: any) => r.product?.name || "—",
            },
            { key: "type", label: "Type" },
            { key: "previousQty", label: "From" },
            { key: "newQty", label: "To" },
            { key: "reason", label: "Reason" },
            { key: "performedByName", label: "User" },
          ]}
        />
        <Pagination
          pagination={data.pagination}
          page={page}
          onPageChange={onPageChange}
        />
      </div>
    );
  }

  if (tab === "stock-approvals") {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label="Total requests" value={data.total} />
          <SummaryCard label="Pending" value={data.pending} />
          <SummaryCard label="Approved" value={data.approved} />
          <SummaryCard label="Rejected" value={data.rejected} />
        </div>
        <EntryTable
          rows={data.entries}
          columns={[
            {
              key: "createdAt",
              label: "Date",
              render: (r: any) => formatDateTime(r.createdAt),
            },
            { key: "productName", label: "Product" },
            { key: "requestedByName", label: "User" },
            { key: "currentQty", label: "Current" },
            { key: "requestedQty", label: "Requested" },
            { key: "status", label: "Status" },
            { key: "reviewedByName", label: "Reviewed by" },
          ]}
        />
        <Pagination
          pagination={data.pagination}
          page={page}
          onPageChange={onPageChange}
        />
      </div>
    );
  }

  if (tab === "product-sales") {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <SummaryCard label="Distinct products sold" value={data.distinctProducts} />
          <SummaryCard label="Total units sold" value={data.totalUnitsSold} />
          <SummaryCard
            label="Total revenue"
            value={formatPriceCompact(data.totalRevenue)}
            fullValue={formatPrice(data.totalRevenue)}
          />
        </div>
        <EntryTable
          rows={data.entries}
          columns={[
            {
              key: "productName",
              label: "Product",
              render: (r: any) => (
                <span className="flex items-center gap-1.5">
                  {r.productName}
                  {!r.productExists && (
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700"
                      title="This product has since been deleted — figures are preserved from sale-time records"
                    >
                      Deleted
                    </span>
                  )}
                </span>
              ),
            },
            { key: "productSku", label: "SKU" },
            { key: "onlineQty", label: "Online Qty" },
            { key: "posQty", label: "POS Qty" },
            {
              key: "totalQty",
              label: "Total Qty",
              render: (r: any) => <strong>{r.totalQty}</strong>,
            },
            {
              key: "totalRevenue",
              label: "Revenue",
              render: (r: any) => formatPrice(r.totalRevenue),
            },
            {
              key: "actions",
              label: "",
              render: (r: any) => (
                <button
                  onClick={() => onViewProductDetail(r.productId)}
                  className="text-brand-600 hover:text-brand-700 text-xs font-semibold whitespace-nowrap"
                >
                  View Details
                </button>
              ),
            },
          ]}
        />
        <Pagination
          pagination={data.pagination}
          page={page}
          onPageChange={onPageChange}
        />
      </div>
    );
  }

  // activity
  return (
    <div className="space-y-3">
      <EntryTable
        rows={data.entries}
        columns={[
          {
            key: "createdAt",
            label: "Date",
            render: (r: any) => formatDateTime(r.createdAt),
          },
          { key: "userName", label: "User" },
          { key: "action", label: "Action" },
          { key: "entity", label: "Entity" },
        ]}
      />
      <Pagination
        pagination={data.pagination}
        page={page}
        onPageChange={onPageChange}
      />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-700 mb-2">{title}</h2>
      {children}
    </div>
  );
}

function Pagination({
  pagination,
  page,
  onPageChange,
}: {
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
  };
  page: number;
  onPageChange: (page: number) => void;
}) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { totalPages, total, limit } = pagination;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-500">
        {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <p className="text-sm text-gray-500">
          Page {page} of {totalPages}
        </p>
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="p-2 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="p-2 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function EntryTable({
  rows,
  columns,
}: {
  rows: any[];
  columns: {
    key: string;
    label: string;
    render?: (r: any) => React.ReactNode;
  }[];
}) {
  if (!rows || rows.length === 0)
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-sm text-gray-400">
        No records for this range
      </div>
    );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {columns.map((c) => (
              <th
                key={c.key}
                className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs uppercase"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i} className="border-b border-gray-50">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-2.5 text-gray-700">
                  {c.render ? c.render(r) : (r[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Product Sales drill-down modal — every individual line that sold one
// product, with who was involved (cashier for POS, buyer for online).
// Opened from the "View Details" action on the Product Sales tab.
function ProductDetailModal({
  detail,
  loading,
  error,
  page,
  onPageChange,
  onClose,
}: {
  detail: any;
  loading: boolean;
  error: string;
  page: number;
  onPageChange: (page: number) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-900">
              {detail?.productName || "Product sales"}
              {detail && !detail.productExists && (
                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 align-middle">
                  Deleted
                </span>
              )}
            </h2>
            {detail && (
              <p className="text-xs text-gray-500 mt-0.5">
                SKU {detail.productSku} · {detail.totalLines} sale
                {detail.totalLines === 1 ? "" : "s"} · {detail.totalQty} units
                total
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-10 flex justify-center">
            <PageLoader />
          </div>
        ) : detail ? (
          <>
            <EntryTable
              rows={detail.entries}
              columns={[
                {
                  key: "date",
                  label: "Date",
                  render: (r: any) => formatDateTime(r.date),
                },
                { key: "reference", label: "Order #" },
                {
                  key: "channel",
                  label: "Channel",
                  render: (r: any) => (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        r.channel === "pos"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {r.channel === "pos" ? "POS" : "Online"}
                    </span>
                  ),
                },
                { key: "quantity", label: "Qty" },
                {
                  key: "subtotal",
                  label: "Amount",
                  render: (r: any) => formatPrice(r.subtotal),
                },
                { key: "soldByLabel", label: "Who" },
              ]}
            />
            <Pagination
              pagination={detail.pagination}
              page={page}
              onPageChange={onPageChange}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
