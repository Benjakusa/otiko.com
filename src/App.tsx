/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { 
  Building, Calendar, MapPin, Ticket as TicketIcon, Phone, Mail, 
  User, CheckCircle2, AlertTriangle, Loader2, RefreshCw, X, Download, QrCode,
  TrendingUp, Wallet, ShieldCheck, Settings, Plus, Landmark, BarChart3, 
  Layers, Search, ArrowRight, ExternalLink, LogOut, Menu
} from "lucide-react";
import { Event, Order, Ticket, LedgerEntry, Payout, Organizer } from "./types";
import PublicBuyFlow from "./components/public-buy-flow";
import SignupPage from "./components/auth/SignupPage";
import LoginPage from "./components/auth/LoginPage";
import ForgotPasswordPage from "./components/auth/ForgotPasswordPage";
import PublicFooter from "./components/PublicFooter";
import PolicyPages, { PolicySection } from "./components/policies/PolicyPages";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./components/AdminDashboard";

export default function App() {
  // Navigation Tabs state
  // "public" | "dashboard" | "events" | "wallet" | "kyc" | "admin" | "login" | "signup" | "forgot-password" | "policies"
  const [activeTab, setActiveTab] = useState<"public" | "dashboard" | "events" | "wallet" | "kyc" | "admin" | "login" | "signup" | "forgot-password" | "policies">("public");
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

  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoginError, setAdminLoginError] = useState("");

  const handleAdminLogin = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError("");
    if (adminPassword === "otiko2025") {
      setToken("admin-token-2026");
      setActiveTab("admin");
      setShowAdminLogin(false);
      setAdminPassword("");
    } else {
      setAdminLoginError("Invalid admin password");
    }
  }, [adminPassword]);

  // Guard: redirect unauthenticated users to login when accessing restricted tabs
  const restrictedTabs = ["dashboard", "events", "wallet", "kyc", "admin"];
  useEffect(() => {
    if (restrictedTabs.includes(activeTab) && token === "user-default-uid") {
      const checkAuth = async () => {
        const res = await fetch("/api/organizers/me", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) {
          setActiveTab("login");
        }
      };
      checkAuth();
    }
  }, [activeTab, token]);

  // App data state
  const [events, setEvents] = useState<Event[]>([]);           // Public buyer portal (all active events)
  const [organizerEvents, setOrganizerEvents] = useState<Event[]>([]); // Organizer workspace (own events only — ISOLATED)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
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
  const [newEventFlyerPreview, setNewEventFlyerPreview] = useState<string | null>(null);
  const [newEventFlyerUploading, setNewEventFlyerUploading] = useState(false);
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
      // 1. Fetch ALL active events for the public buyer portal
      const eventsRes = await fetch("/api/events");
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData);
      }

      // 2. Fetch organizer profile
      const orgRes = await fetch("/api/organizers/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (orgRes.ok) {
        const orgData = await orgRes.json();
        setOrganizer(orgData);
      } else {
        setOrganizer(null);
      }

      // 3. Fetch organizer-scoped events (DATA ISOLATION: only this organizer's events)
      //    Endpoint strictly enforces: SELECT * FROM events WHERE organizer_id = current_user.id
      const orgEventsRes = await fetch("/api/organizer/events", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (orgEventsRes.ok) {
        const orgEventsData = await orgEventsRes.json();
        setOrganizerEvents(orgEventsData);
      }

      // 4. Fetch wallet/finance metrics (already scoped to org.id on the backend)
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
  const handleNewEventImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) { alert("Invalid format. Accepted: JPG, JPEG, PNG, WEBP"); return; }
    if (file.size > 10 * 1024 * 1024) { alert("File too large. Max 10MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setNewEventFlyerPreview(reader.result as string);
    reader.readAsDataURL(file);
    const formData = new FormData();
    formData.append("image", file);
    setNewEventFlyerUploading(true);
    try {
      const res = await fetch("/api/upload/image", { method: "POST", headers: { "Authorization": `Bearer ${token}` }, body: formData });
      const data = await res.json();
      if (res.ok) { setNewEventFlyer(data.url); setNewEventFlyerPreview(null); }
      else { alert(data.error || "Upload failed"); }
    } catch { alert("Image upload failed"); }
    finally { setNewEventFlyerUploading(false); }
  };

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
        onSignupSuccess={(organizerData, idToken) => {
          setOrganizer(organizerData);
          setToken(idToken || organizerData.firebaseUid || "user-default-uid");
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

      {/* 1. SIDEBAR NAVIGATION */}
      {!["public", "login", "signup", "forgot-password", "policies"].includes(activeTab) && (
        <aside className={`bg-white flex flex-col h-full border-r border-slate-200 shrink-0 text-slate-700 transition-all duration-300 z-50
          fixed inset-y-0 left-0 w-64 md:relative md:inset-auto md:translate-x-0
          ${mobileSidebarOpen ? "translate-x-0 animate-fade-in" : "-translate-x-full"}
          md:w-20 lg:w-64`}
        >
          {/* BRAND HEADER */}
          <div className="p-6 flex items-center justify-center lg:justify-start gap-3 border-b border-slate-100 pb-5">
            <div className="w-8 h-8 bg-red-650 rounded flex items-center justify-center font-bold text-white text-base shrink-0">
              O
            </div>
            <div className="md:hidden lg:block">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">Otiko<span className="text-red-500">.com</span></h1>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block mt-1">Organizer</span>
            </div>
          </div>

          {/* NAVIGATION */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all md:justify-center lg:justify-start ${
                activeTab === "dashboard"
                  ? "bg-slate-100 text-slate-900 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span className="md:hidden lg:inline">Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("events")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all md:justify-center lg:justify-start ${
                activeTab === "events"
                  ? "bg-slate-100 text-slate-900 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Layers className="h-4 w-4 shrink-0" />
              <span className="md:hidden lg:inline">Events</span>
            </button>

            <button
              onClick={() => setActiveTab("wallet")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all md:justify-center lg:justify-start ${
                activeTab === "wallet"
                  ? "bg-slate-100 text-slate-900 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Wallet className="h-4 w-4 shrink-0" />
              <span className="md:hidden lg:inline">Payment</span>
            </button>

            <button
              onClick={() => setActiveTab("kyc")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all md:justify-center lg:justify-start ${
                activeTab === "kyc"
                  ? "bg-slate-100 text-slate-900 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span className="md:hidden lg:inline">Verification</span>
            </button>
          </nav>

          {/* LOGOUT */}
          <div className="p-4 mt-auto border-t border-slate-100">
            <button
              onClick={() => { setToken("user-default-uid"); setActiveTab("public"); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all md:justify-center lg:justify-start"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="md:hidden lg:inline">Logout</span>
            </button>
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

              {/* Admin login link */}
              <button
                onClick={() => setShowAdminLogin(true)}
                className="text-xs font-semibold text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition cursor-pointer"
                title="Admin Login"
              >
                Admin
              </button>

              {/* Profile icon to open event organizers sign-up/sign-in portal */}
              <button
                onClick={() => setActiveTab("login")}
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
              <button
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                className="p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden transition cursor-pointer"
                title="Toggle Sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>

              <h2 className="text-sm sm:text-base font-bold text-slate-900 select-none">
                {organizer?.name || "Organizer"}
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
                    The easiest way to find and buy tickets to events across Kenya.
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

          {/* TAB 2: ORGANIZER DASHBOARD */}
          {activeTab === "dashboard" && (
            <UserDashboard
              organizer={organizer}
              events={organizerEvents}
              walletOverview={walletOverview}
              loading={loading}
              onRefresh={fetchData}
              onLogout={() => { setToken("user-default-uid"); setActiveTab("public"); }}
              onSelectEvent={(evt) => setSelectedEvent(evt)}
            />
          )}

          {/* ==================================== TAB 3: MANAGE EVENTS & NEW EVENT FORM ==================================== */}
          {activeTab === "events" && (
            <div className="space-y-8 animate-fade-in">
              
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Events</h3>
                  <p className="text-xs text-slate-500">Manage your events and ticket categories.</p>
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
                    <h4 className="font-bold text-slate-900 text-sm uppercase">New Event</h4>
                    <p className="text-xs text-slate-400 mt-1">Fill in the details to create a new event.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase">Event Name</label>
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
                      <label className="block text-xs font-bold text-slate-700 uppercase">Date & Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={newEventDate}
                        onChange={(e) => setNewEventDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-lg px-4 py-2.5 text-xs text-slate-800 focus:outline-none transition font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase">Venue</label>
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
                      <label className="block text-xs font-bold text-slate-700 uppercase">Flyer Image</label>
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleNewEventImage}
                        className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
                      {newEventFlyerUploading && <div className="flex items-center gap-2 text-xs text-slate-500 mt-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading...</div>}
                      {newEventFlyerPreview && <img src={newEventFlyerPreview} alt="Preview" className="mt-2 h-32 w-full object-cover rounded-lg border border-slate-200" />}
                      {newEventFlyer && !newEventFlyerPreview && !newEventFlyerUploading && <div className="text-[10px] text-emerald-600 mt-1">Image uploaded ✓</div>}
                    </div>
                  </div>

                  <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase">Description</label>
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
                        Ticket Categories
                      </label>
                      <button
                        type="button"
                        onClick={addCategoryRow}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs py-1.5 px-3 rounded-lg flex items-center gap-1 transition"
                      >
                        + Add Category
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
                      Create Event & Activate Tickets
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
                      ) : organizerEvents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                            No registered events found. Create a custom event above.
                          </td>
                        </tr>
                      ) : (
                        organizerEvents.map((evt) => (
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
                <h3 className="text-xl font-bold text-slate-900">Payments</h3>
                <p className="text-xs text-slate-500">Revenue, transactions, and payout history.</p>
              </div>

              {/* DYNAMIC METRICS FOR ORGANIZER FINANCES */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Gross Revenue</span>
                  <div className="text-3xl font-bold text-slate-900 font-mono mt-2">
                    KES {walletOverview?.grossCollected ? walletOverview.grossCollected.toLocaleString() : "12,000"}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">Platform fee: KES {walletOverview?.platformFees || "600"}</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Total Payouts</span>
                  <div className="text-3xl font-bold text-slate-900 font-mono mt-2">
                    KES {walletOverview?.payouts ? walletOverview.payouts.reduce((sum: number, p: any) => sum + p.amount, 0).toLocaleString() : "0"}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">Total amount withdrawn</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm relative overflow-hidden bg-gradient-to-br from-emerald-500/5 to-transparent">
                  <span className="text-[10px] text-emerald-600 block uppercase font-bold tracking-wider">Available Balance</span>
                  <div className="text-3xl font-bold text-emerald-800 font-mono mt-2">
                    KES {walletOverview?.availableBalance ? walletOverview.availableBalance.toLocaleString() : "11,400"}
                  </div>
                  <p className="text-[10px] text-emerald-600 mt-2 font-semibold">Ready for payout</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                
                {/* PAYOUT REQUEST PANEL */}
                <div className="bg-white p-6 rounded-xl border border-slate-200/80 lg:col-span-2 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h4 className="font-bold text-slate-900 text-sm uppercase">Request Payout</h4>
                    <p className="text-xs text-slate-400 mt-1">Withdraw available balance to your M-Pesa payout number.</p>
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
                      Request Payout
                    </button>
                  </form>
                </div>

                {/* LEDGER ARCHIVES APPEND-ONLY TABLE */}
                <div className="bg-white p-6 rounded-xl border border-slate-250 lg:col-span-3 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h4 className="font-bold text-slate-900 text-sm uppercase">Transaction History</h4>
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
                <h3 className="text-xl font-bold text-slate-900">Verification</h3>
                <p className="text-xs text-slate-500">Verify your business identity to receive payouts.</p>
              </div>

              <div className="max-w-2xl bg-white rounded-xl border border-slate-205 p-6 space-y-6">
                
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">KYC Verification</h4>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">
                      Submit your business documents for KYC verification to enable payouts via M-Pesa B2C.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleKYCUpload} className="space-y-4 border-t border-slate-100 pt-5">
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase">Business Name</label>
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
                      <label className="block text-[11px] font-bold text-slate-600 uppercase">KRA PIN</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. P05128391A"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-lg px-3 py-2 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">Upload Document</label>
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-5 text-center cursor-pointer hover:border-red-500 transition">
                      <Layers className="h-7 w-7 text-slate-400 mx-auto mb-2 animate-bounce" />
                      <p className="text-xs font-bold text-slate-900">Click to upload (PDF or PNG)</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Max file size: 5MB</p>
                    </div>
                  </div>

                  {kycSubmitted ? (
                    <div className="bg-emerald-50 text-emerald-600 text-xs p-3.5 rounded-lg border border-emerald-150 font-medium">
                      Documents submitted successfully. KYC status will be updated once reviewed.
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={!kycBusinessName}
                      className="bg-slate-900 hover:bg-red-600 text-white font-bold py-2.5 px-6 rounded-lg text-xs transition"
                    >
                      Submit for Verification
                    </button>
                  )}
                </form>
              </div>

            </div>
          )}

          {/* ==================================== TAB: ADMIN DASHBOARD ==================================== */}
          {activeTab === "admin" && (
            <AdminDashboard token={token} />
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

      {/* 4. MODAL OVERLAY: ADMIN LOGIN */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Admin Login</h2>
            <p className="text-xs text-slate-400 mb-5">Enter the admin password to access the admin dashboard.</p>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Password</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password"
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-lg px-3 py-2.5 text-sm"
                />
              </div>
              {adminLoginError && (
                <p className="text-xs font-medium text-red-500">{adminLoginError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowAdminLogin(false); setAdminPassword(""); setAdminLoginError(""); }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg text-sm transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-red-600 text-white font-bold py-2.5 rounded-lg text-sm transition cursor-pointer"
                >
                  Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
