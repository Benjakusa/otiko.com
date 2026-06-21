import React, { useState, useMemo } from "react";
import { Search, RefreshCw, Layers, Calendar, MapPin } from "lucide-react";
import PublicFooter from "../components/PublicFooter";
import { useAppStore } from "../store/useAppStore";
import PublicBuyFlow from "../components/public-buy-flow";
import { useNavigate } from "react-router-dom";
import { Event } from "../types";

export default function LandingPage() {
  const { events, loading, fetchData } = useAppStore();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const filteredEvents = useMemo(() => {
    return events.filter(evt => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = evt.name?.toLowerCase().includes(query) || evt.venue?.toLowerCase().includes(query);
      if (selectedStatusFilter === "all") return matchesSearch;
      return matchesSearch && evt.status === selectedStatusFilter;
    });
  }, [events, searchQuery, selectedStatusFilter]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] font-sans text-slate-800">
      {/* PUBLIC HEADER */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shadow-sm shrink-0 z-10 w-full">
        <div className="flex items-center">
          <img src="/assets/otikologo.png" alt="Otiko" className="h-7 w-auto" />
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <span className="text-xs font-bold text-slate-600 hidden md:inline">info@otiko.com</span>
          <span className="text-xs font-bold text-slate-600 hidden md:inline">0722839617</span>
          <button
            onClick={() => navigate("/login")}
            className="w-9 h-9 rounded-full bg-red-600 hover:bg-blue-600 hover:text-white hover:scale-105 active:scale-95 text-white flex items-center justify-center transition shadow-sm cursor-pointer"
            title="Event Organizer Workspace"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </button>
        </div>
      </header>

      {/* BODY CONTENT */}
      <div className="flex-1 overflow-y-auto">
        <div className="animate-fade-in flex flex-col min-h-full">
          
          {/* BRAND SEARCH HERO ROW */}
          <div 
            className="relative rounded-2xl overflow-hidden shadow-md bg-cover bg-center min-h-[340px] sm:min-h-[400px] flex items-center justify-center p-6 sm:p-12 text-center mx-4 mt-4"
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80')` }}
          >
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[1px]"></div>
            <div className="max-w-xl w-full relative z-10 flex flex-col items-center justify-center space-y-5">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-md select-none">
                Discover. Book. Attend.
              </h1>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-md drop-shadow select-none">
                The easiest way to find and buy tickets to events near you.
              </p>

              <div className="w-full space-y-3 pt-2">
                <div className="relative w-full">
                  <input
                    type="text"
                    placeholder="Search Nairobi events, festivals, venues..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/10 backdrop-blur-md border border-white/20 focus:border-red-500 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white focus:outline-none transition placeholder:text-slate-300"
                  />
                  <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-300" />
                </div>

                <div className="flex flex-wrap sm:flex-nowrap gap-2 justify-center w-full">
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="bg-red-600/80 backdrop-blur-md text-xs border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none cursor-pointer w-full sm:w-auto"
                  >
                    <option value="all" className="bg-slate-900 text-white">All Events status</option>
                    <option value="active" className="bg-slate-900 text-white">Active Only</option>
                    <option value="past" className="bg-slate-900 text-white">Past Events</option>
                  </select>

                  <button 
                    onClick={fetchData}
                    className="p-3 bg-red-600/80 backdrop-blur-md hover:bg-blue-600 border border-white/20 rounded-xl transition text-slate-200 hover:text-white cursor-pointer"
                    title="Sync Database"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* EVENTS LIST */}
          <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8 flex-1">
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-5">
                Available General Passes ({filteredEvents.length})
              </h3>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={`evt-skeleton-${idx}`} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                      <div className="h-44 shimmer-bg shrink-0"></div>
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2.5">
                          <div className="h-3 shimmer-bg rounded w-1/4"></div>
                          <div className="h-5 shimmer-bg rounded w-3/4"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200/60 p-12 text-center text-slate-500">
                  <Layers className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-xs">No active music festival match. Create event in your dashboard tabs.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredEvents.map((evt) => {
                    const isSoldOut = evt.isSoldOut;
                    const dateText = new Date(evt.eventDate).toLocaleDateString("en-US", {
                      weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                    });

                    return (
                      <div key={evt.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col group hover:shadow-md transition">
                        <div className="relative h-44 bg-slate-900 overflow-hidden shrink-0">
                          <img src={evt.flyerUrl || "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=800"} alt={evt.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                          <div className="absolute top-3 right-3 flex gap-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${evt.status === "active" ? isSoldOut ? "bg-rose-500 text-white" : "bg-emerald-500" : "bg-slate-500"}`}>
                              {evt.status === "active" ? (isSoldOut ? "SOLD OUT" : "ACTIVE") : evt.status.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-1.5">
                            <h4 className="font-bold text-slate-900 leading-tight block group-hover:text-red-600 transition">{evt.name}</h4>
                            <p className="text-neutral-500 text-xs flex items-center gap-1.5 pt-1"><Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" /> {dateText}</p>
                            <p className="text-neutral-500 text-xs flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" /> {evt.venue}</p>
                          </div>

                          <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-semibold">TICKET PRICE</span>
                              <span className="text-sm font-bold text-slate-800 font-mono">KES {evt.minPrice ? evt.minPrice.toLocaleString() : "Contact Venue"}</span>
                            </div>
                            <button
                              onClick={() => setSelectedEvent(evt)}
                              disabled={isSoldOut || evt.status !== "active"}
                              className="bg-red-600 hover:bg-blue-600 hover:text-white text-white text-xs font-semibold py-2 px-4 rounded-lg transition"
                            >
                              {isSoldOut ? "Tickets Depleted" : "Buy Ticket Fast"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          <PublicFooter 
            onOrganizerClick={() => navigate("/login")} 
            onPolicyClick={(section) => navigate("/policies")}
            onCookiePreferencesClick={() => {}}
          />
        </div>
      </div>

      {selectedEvent && (
        <PublicBuyFlow event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}
