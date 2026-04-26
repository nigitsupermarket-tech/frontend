"use client";
// frontend/src/app/(admin)/admin/pos/sessions/page.tsx

import { useState, useEffect } from "react";
import { Clock, ChevronDown, User } from "lucide-react";
import { apiGet, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { formatPrice } from "@/lib/utils";

interface POSSession {
  id: string;
  staffId: string;
  openedAt: string;
  closedAt?: string;
  openingFloat: number;
  closingFloat?: number;
  expectedCash?: number;
  variance?: number;
  totalSales: number;
  totalOrders: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
  notes?: string;
  status: string;
  staff?: { name: string; email: string; role: string };
}

function VarianceBadge({ variance }: { variance: number | undefined }) {
  if (variance === undefined || variance === null)
    return <span className="text-gray-400 text-xs">—</span>;
  if (Math.abs(variance) < 1)
    return (
      <span className="text-green-600 text-xs font-semibold">Balanced</span>
    );
  return (
    <span
      className={`text-xs font-semibold ${variance > 0 ? "text-blue-600" : "text-red-600"}`}
    >
      {variance > 0 ? `+${formatPrice(variance)}` : formatPrice(variance)}
      {variance > 0 ? " surplus" : " shortage"}
    </span>
  );
}

// ✅ FIX 2: Resolve staff display reliably.
// Priority: staff.name → staff.email (trimmed to "user@…") → "Staff #<short-id>"
// Never shows plain "Unknown".
function staffLabel(session: POSSession): {
  primary: string;
  secondary: string;
} {
  if (session.staff?.name && session.staff.name.trim()) {
    return {
      primary: session.staff.name.trim(),
      secondary: session.staff.email || session.staff.role || "",
    };
  }
  if (session.staff?.email) {
    return {
      primary: session.staff.email,
      secondary: session.staff.role || "",
    };
  }
  // Fall back to a friendly short ID instead of "Unknown"
  const shortId = session.staffId.slice(-6).toUpperCase();
  return { primary: `Staff #${shortId}`, secondary: "ID not resolved" };
}

export default function POSSessionsPage() {
  const toast = useToast();
  const [sessions, setSessions] = useState<POSSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, [page]);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const res = await apiGet<any>(`/pos/sessions?page=${page}&limit=20`);
      setSessions(res.data.sessions || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const totalOpen = sessions.filter((s) => s.status === "OPEN").length;
  const totalRevenue = sessions.reduce((s, x) => s + x.totalSales, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">POS Sessions</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor all cashier sessions, cash floats and variances
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">
            Open Sessions
          </p>
          <p className="text-2xl font-bold text-green-600 mt-1">{totalOpen}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">
            Total Sessions
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {sessions.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">
            Total Revenue
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatPrice(totalRevenue)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">
            Total Orders
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {sessions.reduce((s, x) => s + x.totalOrders, 0)}
          </p>
        </div>
      </div>

      {/* Sessions list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">
            Loading sessions…
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Clock className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p>No sessions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sessions.map((session) => {
              const { primary, secondary } = staffLabel(session);
              return (
                <div key={session.id}>
                  <button
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 text-left"
                    onClick={() =>
                      setExpanded(expanded === session.id ? null : session.id)
                    }
                  >
                    {/* Status dot */}
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        session.status === "OPEN"
                          ? "bg-green-500"
                          : "bg-gray-300"
                      }`}
                    />

                    {/* ✅ Staff name / fallback — never shows "Unknown" */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        {primary}
                        <span
                          className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            session.status === "OPEN"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {session.status}
                        </span>
                      </p>
                      {secondary && (
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate pl-5">
                          {secondary}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5 pl-5">
                        {new Date(session.openedAt).toLocaleString("en-NG", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {session.closedAt &&
                          ` → ${new Date(session.closedAt).toLocaleTimeString(
                            "en-NG",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}`}
                      </p>
                    </div>

                    {/* Orders */}
                    <div className="text-center w-16 hidden sm:block">
                      <p className="text-sm font-bold text-gray-900">
                        {session.totalOrders}
                      </p>
                      <p className="text-xs text-gray-400">orders</p>
                    </div>

                    {/* Sales */}
                    <div className="text-right w-28">
                      <p className="text-sm font-bold text-gray-900">
                        {formatPrice(session.totalSales)}
                      </p>
                      <p className="text-xs text-gray-400">sales</p>
                    </div>

                    {/* Variance */}
                    <div className="text-right w-24 hidden md:block">
                      <VarianceBadge variance={session.variance} />
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
                        expanded === session.id ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Expanded detail */}
                  {expanded === session.id && (
                    <div className="px-5 pb-5 pt-2 bg-gray-50 border-t border-gray-100">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-xs text-gray-500">Opening Float</p>
                          <p className="font-semibold">
                            {formatPrice(session.openingFloat)}
                          </p>
                        </div>
                        {session.closingFloat !== undefined && (
                          <div>
                            <p className="text-xs text-gray-500">
                              Closing Float
                            </p>
                            <p className="font-semibold">
                              {formatPrice(session.closingFloat)}
                            </p>
                          </div>
                        )}
                        {session.expectedCash !== undefined && (
                          <div>
                            <p className="text-xs text-gray-500">
                              Expected Cash
                            </p>
                            <p className="font-semibold">
                              {formatPrice(session.expectedCash)}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-500">Cash Sales</p>
                          <p className="font-semibold">
                            {formatPrice(session.cashSales)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Card Sales</p>
                          <p className="font-semibold">
                            {formatPrice(session.cardSales)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">
                            Transfer Sales
                          </p>
                          <p className="font-semibold">
                            {formatPrice(session.transferSales)}
                          </p>
                        </div>
                        {session.variance !== undefined && (
                          <div>
                            <p className="text-xs text-gray-500">Variance</p>
                            <VarianceBadge variance={session.variance} />
                          </div>
                        )}
                      </div>
                      {session.notes && (
                        <p className="text-xs text-gray-500 bg-white rounded border border-gray-200 px-3 py-2">
                          {session.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                page === i + 1
                  ? "bg-green-600 text-white"
                  : "border border-gray-200 text-gray-700 hover:border-green-400"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
