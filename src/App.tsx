/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Building, Calendar, MapPin, Ticket as TicketIcon, Phone, Mail, 
  User, CheckCircle2, AlertTriangle, Loader2, RefreshCw, X, Download, QrCode,
  TrendingUp, Wallet, ShieldCheck, Settings, Plus, Landmark, BarChart3, 
  Layers, Lock, Database, Search, ArrowRight, ScanLine, Clock, Cpu, 
  HelpCircle, Receipt, ExternalLink, HelpCircle as HelpIcon, Sparkles, Menu
} from "lucide-react";
import { Event, Order, Ticket, LedgerEntry, Payout, Organizer } from "./types";
import PublicBuyFlow from "./components/public-buy-flow";
import TicketScannerSim from "./components/ticket-scanner-sim";
import SignupPage from "./components/auth/SignupPage";
import LoginPage from "./components/auth/LoginPage";
import ForgotPasswordPage from "./components/auth/ForgotPasswordPage";
import PublicFooter from "./components/PublicFooter";
import PolicyPages, { PolicySection } from "./components/policies/PolicyPages";

export default function App() {
  // Navigation Tabs state
  // "public" | "dashboard" | "events" | "wallet" | "kyc" | "login" | "signup" | "forgot-password" | "policies"
  const [activeTab, setActiveTab] = useState<"public" | "dashboard" | "events" | "wallet" | "kyc" | "login" | "signup" | "forgot-password" | "policies">("public");
  const [activePolicyTab, setActivePolicyTab] = useState<PolicySection>("refund");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [activeTab]);

  // Authentication Token State
  const [token, setToken] = useState<string>(() => {
    return localStorage.getItem("otiko_auth_token") || "user-default-uid";
  });

  useEffect(() => {
    localStorage.setItem("otiko_auth_token", token);
  }, [token]);


  // App data state
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Organizer details
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [walletOverview, setWalletOverview] = useState<any>(null);

  // New Event Form State
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventVenue, setNewEventVenue] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");
  const [newEventFlyer, setNewEventFlyer] = useState("");
  const [newEventCategories, setNewEventCategories] = useState([
    { name: "Regular Admission", price: "1500", totalQuantity: "1000" },
    { name: "VIP Experience", price: "4000", totalQuantity: "250" }
  ]);

  // Wallet Payout Form State
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);

  // KYC Verification Form
  const [kycBusinessName, setKycBusinessName] = useState("");
  const [kycDocName, setKycDocName] = useState("");
  const [kycSubmitted, setKycSubmitted] = useState(false);



  // Public Search Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");

  // Fetch initial app state
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch events
      const eventsRes = await fetch("/api/events");
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData);
      }

      // 2. Fetch organizer
      const orgRes = await fetch("/api/organizers/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (orgRes.ok) {
        const orgData = await orgRes.json();
        setOrganizer(orgData);
      } else {
        setOrganizer(null);
      }

      // 3. Fetch wallet/finance metrics
      const walletRes = await fetch("/api/wallet/overview", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (walletRes.ok) {
        const walletData = await walletRes.json();
        setWalletOverview(walletData);
      }
    } catch (e) {
      console.error("Error fetching state data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Parse query parameter to auto-open specific shared event
  useEffect(() => {
    if (events.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const eventCode = params.get("event");
      if (eventCode) {
        const matched = events.find(e => e.eventCode === eventCode);
        if (matched) {
          setSelectedEvent(matched);
        }
      }
    }
  }, [events]);

  // Handler: Add Custom Ticket category rows dynamically
  const addCategoryRow = () => {
    setNewEventCategories([
      ...newEventCategories,
      { name: "", price: "", totalQuantity: "" }
    ]);
  };

  const removeCategoryRow = (index: number) => {
    setNewEventCategories(newEventCategories.filter((_, i) => i !== index));
  };

  // Handler: POST Event creation
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName || !newEventDate || !newEventVenue) {
      alert("Please fill event details accurately.");
      return;
    }

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newEventName,
          eventDate: newEventDate,
          venue: newEventVenue,
          description: newEventDesc,
          flyerUrl: newEventFlyer,
          categories: newEventCategories.map(c => ({
            name: c.name,
            price: Number(c.price),
            totalQuantity: Number(c.totalQuantity)
          }))
        })
      });

      if (res.ok) {
        setShowAddEvent(false);
        // Reset form
        setNewEventName("");
        setNewEventDate("");
        setNewEventVenue("");
        setNewEventDesc("");
        setNewEventFlyer("");
        setNewEventCategories([
          { name: "Regular Admission", price: "1500", totalQuantity: "1000" },
          { name: "VIP Experience", price: "4000", totalQuantity: "250" }
        ]);
        fetchData();
        setActiveTab("events");
      } else {
        const error = await res.json();
        alert(error.error || "Failed to finalize new event configuration");
      }
    } catch (err) {
      alert("Connection timeout while compiling credentials.");
    }
  };

  // Handler: Submit Payout Request
  const handlePayoutRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutError(null);
    setPayoutSuccess(null);

    const amt = Number(payoutAmount);
    if (!payoutAmount || isNaN(amt) || amt <= 100) {
      setPayoutError("The minimum checkout payout allocation is KES 100.");
      return;
    }

    setPayoutLoading(true);

    try {
      const res = await fetch("/api/wallet/payout-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ amount: amt })
      });

      const data = await res.json();
      if (!res.ok) {
        setPayoutError(data.error || "Payout processing declined.");
      } else {
        setPayoutSuccess(`Successfully queued payout request of KES ${amt.toLocaleString()} to ${organizer?.mpesaPayoutNumber}. Complete within seconds!`);
        setPayoutAmount("");
        setTimeout(() => fetchData(), 2500);
      }
    } catch (err) {
      setPayoutError("Error contacting secure ledger engine.");
    } finally {
      setPayoutLoading(false);
    }
  };

  // Handler: Submit KYC Details Mock state upload
  const handleKYCUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycBusinessName) return;

    try {
      const res = await fetch("/api/organizers/upload-kyc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        setKycSubmitted(true);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };



  // Safe polling trigger for events grid search filters
  const filteredEvents = events.filter(evt => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = evt.name?.toLowerCase().includes(query) || evt.venue?.toLowerCase().includes(query);
    if (selectedStatusFilter === "all") return matchesSearch;
    return matchesSearch && evt.status === selectedStatusFilter;
  });

  // Hot reservations real-time stats simulated
  const mockReservationMinuteBars = [
    { label: "50m ago", val: 12, redis: true },
    { label: "45m ago", val: 18, redis: true },
    { label: "40m ago", val: 24, redis: true },
    { label: "35m ago", val: 40, redis: true },
    { label: "30m ago", val: 68, redis: true },
    { label: "25m ago", val: 89, redis: true },
    { label: "20m ago", val: 135, redis: true },
    { label: "15m ago", val: 215, redis: true },
    { label: "10m ago", val: 480, redis: true, surge: true },
    { label: "5m ago", val: 860, redis: true, surge: true },
    { label: "Now", val: 1150, redis: true, surge: true },
  ];

  if (activeTab === "login") {
    return (
      <LoginPage
        onBackToHome={() => setActiveTab("public")}
        onSignupNavigate={() => setActiveTab("signup")}
        onForgotPasswordNavigate={() => setActiveTab("forgot-password")}
        onLoginSuccess={(organizerData, uid) => {
          setOrganizer(organizerData);
          setToken(uid);
          setActiveTab("dashboard");
        }}
      />
    );
  }

  if (activeTab === "signup") {
    return (
      <SignupPage
        onBackToHome={() => setActiveTab("public")}
        onLoginNavigate={() => setActiveTab("login")}
        onSignupSuccess={(organizerData) => {
          setOrganizer(organizerData);
          setToken(organizerData.firebaseUid || "user-default-uid");
          setActiveTab("dashboard");
        }}
      />
    );
  }

  if (activeTab === "forgot-password") {
    return (
      <ForgotPasswordPage
        onBackToHome={() => setActiveTab("public")}
        onLoginNavigate={() => setActiveTab("login")}
      />
    );
  }

  if (activeTab === "policies") {
    return (
      <PolicyPages
        activeSection={activePolicyTab}
        onChangeSection={(section) => setActivePolicyTab(section)}
        onBackToHome={() => setActiveTab("public")}
      />
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#F3F4F6] font-sans text-slate-800 overflow-hidden">
      
      {/* SIDEBAR MOBILE BACKDROP */}
      {!["public", "login", "signup", "forgot-password", "policies"].includes(activeTab) && mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* 1. SIDEBAR NAVIGATION - MATCHES CLEAN MINIMALISM LAYOUT (ONLY ON WORKSPACE TABS) */}
      {!["public", "login", "signup", "forgot-password", "policies"].includes(activeTab) && (
        <aside className={`bg-[#0F172A] flex flex-col h-full border-r border-slate-800 shrink-0 text-slate-300 transition-all duration-300 z-50
          fixed inset-y-0 left-0 w-64 md:relative md:inset-auto md:translate-x-0
          ${mobileSidebarOpen ? "translate-x-0 animate-fade-in" : "-translate-x-full"}
          md:w-20 lg:w-64`}
        >
          
          {/* BRAND HEADER */}
          <div className="p-6 flex items-center justify-center lg:justify-start gap-3 border-b border-slate-800/60 pb-5">
            <div className="w-8 h-8 bg-red-650 rounded flex items-center justify-center font-bold text-white text-base shrink-0">
              O
            </div>
            <div className="md:hidden lg:block">
              <h1 className="text-lg font-bold text-white tracking-tight leading-none">Otiko<span className="text-red-500">.com</span></h1>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block mt-1">Safaricom Direct</span>
            </div>
          </div>

          {/* TABS SELECTION NAV */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            
            <div className="px-3 mb-2 md:text-center lg:text-left">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest md:hidden lg:inline">Buyer Viewports</span>
            </div>
            <button 
              onClick={() => setActiveTab("public")} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all md:justify-center lg:justify-start ${
                activeTab === "public" 
                  ? "bg-slate-800 text-white shadow-sm font-semibold" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
              title="otiko.com (Public)"
            >
              <Search className="h-4 w-4 text-red-500 shrink-0" />
              <span className="md:hidden lg:inline">otiko.com (Public)</span>
            </button>

            <div className="px-3 pt-6 mb-2 md:text-center lg:text-left">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest md:hidden lg:inline">Organizer Workspace</span>
            </div>

            <button 
              onClick={() => setActiveTab("dashboard")} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all md:justify-center lg:justify-start ${
                activeTab === "dashboard" 
                  ? "bg-slate-800 text-white shadow-sm font-semibold" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
              title="Dashboard Core"
            >
              <BarChart3 className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="md:hidden lg:inline">Dashboard Core</span>
            </button>

            <button 
              onClick={() => setActiveTab("events")} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all md:justify-center lg:justify-start ${
                activeTab === "events" 
                  ? "bg-slate-800 text-white shadow-sm font-semibold" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
              title="Manage Events"
            >
              <Layers className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="md:hidden lg:inline">Manage Events</span>
            </button>

            <button 
              onClick={() => setActiveTab("wallet")} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all md:justify-center lg:justify-start ${
                activeTab === "wallet" 
                  ? "bg-slate-800 text-white shadow-sm font-semibold" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
              title="Wallet & Balance"
            >
              <Wallet className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="md:hidden lg:inline">Wallet & Balance</span>
            </button>

            <button 
              onClick={() => setActiveTab("kyc")} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all md:justify-center lg:justify-start ${
                activeTab === "kyc" 
                  ? "bg-slate-800 text-white shadow-sm font-semibold" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
              title="KYC Verification"
            >
              <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="md:hidden lg:inline">KYC Verification</span>
            </button>

            {/* GATE VALIDATOR MANUAL LAUNCHER */}
            <div className="pt-6 px-1 lg:px-3">
              <button
                onClick={() => setShowScanner(true)}
                className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 text-xs font-semibold py-2.5 px-2 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer"
                title="Scan Ticket QR"
              >
                <ScanLine className="h-4 w-4 shrink-0" />
                <span className="md:hidden lg:inline">Scan Ticket QR</span>
              </button>
            </div>
          </nav>

          {/* SYSTEM STATUS WIDGET */}
          <div className="p-4 mt-auto border-t border-slate-800 bg-[#0c1222] md:hidden lg:block text-slate-400">
            <div className="flex items-center gap-3 px-3 py-1 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
              System Status
            </div>
            <div className="px-3 py-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Operational Mode
              </div>
              <div className="flex justify-between items-center mt-1.5">
                <p className="text-[9px] text-slate-500 uppercase">API Latency: 42ms</p>
                <p className="text-[9px] text-orange-500 uppercase font-mono">REDIS ACTIVE</p>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* 2. MAIN HUB CONTENT CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* CONDITIONAL PLATFORM TOPHEADER / NAVBAR */}
        {activeTab === "public" ? (
          <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shadow-sm shrink-0 z-10 w-full">
            {/* 1. LOGO */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-650 rounded flex items-center justify-center font-bold text-white text-base shadow-sm">
                O
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-slate-900 leading-none flex items-center gap-1">
                  Otiko<span className="text-red-500 font-bold">.com</span>
                </h1>
              </div>
            </div>

            {/* 2. ACTIONS AND DETAILS (CONTACTS, PROFILE) */}
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Contact Information - Email Plain Text */}
              <span className="text-xs font-bold text-slate-600 hidden md:inline">
                info@otiko.com
              </span>

              {/* Contact Information - Phone Number Plain Text */}
              <span className="text-xs font-bold text-slate-600 hidden md:inline">
                0722839617
              </span>

              {/* Profile icon to open event organizers sign-up/sign-in portal */}
              <button
                onClick={() => {
                  setActiveTab("login");
                }}
                className="w-9 h-9 rounded-full bg-[#0F172A] hover:bg-red-650 hover:scale-105 active:scale-95 text-white flex items-center justify-center transition shadow-sm cursor-pointer"
                title="Event Organizer Workspace"
              >
                <User className="h-4.5 w-4.5 text-white" />
              </button>
            </div>
          </header>
        ) : (
          <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shadow-sm shrink-0 z-10">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger menu toggle */}
              <button
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                className="p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden transition cursor-pointer"
                title="Toggle Sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>

              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5 select-none">
                <span className="xs:hidden sm:inline">Otiko Workspace</span>
                <span className="sm:hidden">Workspace</span>
                <span className="text-slate-400 font-normal text-xs ml-2 hidden lg:inline">
                  / admin.otiko.com
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setActiveTab("public")}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-1.5 sm:px-2.5 sm:py-1.5 border border-slate-200 hover:border-slate-300 rounded-lg transition bg-white cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                <span className="hidden xs:inline">Exit Workspace</span>
              </button>

              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-tight">{organizer?.businessName || "Solfest Ltd"}</p>
                <p className="text-[10px] text-emerald-600 font-semibold uppercase flex items-center justify-end gap-1 mt-0.5">
                  KYC STATUS: {organizer?.kycStatus === "verified" ? "Verified ✓" : "Pending Approval ◷"}
                </p>
              </div>
              
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                SF
              </div>
            </div>
          </header>
        )}

        {/* INNER SCROLLABLE PANEL */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#F3F4F6] space-y-8">
          
          {/* ==================================== TAB 1: PUBLIC BUYER PORTAL ==================================== */}
          {activeTab === "public" && (
            <div className="space-y-8 animate-fade-in">
              
              {/* BRAND SEARCH HERO ROW */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-8 relative overflow-hidden shadow-md">
                <div className="max-w-xl relative z-10 space-y-4">

                  <h1 className="text-3xl font-extrabold tracking-tight">
                    Discover. Book. Attend.
                  </h1>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    The easiest way to find and buy tickets to events near you.
                  </p>

                  {/* ACTIVE SEARCH FILTERS */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <div className="relative flex-1">
                      <input
                        id="hero-search-input"
                        type="text"
                        placeholder="Search Nairobi events, festivals, venues..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/10 border border-white/10 focus:border-red-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none transition placeholder:text-slate-400"
                      />
                      <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const el = document.getElementById("hero-search-input");
                          if (el) el.focus();
                        }}
                        className="bg-red-650 hover:bg-red-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer shrink-0"
                      >
                        <Search className="h-4 w-4" />
                        <span>Search</span>
                      </button>

                      <select
                        value={selectedStatusFilter}
                        onChange={(e) => setSelectedStatusFilter(e.target.value)}
                        className="bg-slate-800 text-xs border border-white/10 rounded-xl px-3 py-2.5 text-white bg-no-repeat focus:outline-none"
                      >
                        <option value="all">All Events status</option>
                        <option value="active">Active Only</option>
                        <option value="past">Past Events</option>
                      </select>

                      <button 
                        onClick={fetchData}
                        className="p-2.5 hover:bg-slate-800 border border-white/10 rounded-xl transition text-slate-300 hover:text-white"
                        title="Sync Database"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* VISUAL ACCENT GRADIENT BLOCK */}
                <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial-gradient from-red-600/20 to-transparent pointer-events-none hidden md:block"></div>
              </div>

              {/* EVENT CONCERT GRID */}
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-5">
                  Available General Passes ({filteredEvents.length})
                </h3>

                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div 
                        key={`evt-skeleton-${idx}`} 
                        className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col"
                      >
                        <div className="h-44 shimmer-bg shrink-0"></div>
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-2.5">
                            <div className="h-3 shimmer-bg rounded w-1/4"></div>
                            <div className="h-5 shimmer-bg rounded w-3/4"></div>
                            <div className="space-y-1.5 pt-1.5">
                              <div className="h-3 shimmer-bg rounded w-1/2"></div>
                              <div className="h-3 shimmer-bg rounded w-2/3"></div>
                            </div>
                          </div>
                          <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="h-2.5 shimmer-bg rounded w-16"></div>
                              <div className="h-4 shimmer-bg rounded w-24"></div>
                            </div>
                            <div className="h-8 shimmer-bg rounded-lg w-28"></div>
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
                      const eventDetailsUrl = `/api/events/${evt.eventCode}`;
                      const isSoldOut = evt.isSoldOut;
                      const dateText = new Date(evt.eventDate).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      });

                      return (
                        <div 
                          key={evt.id} 
                          className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col group hover:shadow-md transition"
                        >
                          <div className="relative h-44 bg-slate-900 overflow-hidden shrink-0">
                            <img
                              src={evt.flyerUrl || "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=800"}
                              alt={evt.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <div className="absolute top-3 right-3 flex gap-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${
                                evt.status === "active" 
                                  ? isSoldOut ? "bg-rose-500 text-white" : "bg-emerald-500" 
                                  : "bg-slate-500"
                              }`}>
                                {evt.status === "active" ? (isSoldOut ? "SOLD OUT" : "ACTIVE") : evt.status.toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                            <div className="space-y-1.5">
                              <span className="text-[10px] uppercase font-mono font-bold text-red-650 block">
                                CODE: {evt.eventCode}
                              </span>
                              <h4 className="font-bold text-slate-900 leading-tight block group-hover:text-red-600 transition">
                                {evt.name}
                              </h4>
                              <p className="text-neutral-500 text-xs flex items-center gap-1.5 pt-1 line-clamp-1">
                                <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" /> {dateText}
                              </p>
                              <p className="text-neutral-500 text-xs flex items-center gap-1.5 line-clamp-1">
                                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" /> {evt.venue}
                              </p>
                            </div>

                            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-slate-400 block uppercase font-semibold">TICKET PRICE</span>
                                <span className="text-sm font-bold text-slate-800 font-mono">
                                  KES {evt.minPrice ? evt.minPrice.toLocaleString() : "Contact Venue"}
                                </span>
                              </div>
                              
                              <button
                                onClick={() => setSelectedEvent(evt)}
                                disabled={isSoldOut || evt.status !== "active"}
                                className="bg-[#0F172A] hover:bg-red-600 text-white text-xs font-semibold py-2 px-4 rounded-lg group-hover:bg-red-600 transition"
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
          )}

          {/* ==================================== TAB 2: ORGANIZER DASHBOARD CORE ==================================== */}
          {activeTab === "dashboard" && (
            <div className="space-y-8 animate-fade-in">
              
              {/* SUB HEADER INTRO */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Platform Performance</h3>
                  <p className="text-xs text-slate-500">Atomic inventory and Safaricom callback status check.</p>
                </div>
                
                <button
                  onClick={() => setShowAddEvent(true)}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition shadow-sm"
                >
                  <Plus className="h-4 w-4" /> Create New Event
                </button>
              </div>

              {/* 4 CORE METRIC CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-start">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Total Tickets Sold
                    </p>
                    <TicketIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-2xl font-bold mt-1 text-slate-900">
                    {walletOverview?.ledger ? walletOverview.payouts.length + 3122 : 3122}
                  </p>
                  <div className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    +12.4% vs last week
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-start">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Gross Collected Receipts
                    </p>
                    <TrendingUp className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-2xl font-bold mt-1 text-slate-900 font-mono">
                    KES {walletOverview?.grossCollected ? walletOverview.grossCollected.toLocaleString() : "12,000"}
                  </p>
                  <div className="text-[10px] text-slate-400 font-mono mt-2 uppercase">
                    Platform Fees Paid: KES {walletOverview?.platformFees || "600"}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-start">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Active Reservations
                    </p>
                    <Clock className="h-4 w-4 text-red-500" />
                  </div>
                  <p className="text-2xl font-bold mt-1 text-slate-900">
                    8,402
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="text-[11px] text-red-600 font-semibold uppercase">High Traffic Window</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-start">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      M-Pesa Conv. Rate
                    </p>
                    <Cpu className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold mt-1 text-slate-900">
                    98.2%
                  </p>
                  <div className="text-[10px] text-emerald-600 font-bold mt-2 uppercase bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                    Webhook Success: 100%
                  </div>
                </div>
              </div>

              {/* MAIN METRIC GRAPH - RESERVATIONS PER MINUTE */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                      Safe High-Load Reservations / Minute Capacity Simulation
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Tested spikes simulating up to 100,000 reservations globally without double-booking.
                    </p>
                  </div>
                  
                  <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <span className="w-2.5 h-2.5 bg-slate-400 rounded-sm"></span>
                      POSTGRES DB ID
                    </div>
                    <div className="flex items-center gap-1.5 text-red-600">
                      <span className="w-2.5 h-2.5 bg-red-600 rounded-sm"></span>
                      REDIS DECR LOCKS
                    </div>
                  </div>
                </div>

                {/* GRAPH HEIGHT REPRESENTATION */}
                <div className="h-64 flex items-end gap-2.5 border-b border-slate-100 pb-5 mb-5 px-3">
                  {mockReservationMinuteBars.map((bar, i) => {
                    const pct = Math.min(100, (bar.val / 1150) * 100);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                        {/* Hover values tooltip */}
                        <div className="absolute -top-10 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-mono py-1 px-2 rounded tracking-tight pointer-events-none transition duration-150 z-20 shadow">
                          {bar.val} req/s
                        </div>

                        <div 
                          style={{ height: `${pct}%` }}
                          className={`w-full rounded-t-md transition-all duration-500 relative ${
                            bar.surge 
                              ? "bg-gradient-to-t from-red-600 to-red-400" 
                              : "bg-slate-300 group-hover:bg-slate-400"
                          }`}
                        >
                          {bar.surge && (
                            <div className="absolute top-0 left-0 w-full h-1 bg-white rounded-t-md opacity-60"></div>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono font-bold shrink-0">{bar.label}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed text-slate-500">
                  <div className="space-y-1">
                    <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Cpu className="h-4 w-4 text-red-500" />
                      Hot-Event Redis Counter Synchronization
                    </h5>
                    <p className="text-[11px]">
                      High-demand categories are mirrored into memory on Cloud MemoryStore/Redis. Clients hit <code>DECR</code> on Redis first before entering postgres transaction, preventing scale lock-contention.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Database className="h-4 w-4 text-indigo-500" />
                      Atomic Multi-Seat Decrement Rule
                    </h5>
                    <p className="text-[11px]">
                      Executed via single raw database check: <code>UPDATE ticket_categories SET remaining = remaining - N WHERE id = X AND remaining &gt;= N</code>. No server-side thread mutex locking is needed.
                    </p>
                  </div>
                </div>

              </div>

              {/* BOTTOM TWO COLUMNS METRICS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. INFRASTRUCTURE SYSTEMS CHECKLIST */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-1 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Subsystem Infrastructure
                  </h4>

                  <div className="space-y-3 font-mono text-xs text-slate-700">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-500 font-bold uppercase font-sans">PgBouncer Active Pool</span>
                      <span className="text-xs font-bold font-mono text-slate-800 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                        142 / 200
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-500 font-bold uppercase font-sans">M-Pesa Webhook</span>
                      <span className="text-xs font-bold font-mono text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                        HEALTHY
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-500 font-bold uppercase font-sans">Celery Sweeper Lag</span>
                      <span className="text-xs font-bold font-mono text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                        0.1s lagging
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-500 font-bold uppercase font-sans">GCS Ticket Backups</span>
                      <span className="text-xs font-bold font-mono text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                        1.4 GB
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 text-center leading-normal">
                    Dockerized micro-compose automatically partitions load patterns globally. Configured for autoscale in Cloud Run.
                  </p>
                </div>

                {/* 2. RECENT COMPILATION TRANSACTIONS / ORDERS */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Ledger Order Activities
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Live Updates</span>
                  </div>

                  <div className="space-y-1 overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[500px] md:min-w-0">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                          <th className="py-2">Attendee / Buyer</th>
                          <th className="py-2">Tickets</th>
                          <th className="py-2">Amount Paid</th>
                          <th className="py-2 text-right">Status State</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-slate-700">
                        {loading ? (
                          Array.from({ length: 3 }).map((_, idx) => (
                            <tr key={`ledger-order-skeleton-${idx}`}>
                              <td className="py-3">
                                <div className="h-4 shimmer-bg rounded w-28"></div>
                              </td>
                              <td className="py-3">
                                <div className="h-4 shimmer-bg rounded w-32"></div>
                              </td>
                              <td className="py-3">
                                <div className="h-4 shimmer-bg rounded w-20"></div>
                              </td>
                              <td className="py-3 text-right">
                                <div className="inline-block h-5 shimmer-bg rounded w-16"></div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <>
                            <tr className="hover:bg-slate-50/50">
                              <td className="py-3 font-semibold text-slate-900">Kamau Njoroge</td>
                              <td className="py-3 text-slate-500">2 × VIP Lounge</td>
                              <td className="py-3 font-mono font-semibold">KES 12,000</td>
                              <td className="py-3 text-right">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 inline-block uppercase">
                                  PAID
                                </span>
                              </td>
                            </tr>
                            <tr className="hover:bg-slate-50/50">
                              <td className="py-3 font-semibold text-slate-900">Sarah Wanjiru</td>
                              <td className="py-3 text-slate-500">4 × General Admission</td>
                              <td className="py-3 font-mono font-semibold">KES 14,000</td>
                              <td className="py-3 text-right">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100 inline-block uppercase">
                                  PENDING
                                </span>
                              </td>
                            </tr>
                            <tr className="hover:bg-slate-50/50 text-slate-400">
                              <td className="py-3 font-semibold text-slate-500">John Amolo</td>
                              <td className="py-3">1 × Golden Circle</td>
                              <td className="py-3 font-mono">KES 15,000</td>
                              <td className="py-3 text-right">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100 inline-block uppercase">
                                  EXPIRED
                                </span>
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-normal bg-slate-50 p-3 rounded-lg border border-slate-100 font-sans">
                    <strong>Note:</strong> Completed transactions are immediately pushed into the append-only Ledger ledger file. Update or edit requests to past payments is restricted on the Postgres schema role level.
                  </p>
                </div>

              </div>

            </div>
          )}

          {/* ==================================== TAB 3: MANAGE EVENTS & NEW EVENT FORM ==================================== */}
          {activeTab === "events" && (
            <div className="space-y-8 animate-fade-in">
              
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Registered Events Vault</h3>
                  <p className="text-xs text-slate-500">Edit ticket allocations or add category passes.</p>
                </div>

                <button
                  onClick={() => setShowAddEvent(!showAddEvent)}
                  className="bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center gap-2 transition"
                >
                  {showAddEvent ? "Hide form" : <><Plus className="h-4 w-4" /> Add Custom Event</>}
                </button>
              </div>

              {/* NEW EVENT FORM PRESET DRAWER */}
              {showAddEvent && (
                <form onSubmit={handleCreateEvent} className="bg-white rounded-xl border border-slate-200/80 p-6 space-y-6 animate-slide-up">
                  <div className="border-b border-slate-100 pb-3">
                    <h4 className="font-bold text-slate-900 text-sm uppercase">Generate Official Ticket Pass Release Form</h4>
                    <p className="text-xs text-slate-400 mt-1">This registers event criteria on database sequence codes.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase">Event Title Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sauti Sol Homecoming Live"
                        value={newEventName}
                        onChange={(e) => setNewEventName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-lg px-4 py-2.5 text-xs text-slate-800 focus:outline-none transition font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase">Concert Date / Timing</label>
                      <input
                        type="datetime-local"
                        required
                        value={newEventDate}
                        onChange={(e) => setNewEventDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-lg px-4 py-2.5 text-xs text-slate-800 focus:outline-none transition font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase">Venue Physical Location</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Nyayo National Stadium, Nairobi"
                        value={newEventVenue}
                        onChange={(e) => setNewEventVenue(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-lg px-4 py-2.5 text-xs text-slate-800 focus:outline-none transition font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase">Poster Image Link Url</label>
                      <input
                        type="url"
                        placeholder="e.g. https://images.unsplash.com/photo-..."
                        value={newEventFlyer}
                        onChange={(e) => setNewEventFlyer(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-lg px-4 py-2.5 text-xs text-slate-800 focus:outline-none transition font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Concert Description Notes</label>
                    <textarea
                      placeholder="Specify important age limitations, parking structures, and list main African artists."
                      rows={3}
                      value={newEventDesc}
                      onChange={(e) => setNewEventDesc(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-lg p-4 text-xs text-slate-800 focus:outline-none transition font-sans"
                    ></textarea>
                  </div>

                  {/* TICKET CATEGORIES ROWS SPECIFIER */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-t border-slate-100 pt-5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Allocated Ticket Ranges / Prices (Numeric Decimal core)
                      </label>
                      <button
                        type="button"
                        onClick={addCategoryRow}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs py-1.5 px-3 rounded-lg flex items-center gap-1 transition"
                      >
                        + Add Category Pass Group
                      </button>
                    </div>

                    <div className="space-y-3">
                      {newEventCategories.map((cat, i) => (
                        <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 items-end">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Pass Name</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. VVIP Lounge"
                              value={cat.name}
                              onChange={(e) => {
                                const copy = [...newEventCategories];
                                copy[i].name = e.target.value;
                                setNewEventCategories(copy);
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Price (KES)</label>
                            <input
                              type="number"
                              required
                              placeholder="e.g. 5000"
                              value={cat.price}
                              onChange={(e) => {
                                const copy = [...newEventCategories];
                                copy[i].price = e.target.value;
                                setNewEventCategories(copy);
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                            />
                          </div>

                          <div className="flex gap-2 items-center">
                            <div className="space-y-1 flex-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Total Tickets Available</label>
                              <input
                                type="number"
                                required
                                placeholder="e.g. 150"
                                value={cat.totalQuantity}
                                onChange={(e) => {
                                  const copy = [...newEventCategories];
                                  copy[i].totalQuantity = e.target.value;
                                  setNewEventCategories(copy);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                              />
                            </div>
                            
                            {newEventCategories.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeCategoryRow(i)}
                                className="text-rose-500 hover:bg-rose-100 p-2 rounded-lg transition"
                                title="Remove level"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-5 flex justify-end gap-3">
                    <button
                       type="button"
                      onClick={() => setShowAddEvent(false)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 px-5 rounded-lg transition"
                    >
                      Dismiss Form
                    </button>
                    <button
                      type="submit"
                      className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2.5 px-6 rounded-lg transition"
                    >
                      Compile & Active Tickets Sale
                    </button>
                  </div>
                </form>
              )}

              {/* LIST OF REGISTERED VAULT EVENTS */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[650px] lg:min-w-0">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold text-[10px]">
                        <th className="py-3">Event Code</th>
                        <th className="py-3">Title Name</th>
                        <th className="py-3">Physical Venue</th>
                        <th className="py-3 text-right">Categories Summary</th>
                        <th className="py-3 text-right font-medium">Status State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-700">
                      {loading ? (
                        Array.from({ length: 4 }).map((_, idx) => (
                          <tr key={`evt-tbl-skeleton-${idx}`}>
                            <td className="py-4">
                              <div className="h-4 shimmer-bg rounded w-16"></div>
                            </td>
                            <td className="py-4 space-y-2">
                              <div className="h-4 shimmer-bg rounded w-44"></div>
                              <div className="h-3 shimmer-bg rounded w-24"></div>
                            </td>
                            <td className="py-4">
                              <div className="h-4 shimmer-bg rounded w-32"></div>
                            </td>
                            <td className="py-4 text-right space-y-1.5 flex flex-col items-end pt-5">
                              <div className="h-3 shimmer-bg rounded w-28"></div>
                              <div className="h-3 shimmer-bg rounded w-20"></div>
                            </td>
                            <td className="py-4 text-right">
                              <div className="inline-block h-5 shimmer-bg rounded w-16"></div>
                            </td>
                          </tr>
                        ))
                      ) : events.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                            No registered events found. Create a custom event above.
                          </td>
                        </tr>
                      ) : (
                        events.map((evt) => (
                          <tr key={evt.id} className="hover:bg-slate-50/50">
                            <td className="py-4 font-mono font-bold text-slate-900">{evt.eventCode}</td>
                            <td className="py-4">
                              <div className="font-semibold text-slate-900">{evt.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Date: {new Date(evt.eventDate).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="py-4 text-slate-500">{evt.venue}</td>
                            <td className="py-4 text-right">
                              {evt.categories?.map((cat) => (
                                <div key={cat.id} className="text-[10px] text-slate-600 font-mono mt-0.5">
                                  {cat.name}: <span className="font-bold text-slate-900">{cat.remainingQuantity} / {cat.totalQuantity} Left</span>
                                </div>
                              ))}
                            </td>
                            <td className="py-4 text-right">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 inline-block uppercase">
                                {evt.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ==================================== TAB 4: WALLET & FINANCE LEDGER ==================================== */}
          {activeTab === "wallet" && (
            <div className="space-y-8 animate-fade-in">
              
              <div>
                <h3 className="text-xl font-bold text-slate-900">Wallet Receipts Ledger</h3>
                <p className="text-xs text-slate-500">Append-only cashout auditing with 5% Platform fees allocation.</p>
              </div>

              {/* DYNAMIC METRICS FOR ORGANIZER FINANCES */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Total Sales Revenue</span>
                  <div className="text-3xl font-bold text-slate-900 font-mono mt-2">
                    KES {walletOverview?.grossCollected ? walletOverview.grossCollected.toLocaleString() : "12,000"}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 font-mono">Platform Margin Split: KES {walletOverview?.platformFees || "600"}</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Withdrawn / Requested</span>
                  <div className="text-3xl font-bold text-slate-900 font-mono mt-2">
                    KES {walletOverview?.payouts ? walletOverview.payouts.reduce((sum: number, p: any) => sum + p.amount, 0).toLocaleString() : "0"}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">Simulated instant payout gateway transactions</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm relative overflow-hidden bg-gradient-to-br from-emerald-500/5 to-transparent">
                  <span className="text-[10px] text-emerald-600 block uppercase font-bold tracking-wider">Available Balance Sweep</span>
                  <div className="text-3xl font-bold text-emerald-800 font-mono mt-2">
                    KES {walletOverview?.availableBalance ? walletOverview.availableBalance.toLocaleString() : "11,400"}
                  </div>
                  <p className="text-[10px] text-emerald-600 mt-2 font-semibold">Ready for Daraja payout sweep ✓</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                
                {/* PAYOUT REQUEST PANEL */}
                <div className="bg-white p-6 rounded-xl border border-slate-200/80 lg:col-span-2 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h4 className="font-bold text-slate-900 text-sm uppercase">Request Direct Wallet Cashout</h4>
                    <p className="text-xs text-slate-400 mt-1">Transfers profits securely to payout number via Safaricom B2C.</p>
                  </div>

                  <form onSubmit={handlePayoutRequest} className="space-y-4">
                    {payoutError && (
                      <div className="bg-rose-50 text-rose-600 text-xs p-3 rounded-lg border border-rose-150">
                        {payoutError}
                      </div>
                    )}
                    {payoutSuccess && (
                      <div className="bg-emerald-50 text-emerald-600 text-xs p-3 rounded-lg border border-emerald-150 font-medium">
                        {payoutSuccess}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase">Registered Mobile Number</label>
                      <input
                        type="text"
                        disabled
                        value={organizer?.mpesaPayoutNumber || "254712345678"}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg px-3 py-2 text-xs text-slate-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase">Withdrawal Amount (KES)</label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          placeholder="e.g. 5000"
                          value={payoutAmount}
                          onChange={(e) => setPayoutAmount(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-lg pl-12 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none transition font-mono font-bold"
                        />
                        <span className="absolute left-3.5 top-3 text-[11px] font-mono text-slate-400 font-semibold">KES</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={payoutLoading || !payoutAmount}
                      className="w-full bg-slate-900 hover:bg-red-600 text-white font-semibold py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-1.5"
                    >
                      {payoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                      Approve Payout Sweep
                    </button>
                  </form>
                </div>

                {/* LEDGER ARCHIVES APPEND-ONLY TABLE */}
                <div className="bg-white p-6 rounded-xl border border-slate-250 lg:col-span-3 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h4 className="font-bold text-slate-900 text-sm uppercase">Audit Ledger Records</h4>
                    <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">
                      REVOCATION: UPDATE RESTRICTED
                    </span>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {loading || !walletOverview ? (
                      Array.from({ length: 4 }).map((_, idx) => (
                        <div key={`ledger-skeleton-${idx}`} className="flex justify-between items-center py-3 border-b border-slate-100">
                          <div className="space-y-2">
                            <div className="h-4 shimmer-bg rounded w-48"></div>
                            <div className="h-3 shimmer-bg rounded w-32"></div>
                          </div>
                          <div className="text-right space-y-2">
                            <div className="h-4 shimmer-bg rounded w-20 ml-auto"></div>
                            <div className="h-2.5 shimmer-bg rounded w-12 ml-auto"></div>
                          </div>
                        </div>
                      ))
                    ) : walletOverview.ledger && walletOverview.ledger.length > 0 ? (
                      walletOverview.ledger.map((item: LedgerEntry) => (
                        <div key={item.id} className="flex justify-between items-center py-2.5 border-b border-slate-100 text-xs">
                          <div>
                            <div className="font-semibold text-slate-800 capitalize">
                              {item.entryType === "sale" ? "Concert Ticket Sale Receipts Office" : "B2C Profit Payout"}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              ID: {item.id} • {new Date(item.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`font-mono font-bold text-[13px] ${item.entryType === "sale" ? "text-slate-900" : "text-rose-600"}`}>
                              {item.entryType === "sale" ? "+" : ""}KES {item.grossAmount.toLocaleString()}
                            </span>
                            {item.platformFee > 0 && (
                              <div className="text-[10px] text-slate-400">Fee Split: 5%</div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-slate-400 text-xs">
                        No transactions registered yet. Secure tickets via the public gate viewport.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ==================================== TAB 5: KYC IDENTIFICATION UPLOAD ==================================== */}
          {activeTab === "kyc" && (
            <div className="space-y-8 animate-fade-in">
              
              <div>
                <h3 className="text-xl font-bold text-slate-900">KYC Verification Centre</h3>
                <p className="text-xs text-slate-500">Verify your enterprise identity to withdraw payments through B2C safely.</p>
              </div>

              <div className="max-w-2xl bg-white rounded-xl border border-slate-205 p-6 space-y-6">
                
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Legal Business Onboarding Checks</h4>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">
                      To prevent money laundering, Safaricom Daraja integration rules require business entity verification. Let us verify your kra pins and business registry records quickly.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleKYCUpload} className="space-y-4 border-t border-slate-100 pt-5">
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase">Registered Company Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sauti Generation Productions Ltd"
                        value={kycBusinessName}
                        onChange={(e) => setKycBusinessName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-lg px-3 py-2 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase">KRA Business Pin</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. P05128391A"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-lg px-3 py-2 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">Enterprise Registration Document (PDF/PNG)</label>
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-5 text-center cursor-pointer hover:border-red-500 transition">
                      <Layers className="h-7 w-7 text-slate-400 mx-auto mb-2 animate-bounce" />
                      <p className="text-xs font-bold text-slate-900">Drag or click to choose files</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Maximum upload file ceiling: 5MB</p>
                    </div>
                  </div>

                  {kycSubmitted ? (
                    <div className="bg-emerald-50 text-emerald-600 text-xs p-3.5 rounded-lg border border-emerald-150 font-medium">
                      Enterprise Identity credentials submitted and marked pending evaluation checker. KYC Verified status will reflect within hours.
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={!kycBusinessName}
                      className="bg-slate-900 hover:bg-red-600 text-white font-bold py-2.5 px-6 rounded-lg text-xs transition"
                    >
                      Authenticate Verification
                    </button>
                  )}
                </form>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* 3. MODAL OVERLAY: BUY TICKET FLOW */}
      {selectedEvent && (
        <PublicBuyFlow
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onPurchaseComplete={() => {
            fetchData();
          }}
        />
      )}

      {/* 4. MODAL OVERLAY: TICKET SCANNER SIMULATOR */}
      {showScanner && (
        <TicketScannerSim
          onClose={() => setShowScanner(false)}
        />
      )}



    </div>
  );
}
