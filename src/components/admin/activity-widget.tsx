"use client";
// frontend/src/components/admin/activity-widget.tsx
// Small recent-activity panel for the admin dashboard.
// "See more" navigates to /admin/activities (admin-only full log page).

import { useState, useEffect } from "react";
import { Clock, Package, Tag, ShoppingCart, User, Settings, Shield, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

interface ActivityLog {
  id: string;
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  user?: { id: string; name: string; email: string; role: string };
}

const ENTITY_ICONS: Record<string, React.ElementType> = {
  product: Package, category: Tag, order: ShoppingCart,
  user: User, settings: Settings,
};

const ACTION_COLORS: Record<string, string> = {
  create: "text-green-600 bg-green-50",
  update: "text-blue-600 bg-blue-50",
  delete: "text-red-600 bg-red-50",
  login: "text-purple-600 bg-purple-50",
  import: "text-amber-600 bg-amber-50",
};

function actionColor(action: string) {
  const key = Object.keys(ACTION_COLORS).find((k) => action.toLowerCase().includes(k));
  return key ? ACTION_COLORS[key] : "text-gray-600 bg-gray-50";
}

function EntityIcon({ entity }: { entity?: string }) {
  const Icon = ENTITY_ICONS[(entity || "").toLowerCase()] || Shield;
  return <Icon className="w-3.5 h-3.5" />;
}

function DetailModal({ log, onClose }: { log: ActivityLog; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gray-100 rounded-lg"><EntityIcon entity={log.entity} /></div>
            <div>
              <p className="font-semibold text-sm text-gray-900">{log.action}</p>
              {log.entity && <p className="text-xs text-gray-400 capitalize">{log.entity}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4 text-sm">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Performed by</p>
            {log.user ? (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-xs">
                  {log.user.name[0]}
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-xs">{log.user.name}</p>
                  <p className="text-[10px] text-gray-400">{log.user.email} · {log.user.role}</p>
                </div>
              </div>
            ) : <p className="text-gray-400 text-xs">System</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">When</p>
              <p className="text-xs text-gray-700">{formatDateTime(log.createdAt)}</p>
            </div>
            {log.entityId && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Entity ID</p>
                <p className="font-mono text-[10px] text-gray-600 break-all">{log.entityId}</p>
              </div>
            )}
          </div>

          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Details</p>
              <pre className="bg-gray-900 text-green-400 rounded-xl p-3 text-[10px] overflow-auto max-h-40 font-mono">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ActivityWidget() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<ActivityLog | null>(null);

  useEffect(() => {
    apiGet<any>("/activities/recent")
      .then((res) => setLogs(res.data.logs || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <>
      {selected && <DetailModal log={selected} onClose={() => setSelected(null)} />}

      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <Link href="/admin/activities" className="flex items-center gap-1 text-xs text-green-600 hover:underline font-medium">
            See all <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 px-5 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-gray-100 animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
                  <div className="h-2 bg-gray-100 rounded animate-pulse w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            No activity yet
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <button
                key={log.id}
                onClick={() => setSelected(log)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 text-left group"
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${actionColor(log.action)}`}>
                  <EntityIcon entity={log.entity} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{log.action}</p>
                  <p className="text-[10px] text-gray-400 truncate">
                    {log.user?.name || "System"}{log.entity ? ` · ${log.entity}` : ""}
                  </p>
                </div>
                <p className="text-[10px] text-gray-400 shrink-0">{formatDateTime(log.createdAt)}</p>
                <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-gray-500 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
