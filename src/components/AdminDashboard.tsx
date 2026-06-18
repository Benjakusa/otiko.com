import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, ArrowRight, Search, Filter, ShieldCheck } from "lucide-react";
import { PayoutRequest } from "../types";

interface AdminDashboardProps {
  token: string;
}

export default function AdminDashboard({ token }: AdminDashboardProps) {
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const url = filter ? `/api/admin/payout-requests?status=${filter}` : "/api/admin/payout-requests";
      const res = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });
      if (res.ok) setRequests(await res.json());
      else setRequests([]);
    } catch { setRequests([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, [filter, token]);

  const doAction = async (id: string, action: "approve" | "reject" | "process", body?: any) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/payout-requests/${id}/${action}`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined
      });
      if (res.ok) { fetchRequests(); if (action === "reject") { setRejectId(null); setRejectReason(""); } }
      else { const d = await res.json(); alert(d.error || "Action failed"); }
    } catch { alert("Network error"); }
    finally { setActionLoading(null); }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "pending": return "bg-amber-50 text-amber-700 border-amber-200";
      case "approved": return "bg-blue-50 text-blue-700 border-blue-200";
      case "rejected": return "bg-rose-50 text-rose-700 border-rose-200";
      case "processed": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default: return "bg-slate-50 text-slate-500";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Withdrawal Management</h3>
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
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">KES {pr.amount.toLocaleString()}</td>
                    <td className="py-3 px-4 capitalize">{pr.paymentMethod}</td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500 max-w-[120px] truncate">{pr.accountDetails}</td>
                    <td className="py-3 px-4 text-slate-500">{new Date(pr.requestedAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${statusColor(pr.status)}`}>{pr.status}</span>
                      {pr.rejectionReason && pr.status === "rejected" && (
                        <div className="text-[10px] text-rose-500 mt-1 max-w-[150px] truncate" title={pr.rejectionReason}>{pr.rejectionReason}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {pr.status === "pending" && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => doAction(pr.id, "approve")} disabled={actionLoading === pr.id}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition flex items-center gap-1 disabled:opacity-50"
                          >
                            {actionLoading === pr.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                            Approve
                          </button>
                          <button onClick={() => setRejectId(rejectId === pr.id ? null : pr.id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition flex items-center gap-1"
                          >
                            <XCircle className="h-3 w-3" /> Reject
                          </button>
                        </div>
                      )}
                      {pr.status === "approved" && (
                        <button onClick={() => doAction(pr.id, "process")} disabled={actionLoading === pr.id}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition flex items-center gap-1 ml-auto disabled:opacity-50"
                        >
                          {actionLoading === pr.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
                          Mark Processed
                        </button>
                      )}
                      {pr.status === "rejected" && (
                        <span className="text-[10px] text-slate-400 italic">No actions</span>
                      )}
                      {pr.status === "processed" && (
                        <span className="text-[10px] text-emerald-600 font-semibold">Completed ✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Reason Modal */}
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
                className="text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 px-4 py-2 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {actionLoading === rejectId ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}