import React, { useState } from "react";
import { BarChart3, Layers, Wallet, ShieldCheck, Plus, X, Loader2, RefreshCw, Calendar, MapPin, TrendingUp, Clock, ExternalLink, CheckCircle2, AlertTriangle, Banknote, Send, Ban } from "lucide-react";
import { Event, Organizer, LedgerEntry, Payout, PayoutRequest } from "../types";

type DashboardSection = "overview" | "events" | "payments" | "verification";

interface UserDashboardProps {
  organizer: Organizer | null;
  events: Event[];
  walletOverview: any;
  loading: boolean;
  onRefresh: () => void;
  onLogout: () => void;
  onSelectEvent: (event: Event) => void;
}

export default function UserDashboard({ organizer, events, walletOverview, loading, onRefresh, onLogout, onSelectEvent }: UserDashboardProps) {
  const [section, setSection] = useState<DashboardSection>("overview");

  const dateText = (d: string) => new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const navItems: { key: DashboardSection; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
    { key: "events", label: "Events", icon: <Layers className="h-4 w-4" /> },
    { key: "payments", label: "Payments", icon: <Wallet className="h-4 w-4" /> },
    { key: "verification", label: "Verification", icon: <ShieldCheck className="h-4 w-4" /> },
  ];

  const resetForm = () => ({
    name: "", eventDate: "", venue: "", description: "", flyer: "",
    categories: [{ name: "Regular Admission", price: "1500", totalQuantity: "1000" }, { name: "VIP Experience", price: "4000", totalQuantity: "250" }]
  });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState(resetForm());
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) { alert("Invalid format. Accepted: JPG, JPEG, PNG, WEBP"); return; }
    if (file.size > 10 * 1024 * 1024) { alert("File too large. Max 10MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    const formData = new FormData();
    formData.append("image", file);
    setImageUploading(true);
    try {
      const token = localStorage.getItem("otiko_auth_token") || "user-default-uid";
      const res = await fetch("/api/upload/image", { method: "POST", headers: { "Authorization": `Bearer ${token}` }, body: formData });
      const data = await res.json();
      if (res.ok) { setForm({...form, flyer: data.url}); setImagePreview(null); }
      else { alert(data.error || "Upload failed"); }
    } catch { alert("Image upload failed"); }
    finally { setImageUploading(false); }
  };

  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<"mpesa" | "bank" | "airtime">("mpesa");
  const [payoutAccount, setPayoutAccount] = useState(organizer?.mpesaPayoutNumber || "");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState("");
  const [payoutSuccess, setPayoutSuccess] = useState("");

  const updateCat = (i: number, field: string, value: string) => {
    const copy = [...form.categories];
    (copy[i] as any)[field] = value;
    setForm({ ...form, categories: copy });
  };

  const addCategory = () => setForm({ ...form, categories: [...form.categories, { name: "", price: "", totalQuantity: "" }] });
  const removeCategory = (i: number) => setForm({ ...form, categories: form.categories.filter((_, idx) => idx !== i) });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.eventDate || !form.venue) return;
    setSaving(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("otiko_auth_token") || "user-default-uid"}` },
        body: JSON.stringify({
          name: form.name, eventDate: form.eventDate, venue: form.venue,
          description: form.description, flyerUrl: form.flyer,
          categories: form.categories.map(c => ({ name: c.name, price: Number(c.price), totalQuantity: Number(c.totalQuantity) }))
        })
      });
      if (res.ok) { setShowCreateForm(false); setForm(resetForm()); onRefresh(); }
      else { const err = await res.json(); alert(err.error || "Failed to create event"); }
    } catch { alert("Connection error"); }
    finally { setSaving(false); }
  };

  const handlePayoutRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(payoutAmount);
    if (isNaN(amt) || amt <= 0) { setPayoutError("Enter a valid amount"); return; }
    if (!payoutAccount.trim()) { setPayoutError("Enter account details"); return; }
    setPayoutLoading(true); setPayoutError(""); setPayoutSuccess("");
    try {
      const token = localStorage.getItem("otiko_auth_token") || "user-default-uid";
      const res = await fetch("/api/wallet/payout-request", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ amount: amt, paymentMethod: payoutMethod, accountDetails: payoutAccount, notes: payoutNotes })
      });
      const data = await res.json();
      if (res.ok) {
        setPayoutSuccess(`Payout request for KES ${amt.toLocaleString()} submitted successfully!`);
        setPayoutAmount(""); setPayoutNotes(""); setPayoutAccount(organizer?.mpesaPayoutNumber || "");
        onRefresh();
      } else { setPayoutError(data.error || "Request failed"); }
    } catch { setPayoutError("Network error"); }
    finally { setPayoutLoading(false); }
  };

  const handleDelete = async (code: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/events/${code}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("otiko_auth_token") || "user-default-uid"}` }
      });
      if (res.ok) onRefresh();
      else { const err = await res.json(); alert(err.error || "Delete failed"); }
    } catch { alert("Error deleting event"); }
  };

  const kycStatusColor = organizer?.kycStatus === "verified" ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
    organizer?.kycStatus === "rejected" ? "text-rose-600 bg-rose-50 border-rose-200" :
    "text-amber-600 bg-amber-50 border-amber-200";

  const kycStatusLabel = organizer?.kycStatus === "verified" ? "Verified" :
    organizer?.kycStatus === "rejected" ? "Rejected" : "Pending";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Organizer Dashboard</h3>
          <p className="text-xs text-slate-500">{organizer?.businessName || organizer?.name || "Loading..."}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { onRefresh(); }} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={onLogout} className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
            Sign Out
          </button>
        </div>
      </div>

      <nav className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1.5 shadow-sm">
        {navItems.map(item => (
          <button key={item.key} onClick={() => setSection(item.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition ${
              section === item.key ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            {item.icon}{item.label}
          </button>
        ))}
      </nav>

      {section === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Events Created</p>
              <p className="text-2xl font-bold mt-1.5 text-slate-900">{events.length}</p>
              <div className="text-xs text-slate-400 mt-2">Active: {events.filter(e => e.status === "active").length}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Gross Revenue</p>
              <p className="text-2xl font-bold mt-1.5 text-slate-900 font-mono">KES {walletOverview?.grossCollected?.toLocaleString() || "0"}</p>
              <div className="text-xs text-slate-400 mt-2">Net: KES {walletOverview?.netBalance?.toLocaleString() || "0"}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Available Balance</p>
              <p className="text-2xl font-bold mt-1.5 text-emerald-700 font-mono">KES {walletOverview?.availableBalance?.toLocaleString() || "0"}</p>
              <div className="text-xs text-slate-400 mt-2">Ready for payout</div>
            </div>
            <div className={`rounded-xl border p-5 shadow-sm ${kycStatusColor}`}>
              <p className="text-[11px] font-bold uppercase tracking-wider">KYC Status</p>
              <p className="text-2xl font-bold mt-1.5">{kycStatusLabel}</p>
              <div className="text-xs mt-2 opacity-70">{organizer?.businessName || "No business registered"}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Recent Events</h4>
            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-10 shimmer-bg rounded-lg"></div>)}</div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">No events created yet. Go to Events to create your first event.</div>
            ) : (
              <div className="space-y-2">
                {events.slice(0, 5).map(evt => (
                  <div key={evt.id} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{evt.name}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {dateText(evt.eventDate)}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {evt.venue}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                      evt.status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                      evt.status === "past" ? "bg-slate-100 text-slate-500 border border-slate-200" :
                      "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}>{evt.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {section === "events" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500">{events.length} event{events.length !== 1 ? "s" : ""} registered</p>
            <button onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-1.5 transition"
            ><Plus className="h-4 w-4" /> {showCreateForm ? "Cancel" : "New Event"}</button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreate} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase">Event Name</label>
                  <input type="text" required placeholder="e.g. Sauti Sol Live" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-red-500 focus:bg-white focus:outline-none transition" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase">Date & Time</label>
                  <input type="datetime-local" required value={form.eventDate} onChange={e => setForm({...form, eventDate: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-red-500 focus:bg-white focus:outline-none transition" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase">Venue</label>
                  <input type="text" required placeholder="e.g. Nyayo Stadium" value={form.venue} onChange={e => setForm({...form, venue: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-red-500 focus:bg-white focus:outline-none transition" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase">Flyer Image</label>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload}
                    className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
                  {imageUploading && <div className="flex items-center gap-2 text-xs text-slate-500 mt-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading...</div>}
                  {imagePreview && <img src={imagePreview} alt="Preview" className="mt-2 h-32 w-full object-cover rounded-lg border border-slate-200" />}
                  {form.flyer && !imagePreview && !imageUploading && <div className="text-[10px] text-emerald-600 mt-1">Image uploaded ✓</div>}
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase">Description</label>
                <textarea rows={2} placeholder="Event details..." value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-red-500 focus:bg-white focus:outline-none transition"></textarea>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                  <label className="text-xs font-bold text-slate-600 uppercase">Ticket Categories</label>
                  <button type="button" onClick={addCategory} className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50 transition">+ Add</button>
                </div>
                {form.categories.map((cat, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Name</label>
                      <input type="text" required placeholder="e.g. VIP" value={cat.name} onChange={e => updateCat(i, "name", e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Price (KES)</label>
                      <input type="number" required placeholder="2000" value={cat.price} onChange={e => updateCat(i, "price", e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono" />
                    </div>
                    <div className="flex gap-2 items-end">
                      <div className="space-y-1 flex-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Quantity</label>
                        <input type="number" required placeholder="500" value={cat.totalQuantity} onChange={e => updateCat(i, "totalQuantity", e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono" />
                      </div>
                      {form.categories.length > 1 && (
                        <button type="button" onClick={() => removeCategory(i)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition"><X className="h-4 w-4" /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowCreateForm(false)} className="text-xs font-semibold text-slate-600 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition">Cancel</button>
                <button type="submit" disabled={saving} className="bg-slate-900 hover:bg-red-600 text-white text-xs font-semibold px-5 py-2 rounded-lg transition flex items-center gap-1.5">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Create Event
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-12 shimmer-bg rounded-lg"></div>)}</div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">No events created. Click "New Event" to get started.</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold text-[10px]">
                    <th className="py-3.5 px-4">Code</th>
                    <th className="py-3.5 px-4">Event</th>
                    <th className="py-3.5 px-4 hidden md:table-cell">Venue</th>
                    <th className="py-3.5 px-4 hidden lg:table-cell">Tickets</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {events.map(evt => (
                    <tr key={evt.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{evt.eventCode}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{evt.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{dateText(evt.eventDate)}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 hidden md:table-cell">{evt.venue}</td>
                      <td className="py-3.5 px-4 hidden lg:table-cell">
                        {evt.categories?.map(cat => (
                          <div key={cat.id} className="text-[10px] text-slate-500">{cat.name}: {cat.remainingQuantity}/{cat.totalQuantity}</div>
                        ))}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                          evt.status === "active" ? "bg-emerald-50 text-emerald-700" :
                          evt.status === "past" ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-700"
                        }`}>{evt.status}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => onSelectEvent(evt)} className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded transition" title="View">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(evt.eventCode, evt.name)} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded transition" title="Delete">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {section === "payments" && (
        <div className="space-y-6">
          {/* Balance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Gross Revenue</p>
              <p className="text-2xl font-bold mt-1.5 text-slate-900 font-mono">KES {walletOverview?.grossCollected?.toLocaleString() || "0"}</p>
              <p className="text-[10px] text-slate-400 mt-2">Platform fee: KES {walletOverview?.platformFees?.toLocaleString() || "0"}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Net Balance</p>
              <p className="text-2xl font-bold mt-1.5 text-slate-900 font-mono">KES {walletOverview?.netBalance?.toLocaleString() || "0"}</p>
              <p className="text-[10px] text-slate-400 mt-2">Net amount</p>
            </div>
            <div className="bg-white rounded-xl border border-amber-100 p-5 shadow-sm bg-gradient-to-br from-amber-50">
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Reserved</p>
              <p className="text-2xl font-bold mt-1.5 text-amber-800 font-mono">KES {walletOverview?.reservedAmount?.toLocaleString() || "0"}</p>
              <p className="text-[10px] text-amber-600 mt-2 font-semibold">Pending requests</p>
            </div>
            <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm bg-gradient-to-br from-emerald-50">
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Available for Payout</p>
              <p className="text-2xl font-bold mt-1.5 text-emerald-800 font-mono">KES {walletOverview?.availableBalance?.toLocaleString() || "0"}</p>
              <p className="text-[10px] text-emerald-600 mt-2 font-semibold">Ready for withdrawal</p>
            </div>
          </div>

          {/* Payout Request Form */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4">Request Payout</h4>
            <form onSubmit={handlePayoutRequest} className="space-y-4">
              {payoutError && <div className="bg-rose-50 text-rose-600 text-xs p-3 rounded-lg border border-rose-200">{payoutError}</div>}
              {payoutSuccess && <div className="bg-emerald-50 text-emerald-600 text-xs p-3 rounded-lg border border-emerald-200 font-medium">{payoutSuccess}</div>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">Amount (KES)</label>
                  <input type="number" required min="101" placeholder="e.g. 5000"
                    value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 rounded-lg px-3 py-2.5 text-xs font-mono font-bold"
                  />
                  <p className="text-[10px] text-slate-400">Max: KES {walletOverview?.availableBalance?.toLocaleString() || "0"}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">Payment Method</label>
                  <select value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 rounded-lg px-3 py-2.5 text-xs"
                  >
                    <option value="mpesa">M-Pesa</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="airtime">Airtime</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">Account Details</label>
                <input type="text" required placeholder={payoutMethod === "mpesa" ? "254712345678" : "Bank account details"}
                  value={payoutAccount} onChange={(e) => setPayoutAccount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 rounded-lg px-3 py-2.5 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">Notes <span className="font-normal text-slate-400">(optional)</span></label>
                <textarea rows={2} placeholder="Additional notes for this request"
                  value={payoutNotes} onChange={(e) => setPayoutNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <button type="submit" disabled={payoutLoading}
                className="bg-slate-900 hover:bg-red-600 disabled:bg-slate-300 text-white font-semibold py-2.5 px-6 rounded-lg text-xs transition flex items-center gap-2"
              >
                {payoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit Payout Request
              </button>
            </form>
          </div>

          {/* Payout Requests List */}
          {walletOverview?.payoutRequests?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Withdrawal Requests</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold text-[10px]">
                      <th className="py-2.5 pr-3">ID</th>
                      <th className="py-2.5 pr-3">Amount</th>
                      <th className="py-2.5 pr-3">Method</th>
                      <th className="py-2.5 pr-3">Date</th>
                      <th className="py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {walletOverview.payoutRequests.map((pr: PayoutRequest) => (
                      <tr key={pr.id} className="hover:bg-slate-50">
                        <td className="py-3 pr-3 font-mono text-[10px] text-slate-500">{pr.id}</td>
                        <td className="py-3 pr-3 font-mono font-bold text-slate-900">KES {pr.amount.toLocaleString()}</td>
                        <td className="py-3 pr-3 capitalize">{pr.paymentMethod}</td>
                        <td className="py-3 pr-3 text-slate-500">{new Date(pr.requestedAt).toLocaleDateString()}</td>
                        <td className="py-3">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                            pr.status === "pending" ? "bg-amber-50 text-amber-700" :
                            pr.status === "approved" ? "bg-blue-50 text-blue-700" :
                            pr.status === "rejected" ? "bg-rose-50 text-rose-700" :
                            "bg-emerald-50 text-emerald-700"
                          }`}>{pr.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payout History */}
          {walletOverview?.payouts?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Payout History</h4>
              <div className="space-y-2">
                {walletOverview.payouts.map((p: Payout) => (
                  <div key={p.id} className="flex justify-between items-center py-2.5 border-b border-slate-50 text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">KES {p.amount.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 ml-2">{p.mpesaTransactionId ? `TXN: ${p.mpesaTransactionId}` : ""}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                      p.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}>{p.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transaction History */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Transaction History</h4>
            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-10 shimmer-bg rounded-lg"></div>)}</div>
            ) : walletOverview?.ledger?.length > 0 ? (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {walletOverview.ledger.map((item: LedgerEntry) => (
                  <div key={item.id} className="flex justify-between items-center py-2.5 border-b border-slate-50 text-xs">
                    <div>
                      <span className="font-semibold text-slate-800 capitalize">{item.entryType === "sale" ? "Ticket Sale" : "Payout"}</span>
                      <span className="text-[10px] text-slate-400 ml-2 font-mono">{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-mono font-bold text-sm ${item.entryType === "sale" ? "text-emerald-600" : "text-rose-600"}`}>
                        {item.entryType === "sale" ? "+" : ""}KES {item.grossAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs">No transactions yet.</div>
            )}
          </div>
        </div>
      )}

      {section === "verification" && (
        <div className="space-y-6">
          <div className="max-w-2xl bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${kycStatusColor}`}>
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">KYC Verification</h4>
                <p className="text-xs text-slate-500 mt-1">Verify your business identity to receive payouts.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Business Name</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{organizer?.businessName || "Not set"}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Status</p>
                <p className={`text-sm font-bold mt-0.5 ${
                  organizer?.kycStatus === "verified" ? "text-emerald-600" :
                  organizer?.kycStatus === "rejected" ? "text-rose-600" : "text-amber-600"
                }`}>{kycStatusLabel}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Email</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{organizer?.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Payout Number</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5 font-mono">{organizer?.mpesaPayoutNumber || "Not set"}</p>
              </div>
            </div>

            {organizer?.kycStatus === "verified" ? (
              <div className="bg-emerald-50 text-emerald-700 text-xs p-4 rounded-lg border border-emerald-200 font-medium flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0" /> Your business identity is verified. You can receive payouts.
              </div>
            ) : organizer?.kycStatus === "rejected" ? (
              <div className="bg-rose-50 text-rose-700 text-xs p-4 rounded-lg border border-rose-200 font-medium flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0" /> Verification rejected. Please contact support.
              </div>
            ) : (
              <div className="bg-amber-50 text-amber-700 text-xs p-4 rounded-lg border border-amber-200 font-medium flex items-center gap-2">
                <Clock className="h-5 w-5 shrink-0" /> Verification pending. You will be notified once approved.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
