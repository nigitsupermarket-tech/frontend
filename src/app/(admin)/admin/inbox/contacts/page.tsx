"use client";
// frontend/src/app/(admin)/admin/inbox/contacts/page.tsx

import { useState, useEffect } from "react";
import {
  Mail,
  Trash2,
  CheckCheck,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
  Phone,
  MessageSquare,
  MapPin,
  Tag,
  Filter,
} from "lucide-react";
import { apiGet, apiPatch, apiDelete, getApiError } from "@/lib/api";
import { useIsAdmin } from "@/store/authStore";
import { useToast } from "@/store/uiStore";
import { formatDateTime } from "@/lib/utils";
import {
  EmptyState,
  TableRowSkeleton,
} from "@/components/shared/loading-spinner";

type ContactStatus = "UNREAD" | "READ" | "REPLIED" | "ARCHIVED";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  heardAboutUs?: string;
  preferredContact?: string;
  preferredTime?: string;
  status: ContactStatus;
  notes?: string;
  repliedAt?: string;
  createdAt: string;
}

const STATUS_STYLES: Record<ContactStatus, string> = {
  UNREAD: "bg-blue-100 text-blue-700",
  READ: "bg-gray-100 text-gray-600",
  REPLIED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-yellow-100 text-yellow-700",
};

const STATUS_OPTIONS: ContactStatus[] = [
  "UNREAD",
  "READ",
  "REPLIED",
  "ARCHIVED",
];

export default function AdminContactsPage() {
  const toast = useToast();
  const isAdmin = useIsAdmin();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    replied: 0,
    read: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<ContactStatus | "">("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [msgRes, statRes] = await Promise.all([
        apiGet<any>(
          `/contact/messages?page=${page}&limit=20${filter ? `&status=${filter}` : ""}`,
        ),
        apiGet<any>("/contact"),
      ]);
      setMessages(msgRes.data.messages);
      setTotalPages(msgRes.data.pagination.totalPages);
      setStats(statRes.data);
    } catch {
      toast("Failed to load messages", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, filter]);

  const updateStatus = async (id: string, status: ContactStatus) => {
    try {
      await apiPatch(`/contact/messages/${id}`, { status });
      toast("Updated", "success");
      fetchData();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  const saveNotes = async (id: string) => {
    try {
      await apiPatch(`/contact/messages/${id}`, { notes: editNotes[id] ?? "" });
      toast("Notes saved", "success");
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    try {
      await apiDelete(`/contact/messages/${id}`);
      toast("Deleted", "success");
      fetchData();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Contact Messages</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Customer enquiries submitted via the contact form
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "text-gray-900" },
          { label: "Unread", value: stats.unread, color: "text-blue-600" },
          { label: "Read", value: stats.read, color: "text-gray-500" },
          { label: "Replied", value: stats.replied, color: "text-green-600" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-gray-100 p-4"
          >
            <p className="text-xs text-gray-500 uppercase font-medium">
              {s.label}
            </p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-gray-400" />
        {(["", ...STATUS_OPTIONS] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setFilter(s);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === s
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Messages list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <TableRowSkeleton key={i} cols={5} />
          ))
        ) : messages.length === 0 ? (
          <EmptyState
            title="No messages"
            description="No contact submissions yet"
            icon={<Mail className="w-8 h-8 text-gray-200" />}
          />
        ) : (
          messages.map((msg) => {
            const isOpen = expanded === msg.id;
            return (
              <div key={msg.id}>
                {/* Row */}
                <div
                  className={`flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    msg.status === "UNREAD" ? "bg-blue-50/40" : ""
                  }`}
                  onClick={() => setExpanded(isOpen ? null : msg.id)}
                >
                  {/* Unread dot */}
                  <div
                    className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${msg.status === "UNREAD" ? "bg-blue-500" : "bg-transparent"}`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900">
                        {msg.name}
                      </p>
                      <span className="text-xs text-gray-400">{msg.email}</span>
                      <span
                        className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[msg.status]}`}
                      >
                        {msg.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5 truncate">
                      {msg.subject}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDateTime(msg.createdAt)}
                    </p>
                  </div>

                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                  )}
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-5 pb-5 bg-gray-50 border-t border-gray-100 space-y-4">
                    {/* Contact info pills */}
                    <div className="flex flex-wrap gap-2 pt-3">
                      {msg.phone && (
                        <span className="flex items-center gap-1 text-xs bg-white border border-gray-200 rounded-full px-3 py-1">
                          <Phone className="w-3 h-3 text-gray-400" />{" "}
                          {msg.phone}
                        </span>
                      )}
                      {msg.preferredContact && (
                        <span className="flex items-center gap-1 text-xs bg-white border border-gray-200 rounded-full px-3 py-1">
                          <MessageSquare className="w-3 h-3 text-brand-400" />
                          Prefers: <strong>{msg.preferredContact}</strong>
                        </span>
                      )}
                      {msg.preferredTime && (
                        <span className="flex items-center gap-1 text-xs bg-white border border-gray-200 rounded-full px-3 py-1">
                          <Clock className="w-3 h-3 text-brand-400" />
                          Best time: <strong>{msg.preferredTime}</strong>
                        </span>
                      )}
                      {msg.heardAboutUs && (
                        <span className="flex items-center gap-1 text-xs bg-white border border-gray-200 rounded-full px-3 py-1">
                          <Tag className="w-3 h-3 text-green-500" />
                          Via: <strong>{msg.heardAboutUs}</strong>
                        </span>
                      )}
                    </div>

                    {/* Message body */}
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">
                        Message
                      </p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {msg.message}
                      </p>
                    </div>

                    {/* Internal notes */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                        Internal Notes
                      </label>
                      <textarea
                        rows={2}
                        defaultValue={msg.notes || ""}
                        onChange={(e) =>
                          setEditNotes((p) => ({
                            ...p,
                            [msg.id]: e.target.value,
                          }))
                        }
                        placeholder="Add notes visible only to staff…"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-green-500 resize-none"
                      />
                      <button
                        onClick={() => saveNotes(msg.id)}
                        className="mt-1 px-3 py-1.5 text-xs bg-gray-800 text-white rounded-lg hover:bg-gray-900"
                      >
                        Save Notes
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs text-gray-500 font-medium mr-1">
                        Mark as:
                      </span>
                      {STATUS_OPTIONS.filter((s) => s !== msg.status).map(
                        (s) => (
                          <button
                            key={s}
                            onClick={() => updateStatus(msg.id, s)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${STATUS_STYLES[s]} border-transparent hover:opacity-80`}
                          >
                            {s === "REPLIED" && (
                              <CheckCheck className="w-3 h-3 inline mr-1" />
                            )}
                            {s}
                          </button>
                        ),
                      )}
                      {/* Admin-only delete */}
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
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
