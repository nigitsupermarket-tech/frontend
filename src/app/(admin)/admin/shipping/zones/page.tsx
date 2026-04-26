"use client";
// frontend/src/app/(admin)/admin/shipping/zones/page.tsx
// Supports state-level AND LGA-level zone coverage

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, MapPin, Search } from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
// Import the LGA data directly
import { nigeriaStatesLgas } from "@/data/nigeria-states-lgas";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ShippingZone {
  id: string;
  name: string;
  description?: string;
  states: string[]; // "State" OR "State::LGA"
  isActive: boolean;
  _count?: { methods: number };
}

// Parse stored values back to human-readable labels
function parseZoneEntry(entry: string): { state: string; lga?: string; label: string } {
  if (entry.includes("::")) {
    const [state, lga] = entry.split("::");
    return { state, lga, label: `${lga} (${state})` };
  }
  return { state: entry, label: `${entry} (Entire State)` };
}

// ─── LGA Picker Component ─────────────────────────────────────────────────────
// Shows a two-column picker: left = states, right = LGAs of selected state.
// Allows selecting whole states OR individual LGAs.
function LGAPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (entries: string[]) => void;
}) {
  const [activeState, setActiveState] = useState<string | null>(null);
  const [lgaSearch, setLgaSearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");

  const activeLgas =
    activeState
      ? nigeriaStatesLgas.find((s: any) => s.state === activeState)?.lga || []
      : [];

  const filteredLgas = lgaSearch
    ? activeLgas.filter((l: string) => l.toLowerCase().includes(lgaSearch.toLowerCase()))
    : activeLgas;

  const filteredStates = stateSearch
    ? nigeriaStatesLgas.filter((s: any) => s.state.toLowerCase().includes(stateSearch.toLowerCase()))
    : nigeriaStatesLgas;

  const toggle = (entry: string) => {
    onChange(
      selected.includes(entry) ? selected.filter((e) => e !== entry) : [...selected, entry],
    );
  };

  const isStateFullySelected = (stateName: string) => selected.includes(stateName);
  const isStatePartiallySelected = (stateName: string) => {
    const stateData = nigeriaStatesLgas.find((s: any) => s.state === stateName);
    if (!stateData) return false;
    return stateData.lga.some((l: string) => selected.includes(`${stateName}::${l}`));
  };

  const toggleEntireState = (stateName: string) => {
    if (isStateFullySelected(stateName)) {
      // Remove state + all its LGAs
      onChange(
        selected.filter((e) => e !== stateName && !e.startsWith(`${stateName}::`)),
      );
    } else {
      // Add state, remove individual LGAs (whole state supersedes specific ones)
      onChange([
        ...selected.filter((e) => !e.startsWith(`${stateName}::`)),
        stateName,
      ]);
    }
  };

  const selectedCount = selected.length;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">
          Coverage Areas ({selectedCount} selected)
        </span>
        {selectedCount > 0 && (
          <button onClick={() => onChange([])} className="text-xs text-red-500 hover:text-red-700">
            Clear all
          </button>
        )}
      </div>

      <div className="flex h-72">
        {/* States list */}
        <div className="w-48 border-r border-gray-200 flex flex-col">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input
                type="text" value={stateSearch} onChange={(e) => setStateSearch(e.target.value)}
                placeholder="Filter states..." className="w-full pl-6 pr-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredStates.map((stateData: any) => {
              const isFull = isStateFullySelected(stateData.state);
              const isPartial = isStatePartiallySelected(stateData.state);
              return (
                <div
                  key={stateData.state}
                  onClick={() => setActiveState(activeState === stateData.state ? null : stateData.state)}
                  className={`px-3 py-2 cursor-pointer flex items-center gap-2 text-xs hover:bg-gray-50 transition-colors ${activeState === stateData.state ? "bg-green-50 border-l-2 border-green-500" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={isFull}
                    ref={(el) => { if (el) el.indeterminate = isPartial && !isFull; }}
                    onChange={(e) => { e.stopPropagation(); toggleEntireState(stateData.state); }}
                    className="rounded border-gray-300 text-green-600 cursor-pointer"
                    title="Select entire state"
                  />
                  <span className={`flex-1 truncate ${isFull ? "font-semibold text-green-700" : isPartial ? "text-green-600" : "text-gray-700"}`}>
                    {stateData.state}
                  </span>
                  {stateData.lga?.length > 0 && (
                    <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* LGAs list */}
        <div className="flex-1 flex flex-col">
          {activeState ? (
            <>
              <div className="p-2 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-600 mb-1.5">{activeState} — LGAs</p>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <input
                    type="text" value={lgaSearch} onChange={(e) => setLgaSearch(e.target.value)}
                    placeholder="Filter LGAs..." className="w-full pl-6 pr-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none"
                  />
                </div>
                <div className="flex gap-2 mt-1.5">
                  <button
                    onClick={() => toggleEntireState(activeState)}
                    className="text-[10px] font-semibold text-green-700 hover:text-green-900"
                  >
                    {isStateFullySelected(activeState) ? "Deselect state" : "Select entire state"}
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-2">
                {isStateFullySelected(activeState) && (
                  <div className="mb-2 px-2 py-1.5 bg-green-50 border border-green-200 rounded text-xs text-green-700 font-medium">
                    ✓ Entire state selected — all LGAs covered
                  </div>
                )}
                <div className="space-y-0.5">
                  {filteredLgas.map((lga: string) => {
                    const key = `${activeState}::${lga}`;
                    const isChecked = selected.includes(key) || isStateFullySelected(activeState);
                    return (
                      <label
                        key={lga}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50 text-xs ${isChecked ? "text-green-700 font-medium" : "text-gray-700"}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isStateFullySelected(activeState)}
                          onChange={() => toggle(key)}
                          className="rounded border-gray-300 text-green-600"
                        />
                        {lga}
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
              <div className="text-center">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                <p>Select a state to see LGAs</p>
                <p className="mt-1 text-gray-300">Or check the box to select an entire state</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected summary */}
      {selected.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 max-h-24 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-600 mb-1.5">Selected:</p>
          <div className="flex flex-wrap gap-1">
            {selected.map((entry) => {
              const { label } = parseZoneEntry(entry);
              return (
                <span key={entry} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full">
                  {label}
                  <button onClick={() => toggle(entry)} className="hover:text-red-500">×</button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminShippingZonesPage() {
  const toast = useToast();
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editZone, setEditZone] = useState<ShippingZone | null>(null);
  const [form, setForm] = useState({ name: "", description: "", states: [] as string[], isActive: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchZones(); }, []);

  const fetchZones = async () => {
    setIsLoading(true);
    try {
      const res = await apiGet<any>("/shipping/zones/all");
      setZones(res.data.zones);
    } catch (err) { toast(getApiError(err), "error"); }
    finally { setIsLoading(false); }
  };

  const openNew = () => {
    setEditZone(null);
    setForm({ name: "", description: "", states: [], isActive: true });
    setShowModal(true);
  };

  const openEdit = (zone: ShippingZone) => {
    setEditZone(zone);
    setForm({ name: zone.name, description: zone.description || "", states: zone.states, isActive: zone.isActive });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.states.length === 0) { toast("Please select at least one state or LGA", "error"); return; }
    setSaving(true);
    try {
      if (editZone) { await apiPut(`/shipping/zones/${editZone.id}`, form); toast("Zone updated", "success"); }
      else { await apiPost("/shipping/zones", form); toast("Zone created", "success"); }
      setShowModal(false);
      fetchZones();
    } catch (err) { toast(getApiError(err), "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, hasMethods: boolean) => {
    if (hasMethods) { toast("Cannot delete zone with shipping methods", "error"); return; }
    if (!confirm("Delete this zone?")) return;
    try {
      await apiDelete(`/shipping/zones/${id}`);
      toast("Zone deleted", "success");
      fetchZones();
    } catch (err) { toast(getApiError(err), "error"); }
  };

  // Format display of zone's states array
  const formatStatesDisplay = (states: string[]) => {
    const stateLevel = states.filter((s) => !s.includes("::"));
    const lgaLevel = states.filter((s) => s.includes("::"));
    const parts = [];
    if (stateLevel.length > 0) parts.push(`${stateLevel.length} state(s)`);
    if (lgaLevel.length > 0) parts.push(`${lgaLevel.length} specific LGA(s)`);
    return parts.join(" + ");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipping Zones</h1>
          <p className="text-sm text-gray-600 mt-1">Configure by state or specific LGAs for fine-grained pricing</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700">
          <Plus className="w-4 h-4" /> Add Zone
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : zones.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No shipping zones yet.</p>
          <button onClick={openNew} className="mt-4 text-green-600 hover:text-green-700 text-sm font-medium">Create your first zone</button>
        </div>
      ) : (
        <div className="grid gap-4">
          {zones.map((zone) => (
            <div key={zone.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">{zone.name}</h3>
                    {!zone.isActive && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">Inactive</span>}
                  </div>
                  {zone.description && <p className="text-sm text-gray-600 mb-2">{zone.description}</p>}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>📍 {formatStatesDisplay(zone.states)}</span>
                    <span>🚚 {zone._count?.methods || 0} methods</span>
                  </div>
                  {/* Preview */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {zone.states.slice(0, 6).map((s) => {
                      const { label } = parseZoneEntry(s);
                      return (
                        <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                          {label}
                        </span>
                      );
                    })}
                    {zone.states.length > 6 && <span className="px-2 py-0.5 text-gray-400 text-xs">+{zone.states.length - 6} more</span>}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => (window.location.href = `/admin/shipping/zones/${zone.id}/methods`)}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Manage methods"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button onClick={() => openEdit(zone)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(zone.id, (zone._count?.methods || 0) > 0)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold">{editZone ? "Edit Zone" : "New Shipping Zone"}</h2>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Zone Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-500"
                  placeholder="e.g., Port Harcourt Metropolis, Rivers State"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-500 resize-none"
                  placeholder="Brief description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coverage — States & LGAs *
                  <span className="ml-2 text-xs font-normal text-gray-500">Select whole states or specific LGAs</span>
                </label>
                <LGAPicker selected={form.states} onChange={(entries) => setForm({ ...form, states: entries })} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded border-gray-300 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </form>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={handleSubmit} disabled={saving} className="flex-1 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 disabled:opacity-50">
                {saving ? "Saving..." : editZone ? "Update Zone" : "Create Zone"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
