import React, { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, Users, ShieldCheck, Calendar, Ticket, Wallet,
  UserCircle, BarChart3, Bell, ScrollText, Settings, LogOut,
  Loader2, CheckCircle2, XCircle, ArrowRight, Search, Filter,
  ChevronDown, MoreVertical, Mail, Phone, Trash2, Eye, EyeOff
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { PayoutRequest, Organizer, Event, Ticket as TicketType } from "../types";

const SIDEBAR_ITEMS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "organizers", label: "Organizer Management", icon: Users },
  { key: "verification", label: "Verification Management", icon: ShieldCheck },
  { key: "events", label: "Event Management", icon: Calendar },
  { key: "tickets", label: "Ticket Management", icon: Ticket },
  { key: "payouts", label: "Payments & Payouts", icon: Wallet },
  { key: "users", label: "Users", icon: UserCircle },
  { key: "reports", label: "Reports & Analytics", icon: BarChart3 },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "audit", label: "Audit Logs", icon: ScrollText },
  { key: "settings", label: "Settings", icon: Settings },
  { key: "logout", label: "Logout", icon: LogOut },
];

function renderAccountDetails(pr: PayoutRequest): React.ReactNode {
  try {
    const details = JSON.parse(pr.accountDetails);
    if (pr.paymentMethod === "mpesa") {
      return <span className="font-mono text-[10px]">{details.phoneNumber}</span>;
    }
    if (pr.paymentMethod === "bank") {
      return (
        <div className="text-[10px] leading-tight">
          <div className="font-semibold">{details.bankAccountHolder}</div>
          <div className="text-slate-400">{details.bankName}</div>
          <div className="text-slate-400">A/C: {details.bankAccountNumber}</div>
          <div className="text-slate-400">Branch: {details.bankBranchName || "-"}</div>
        </div>
      );
    }
  } catch {
    // fallback for legacy plain-text accountDetails
  }
  return <span className="text-[10px] font-mono">{pr.accountDetails}</span>;
}

function statusColor(s: string) {
  switch (s) {
    case "pending": return "bg-amber-50 text-amber-700 border-amber-200";
    case "approved": return "bg-blue-50 text-blue-700 border-blue-200";
    case "rejected": return "bg-rose-50 text-rose-700 border-rose-200";
    case "processed": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "active": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "draft": return "bg-slate-50 text-slate-500 border-slate-200";
    case "past": return "bg-slate-50 text-slate-400 border-slate-200";
    case "cancelled": return "bg-rose-50 text-rose-700 border-rose-200";
    case "valid": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "used": return "bg-blue-50 text-blue-700 border-blue-200";
    case "verified": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default: return "bg-slate-50 text-slate-500";
  }
}

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("overview");
  const { token, organizer, logout } = useAppStore();
  const navigate = useNavigate();

  if (activeSection === "logout") {
    logout();
    navigate("/");
    return null;
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)] bg-slate-50">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <img src="/assets/otikologo.png" alt="Otiko" className="h-6 w-auto" />
            <div>
              <p className="text-sm font-bold text-slate-900">Admin Panel</p>
              <p className="text-[10px] text-slate-400">{organizer?.name || "Administrator"}</p>
            </div>
          </div>
        </div>
        <nav className="p-2 space-y-0.5">
          {SIDEBAR_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer text-slate-600 hover:bg-slate-100 ${
                activeSection === item.key ? "bg-slate-100" : ""
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {activeSection === "overview" && <OverviewSection token={token} />}
        {activeSection === "organizers" && <OrganizersSection token={token} />}
        {activeSection === "verification" && <VerificationSection token={token} />}
        {activeSection === "events" && <EventsSection token={token} />}
        {activeSection === "tickets" && <TicketsSection token={token} />}
        {activeSection === "payouts" && <PayoutsSection token={token} />}
        {activeSection === "users" && <UsersSection token={token} />}
        {activeSection === "reports" && <ReportsSection />}
        {activeSection === "notifications" && <NotificationsSection />}
        {activeSection === "audit" && <AuditSection token={token} />}
        {activeSection === "settings" && <SettingsSection />}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  OVERVIEW                                                          */
/* ------------------------------------------------------------------ */
function OverviewSection({ token }: { token: string }) {
  const [stats, setStats] = useState({ organizers: 0, events: 0, tickets: 0, payouts: 0, pendingKyc: 0, pendingPayouts: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [orgRes, evtRes, tktRes, payRes] = await Promise.all([
        fetch("/api/admin/organizers", { credentials: "include", headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/events", { credentials: "include", headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/tickets", { credentials: "include", headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/payout-requests", { credentials: "include", headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const organizers: Organizer[] = orgRes.ok ? await orgRes.json() : [];
      const events: Event[] = evtRes.ok ? await evtRes.json() : [];
      const tickets: TicketType[] = tktRes.ok ? await tktRes.json() : [];
      const payouts: PayoutRequest[] = payRes.ok ? await payRes.json() : [];

      setStats({
        organizers: organizers.length,
        events: events.length,
        tickets: tickets.length,
        payouts: payouts.length,
        pendingKyc: organizers.filter(o => o.kycStatus === "pending").length,
        pendingPayouts: payouts.filter(p => p.status === "pending").length,
        revenue: tickets.length * 1500,
      });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const cards = [
    { label: "Total Organizers", value: stats.organizers, color: "bg-blue-50 text-blue-700 border-blue-200" },
    { label: "Total Events", value: stats.events, color: "bg-purple-50 text-purple-700 border-purple-200" },
    { label: "Total Tickets", value: stats.tickets, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { label: "Pending KYC", value: stats.pendingKyc, color: "bg-amber-50 text-amber-700 border-amber-200" },
    { label: "Pending Payouts", value: stats.pendingPayouts, color: "bg-rose-50 text-rose-700 border-rose-200" },
    { label: "Payout Requests", value: stats.payouts, color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  ];

  if (loading) return <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-xl font-bold text-slate-900">Overview</h3>
        <p className="text-xs text-slate-500">Platform summary at a glance.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(card => (
          <div key={card.label} className={`rounded-xl border p-5 ${card.color}`}>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{card.label}</p>
            <p className="text-3xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ORGANIZER MANAGEMENT                                              */
/* ------------------------------------------------------------------ */
function OrganizersSection({ token }: { token: string }) {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/organizers", { credentials: "include", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setOrganizers(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this organizer? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/organizers/${id}`, { method: "DELETE", credentials: "include", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) fetchData();
    else alert("Failed to delete");
  };

  const filtered = organizers.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.email.toLowerCase().includes(search.toLowerCase()) ||
    o.businessName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Organizer Management</h3>
          <p className="text-xs text-slate-500">{organizers.length} registered organizers.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-red-500 w-56"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No organizers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Business</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">KYC</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{o.name}</td>
                    <td className="py-3 px-4 text-slate-600">{o.businessName}</td>
                    <td className="py-3 px-4 text-slate-500">{o.email}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{o.phone}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${statusColor(o.kycStatus)}`}>{o.kycStatus}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${o.role === "admin" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>{o.role}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => handleDelete(o.id)}
                        className="text-rose-500 hover:text-rose-700 p-1 transition"
                        title="Delete organizer"
                      ><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  VERIFICATION MANAGEMENT (KYC)                                     */
/* ------------------------------------------------------------------ */
function VerificationSection({ token }: { token: string }) {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/organizers", { credentials: "include", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const all: Organizer[] = await res.json();
        setOrganizers(all.filter(o => o.kycStatus === "pending"));
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateKyc = async (id: string, kycStatus: string) => {
    const res = await fetch(`/api/admin/organizers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      credentials: "include",
      body: JSON.stringify({ kycStatus }),
    });
    if (res.ok) fetchData();
    else { const d = await res.json(); alert(d.error || "Failed"); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-xl font-bold text-slate-900">Verification Management</h3>
        <p className="text-xs text-slate-500">{organizers.length} pending KYC requests.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
        ) : organizers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No pending KYC requests.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-4">Organizer</th>
                  <th className="py-3 px-4">Business</th>
                  <th className="py-3 px-4">KRA PIN</th>
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Payout Number</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {organizers.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{o.name}</td>
                    <td className="py-3 px-4 text-slate-600">{o.businessName}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{o.kraPin || "-"}</td>
                    <td className="py-3 px-4">
                      {o.kycDocUrl ? (
                        <a href={o.kycDocUrl} target="_blank" rel="noopener noreferrer"
                          className="text-blue-600 hover:text-red-600 underline text-[10px] font-semibold"
                        >View Document</a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{o.email}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{o.phone}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{o.mpesaPayoutNumber}</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(o.updatedAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => updateKyc(o.id, "verified")}
                          className="bg-red-600 hover:bg-blue-600 hover:text-white text-white border border-red-600 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition flex items-center gap-1"
                        ><CheckCircle2 className="h-3 w-3" /> Verify</button>
                        <button onClick={() => updateKyc(o.id, "rejected")}
                          className="bg-red-600 hover:bg-blue-600 hover:text-white text-white border border-red-600 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition flex items-center gap-1"
                        ><XCircle className="h-3 w-3" /> Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  EVENT MANAGEMENT                                                  */
/* ------------------------------------------------------------------ */
function EventsSection({ token }: { token: string }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/events", { credentials: "include", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setEvents(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (id: string, status: string) => {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify({ status })
      });
    if (res.ok) fetchData();
    else { const d = await res.json(); alert(d.error || "Failed"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event permanently?")) return;
    const res = await fetch(`/api/admin/events/${id}`, { method: "DELETE", credentials: "include", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) fetchData();
    else alert("Failed to delete");
  };

  const filtered = events.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.venue.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Event Management</h3>
          <p className="text-xs text-slate-500">{events.length} total events.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-red-500 w-56"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No events found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Venue</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Categories</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{e.name}</td>
                    <td className="py-3 px-4 text-slate-500">{e.venue}</td>
                    <td className="py-3 px-4 text-slate-500">{new Date(e.eventDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${statusColor(e.status)}`}>{e.status}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{e.categories?.length || 0}</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(e.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <select value={e.status} onChange={ev => updateStatus(e.id, ev.target.value)}
                          className="text-[10px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                        >
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                          <option value="past">Past</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <button onClick={() => handleDelete(e.id)}
                          className="text-rose-500 hover:text-rose-700 p-1 transition"
                          title="Delete event"
                        ><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TICKET MANAGEMENT                                                 */
/* ------------------------------------------------------------------ */
function TicketsSection({ token }: { token: string }) {
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tickets", { credentials: "include", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setTickets(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this ticket? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/tickets/${id}`, { method: "DELETE", credentials: "include", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) fetchData();
    else alert("Failed to delete ticket");
  };

  const filtered = tickets.filter(t =>
    String(t.ticketNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
    String(t.id ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Ticket Management</h3>
          <p className="text-xs text-slate-500">{tickets.length} total tickets.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input type="text" placeholder="Search ticket number..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-red-500 w-56"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No tickets found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-4">Ticket #</th>
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Issued</th>
                  <th className="py-3 px-4">Used</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{t.ticketNumber}</td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500">{t.eventId}</td>
                    <td className="py-3 px-4 text-slate-500">{t.categoryId}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${statusColor(t.status)}`}>{t.status}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{t.issuedAt ? new Date(t.issuedAt).toLocaleDateString() : "-"}</td>
                    <td className="py-3 px-4 text-slate-400">{t.usedAt ? new Date(t.usedAt).toLocaleDateString() : "-"}</td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => handleDelete(t.id)}
                        className="text-rose-500 hover:text-rose-700 p-1 transition"
                        title="Delete ticket"
                      ><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PAYMENTS & PAYOUTS                                                */
/* ------------------------------------------------------------------ */
function PayoutsSection({ token }: { token: string }) {
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [platformBalance, setPlatformBalance] = useState<any>(null);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [processId, setProcessId] = useState<string | null>(null);
  const [confirmationCode, setConfirmationCode] = useState("");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter ? `/api/admin/payout-requests?status=${filter}` : "/api/admin/payout-requests";
      const res = await fetch(url, { credentials: "include", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
        setPlatformBalance(data.platformBalance || null);
      } else { setRequests([]); setPlatformBalance(null); }
    } catch { setRequests([]); setPlatformBalance(null); }
    finally { setLoading(false); }
  }, [token, filter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const doAction = async (id: string, action: "approve" | "reject" | "process", body?: any) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/payout-requests/${id}/${action}`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.ok) {
        fetchRequests();
        if (action === "reject") { setRejectId(null); setRejectReason(""); }
        if (action === "process") { setProcessId(null); setConfirmationCode(""); }
      } else { const d = await res.json(); alert(d.error || "Action failed"); }
    } catch { alert("Network error"); }
    finally { setActionLoading(null); }
  };

  const handleDownloadReceipt = (pr: PayoutRequest) => {
    window.open(`/api/admin/payout-receipt/${pr.id}`, "_blank");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Payments & Payouts</h3>
          <p className="text-xs text-slate-500">Review and process organizer payout requests.</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value="">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="processed">Processed</option>
          </select>
        </div>
      </div>

      {/* Live Balance Panel */}
      {platformBalance && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Available Balance</p>
            <p className={`text-xl font-black font-mono mt-1 ${platformBalance.availableBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              KES {platformBalance.availableBalance.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Net Collected</p>
            <p className="text-xl font-black font-mono mt-1 text-slate-900">KES {platformBalance.netBalance.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Reserved / Pending</p>
            <p className="text-xl font-black font-mono mt-1 text-amber-600">KES {platformBalance.reservedAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Balance After Pending</p>
            <p className={`text-xl font-black font-mono mt-1 ${(platformBalance.availableBalance) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              KES {(platformBalance.availableBalance).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No payout requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Organizer</th>
                  <th className="py-3 px-4">KYC</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {requests.map((pr) => (
                  <tr key={pr.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500">{pr.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{pr.organizerName}</td>
                    <td className="py-3 px-4">
                      {pr.organizerKycStatus === "verified" ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Verified</span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">Not Verified</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">KES {pr.amount.toLocaleString()}</td>
                    <td className="py-3 px-4">{pr.paymentMethod === "mpesa" ? "M-Pesa" : "Bank Transfer"}</td>
                    <td className="py-3 px-4 max-w-[160px]">{renderAccountDetails(pr)}</td>
                    <td className="py-3 px-4 text-slate-500">{new Date(pr.requestedAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${statusColor(pr.status)}`}>{pr.status}</span>
                      {pr.rejectionReason && pr.status === "rejected" && (
                        <div className="text-[10px] text-rose-500 mt-1 max-w-[150px] truncate" title={pr.rejectionReason}>{pr.rejectionReason}</div>
                      )}
                      {pr.processedByName && pr.status === "processed" && (
                        <div className="text-[10px] text-slate-400 mt-1">by {pr.processedByName}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {pr.status === "pending" && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => doAction(pr.id, "approve")} disabled={actionLoading === pr.id}
                            className="bg-red-600 hover:bg-blue-600 hover:text-white text-white border border-red-600 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition flex items-center gap-1 disabled:opacity-50"
                          >
                            {actionLoading === pr.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                            Approve
                          </button>
                          <button onClick={() => setRejectId(rejectId === pr.id ? null : pr.id)}
                            className="bg-red-600 hover:bg-blue-600 hover:text-white text-white border border-red-600 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition flex items-center gap-1"
                          ><XCircle className="h-3 w-3" /> Reject</button>
                        </div>
                      )}
                      {pr.status === "approved" && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => { setProcessId(pr.id); setConfirmationCode(""); }}
                            disabled={actionLoading === pr.id}
                            className="bg-red-600 hover:bg-blue-600 hover:text-white text-white border border-red-600 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition flex items-center gap-1 disabled:opacity-50"
                          >
                            {actionLoading === pr.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
                            Process Payment
                          </button>
                        </div>
                      )}
                      {pr.status === "rejected" && <span className="text-[10px] text-slate-400 italic">No actions</span>}
                      {pr.status === "processed" && (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-[10px] text-emerald-600 font-semibold">Completed</span>
                          <button onClick={() => handleDownloadReceipt(pr)}
                            className="text-slate-400 hover:text-blue-600 transition p-1"
                            title="Download Receipt"
                          ><ArrowRight className="h-3 w-3" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">Reject Payout Request</h4>
            <p className="text-xs text-slate-500">Provide a reason for rejecting this payout request.</p>
            <textarea rows={3} placeholder="Reason for rejection..."
              value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs focus:border-red-500 focus:outline-none"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setRejectId(null); setRejectReason(""); }}
                className="text-xs font-semibold text-slate-600 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
              >Cancel</button>
              <button onClick={() => doAction(rejectId, "reject", { reason: rejectReason || "No reason provided" })}
                disabled={actionLoading === rejectId}
                className="text-xs font-semibold text-white bg-red-600 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {actionLoading === rejectId ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Modal with Confirmation Code */}
      {processId && (
        <div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-5">
            <h4 className="font-bold text-slate-900 text-sm">Process Payout Payment</h4>
            <p className="text-xs text-slate-500">Enter your payment confirmation code to finalize this payout.</p>

            {/* Audit Preview */}
            {platformBalance && (() => {
              const pr = requests.find(r => r.id === processId);
              const balanceAfter = platformBalance.availableBalance - (pr?.amount || 0);
              return (
                <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-xs">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Audit Preview</p>
                  <div className="flex justify-between"><span className="text-slate-500">Available Balance</span><span className={`font-mono font-bold ${platformBalance.availableBalance >= (pr?.amount || 0) ? 'text-emerald-600' : 'text-rose-600'}`}>KES {platformBalance.availableBalance.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Payout Amount</span><span className="font-mono font-bold text-slate-900">- KES {(pr?.amount || 0).toLocaleString()}</span></div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between"><span className="text-slate-700 font-semibold">Balance After</span><span className={`font-mono font-bold ${balanceAfter >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>KES {balanceAfter.toLocaleString()}</span></div>
                  <div className="flex justify-between text-[10px] text-slate-400 pt-1"><span>Processing Admin</span><span className="font-mono">(authenticated)</span></div>
                  <div className="flex justify-between text-[10px] text-slate-400"><span>Timestamp</span><span className="font-mono">{new Date().toLocaleString()}</span></div>
                </div>
              );
            })()}

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-600 uppercase">Payment Confirmation Code</label>
              <input
                type="text"
                required
                placeholder="Enter confirmation code (e.g. MPESA-123456)"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 rounded-lg px-3 py-2.5 text-xs font-mono"
              />
              <p className="text-[10px] text-amber-600">This code will be permanently stored in audit logs.</p>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => { setProcessId(null); setConfirmationCode(""); }}
                className="text-xs font-semibold text-slate-600 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
              >Cancel</button>
              <button
                onClick={() => doAction(processId, "process", { confirmationCode: confirmationCode.trim() })}
                disabled={actionLoading === processId || confirmationCode.trim().length < 3}
                className="text-xs font-semibold text-white bg-red-600 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {actionLoading === processId ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
                Confirm & Process Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  USERS (same as organizers)                                        */
/* ------------------------------------------------------------------ */
function UsersSection({ token }: { token: string }) {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/organizers", { credentials: "include", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setOrganizers(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = organizers.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Users</h3>
          <p className="text-xs text-slate-500">{organizers.length} registered users.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-red-500 w-56"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 text-sm">No users found.</div>
        ) : (
          filtered.map(o => (
            <div key={o.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-600">
                    {o.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{o.name}</p>
                    <p className="text-[10px] text-slate-400">{o.businessName}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${o.role === "admin" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>{o.role}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {o.email}</span>
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {o.phone}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${statusColor(o.kycStatus)}`}>{o.kycStatus}</span>
                <span className="text-[10px] text-slate-400">Joined {new Date(o.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  REPORTS & ANALYTICS (placeholder)                                 */
/* ------------------------------------------------------------------ */
function ReportsSection() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-xl font-bold text-slate-900">Reports & Analytics</h3>
        <p className="text-xs text-slate-500">Platform performance and insights.</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <BarChart3 className="h-12 w-12 mx-auto text-slate-300 mb-3" />
        <p className="text-sm text-slate-400">Reports dashboard coming soon.</p>
        <p className="text-xs text-slate-300 mt-1">Charts and analytics will appear here.</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  NOTIFICATIONS (placeholder)                                       */
/* ------------------------------------------------------------------ */
function NotificationsSection() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-xl font-bold text-slate-900">Notifications</h3>
        <p className="text-xs text-slate-500">Send and manage platform notifications.</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Bell className="h-12 w-12 mx-auto text-slate-300 mb-3" />
        <p className="text-sm text-slate-400">Notification system coming soon.</p>
        <p className="text-xs text-slate-300 mt-1">Broadcast messages and alerts will appear here.</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AUDIT LOGS                                                        */
/* ------------------------------------------------------------------ */
function AuditSection({ token }: { token: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/audit-logs", { credentials: "include", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setLogs(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-xl font-bold text-slate-900">Audit Logs</h3>
        <p className="text-xs text-slate-500">{logs.length} recorded events.</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No audit logs found.</div>
        ) : (
          <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
            {logs.map((log: any) => (
              <div key={log.id} className="px-4 py-3 hover:bg-slate-50/50 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-900 font-medium">{log.action}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{log.details || `${log.entityType} ${log.entityId}`}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-slate-400 font-mono">{new Date(log.createdAt).toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400">{log.actorRole} {log.actorId}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SETTINGS (placeholder)                                            */
/* ------------------------------------------------------------------ */
function SettingsSection() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-xl font-bold text-slate-900">Settings</h3>
        <p className="text-xs text-slate-500">Platform configuration.</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Settings className="h-12 w-12 mx-auto text-slate-300 mb-3" />
        <p className="text-sm text-slate-400">Settings panel coming soon.</p>
        <p className="text-xs text-slate-300 mt-1">Platform-wide configuration options will appear here.</p>
      </div>
    </div>
  );
}
