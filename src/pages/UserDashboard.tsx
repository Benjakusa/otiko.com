import React from "react";
import { Ticket as TicketIcon, Calendar, MapPin, User, LogOut } from "lucide-react";

interface UserDashboardProps {
  onLogout: () => void;
}

export default function UserDashboard({ onLogout }: UserDashboardProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Tickets</h2>
          <p className="text-sm text-slate-500 mt-1">Manage your upcoming event tickets and passes</p>
        </div>
        <button
          onClick={onLogout}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg transition bg-white"
        >
          <LogOut className="h-4 w-4 text-slate-400" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center mt-8">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
          <TicketIcon className="h-8 w-8 text-slate-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">No upcoming events</h3>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          You don't have any tickets for upcoming events. Browse the public portal to discover and book events.
        </p>
      </div>
    </div>
  );
}
