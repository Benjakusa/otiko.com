import React from "react";
import { Search, RefreshCw, Layers, Calendar, MapPin } from "lucide-react";
import { Event } from "../types";
import PublicFooter from "../components/PublicFooter";

interface PublicPortalProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedStatusFilter: string;
  setSelectedStatusFilter: (filter: string) => void;
  fetchData: () => void;
  filteredEvents: Event[];
  loading: boolean;
  setSelectedEvent: (event: Event | null) => void;
  setActiveTab: (tab: string) => void;
  setActivePolicyTab: (tab: any) => void;
}

export default function PublicPortal({
  searchQuery,
  setSearchQuery,
  selectedStatusFilter,
  setSelectedStatusFilter,
  fetchData,
  filteredEvents,
  loading,
  setSelectedEvent,
  setActiveTab,
  setActivePolicyTab,
}: PublicPortalProps) {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* BRAND SEARCH HERO ROW */}
      <div className="bg-gradient-to-r from-surface-900 to-surface-800 text-white rounded-2xl p-8 relative overflow-hidden shadow-xl border border-surface-800">
        <div className="max-w-xl relative z-10 space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight">
            Discover. Book. <span className="text-brand-500">Attend.</span>
          </h1>
          <p className="text-sm text-surface-100 leading-relaxed font-medium">
            The easiest way to find and buy tickets to premium events near you.
          </p>

          {/* ACTIVE SEARCH FILTERS */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <div className="relative flex-1 group">
              <input
                id="hero-search-input"
                type="text"
                placeholder="Search Nairobi events, festivals, venues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-950/40 border border-surface-800 focus:border-brand-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-surface-400"
              />
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-surface-400 group-focus-within:text-brand-500 transition-colors" />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => document.getElementById("hero-search-input")?.focus()}
                className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-brand-500/25 active:scale-95 shrink-0"
              >
                <Search className="h-4 w-4" />
                <span>Search</span>
              </button>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-surface-800 text-sm border border-surface-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer hover:bg-surface-700"
              >
                <option value="all">All Events</option>
                <option value="active">Active Only</option>
                <option value="past">Past Events</option>
              </select>

              <button
                onClick={fetchData}
                className="p-3 hover:bg-surface-800 border border-surface-700 rounded-xl transition-all text-surface-300 hover:text-white active:scale-95"
                title="Sync Database"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* VISUAL ACCENT GRADIENT BLOCK */}
        <div className="absolute right-0 bottom-0 top-0 w-1/2 bg-[radial-gradient(ellipse_at_right,_var(--color-brand-600)_0%,_transparent_60%)] opacity-20 pointer-events-none hidden md:block"></div>
      </div>

      {/* EVENT CONCERT GRID */}
      <div>
        <h3 className="text-sm font-bold text-surface-500 uppercase tracking-wider mb-6 flex items-center gap-2">
          Available Passes <span className="bg-surface-200 text-surface-800 px-2 py-0.5 rounded-full text-xs">{filteredEvents.length}</span>
        </h3>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={`evt-skeleton-${idx}`}
                className="bg-white rounded-2xl shadow-sm border border-surface-100 overflow-hidden flex flex-col"
              >
                <div className="h-48 shimmer-bg shrink-0"></div>
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="h-3 shimmer-bg rounded-full w-1/4"></div>
                    <div className="h-6 shimmer-bg rounded-full w-3/4"></div>
                    <div className="space-y-2 pt-2">
                      <div className="h-3 shimmer-bg rounded-full w-1/2"></div>
                      <div className="h-3 shimmer-bg rounded-full w-2/3"></div>
                    </div>
                  </div>
                  <div className="border-t border-surface-100 pt-5 flex items-center justify-between">
                    <div className="space-y-1.5">
                      <div className="h-2.5 shimmer-bg rounded-full w-16"></div>
                      <div className="h-4 shimmer-bg rounded-full w-24"></div>
                    </div>
                    <div className="h-10 shimmer-bg rounded-xl w-32"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-surface-200/60 p-16 text-center text-surface-500 shadow-sm">
            <Layers className="h-12 w-12 text-surface-300 mx-auto mb-4" />
            <p className="text-sm font-medium text-surface-600">No active events found.</p>
            <p className="text-xs text-surface-400 mt-1">Try adjusting your search filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((evt) => {
              const isSoldOut = evt.isSoldOut;
              const dateText = new Date(evt.eventDate).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={evt.id}
                  className="bg-white rounded-2xl shadow-sm border border-surface-100 overflow-hidden flex flex-col group hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="relative h-48 bg-surface-900 overflow-hidden shrink-0">
                    <img
                      src={evt.flyerUrl || "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=800"}
                      alt={evt.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-900/60 to-transparent"></div>
                    <div className="absolute top-4 right-4 flex gap-2">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full text-white backdrop-blur-md shadow-sm ${
                          evt.status === "active"
                            ? isSoldOut
                              ? "bg-rose-500/90"
                              : "bg-emerald-500/90"
                            : "bg-surface-600/90"
                        }`}
                      >
                        {evt.status === "active" ? (isSoldOut ? "SOLD OUT" : "ACTIVE") : evt.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-mono font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded inline-block mb-1">
                        CODE: {evt.eventCode}
                      </span>
                      <h4 className="font-bold text-lg text-surface-900 leading-tight block group-hover:text-brand-600 transition-colors line-clamp-2">
                        {evt.name}
                      </h4>
                      <p className="text-surface-500 text-sm flex items-center gap-2 pt-1 line-clamp-1">
                        <Calendar className="h-4 w-4 shrink-0 text-brand-500" /> {dateText}
                      </p>
                      <p className="text-surface-500 text-sm flex items-center gap-2 line-clamp-1">
                        <MapPin className="h-4 w-4 shrink-0 text-brand-500" /> {evt.venue}
                      </p>
                    </div>

                    <div className="border-t border-surface-100 pt-5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-surface-400 block uppercase font-bold tracking-wider mb-0.5">
                          TICKET PRICE
                        </span>
                        <span className="text-base font-bold text-surface-900 font-mono">
                          KES {evt.minPrice ? evt.minPrice.toLocaleString() : "Contact Venue"}
                        </span>
                      </div>

                      <button
                        onClick={() => setSelectedEvent(evt)}
                        disabled={isSoldOut || evt.status !== "active"}
                        className="bg-surface-900 hover:bg-brand-600 disabled:bg-surface-300 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition-all shadow-sm active:scale-95"
                      >
                        {isSoldOut ? "Depleted" : "Get Tickets"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PUBLIC LANDING GEOLOCATED FOOTER */}
      <PublicFooter
        onOrganizerClick={() => setActiveTab("login")}
        onPolicyClick={(section) => {
          setActivePolicyTab(section);
          setActiveTab("policies");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}
