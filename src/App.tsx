/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { 
  Building, Calendar, MapPin, Ticket as TicketIcon, Phone, Mail, 
  User, CheckCircle2, AlertTriangle, Loader2, RefreshCw, X, Download, QrCode,
  TrendingUp, TrendingDown, CheckCircle, Wallet, ShieldCheck, Settings, Plus, Landmark, BarChart3, 
  Layers, Lock, Database, Search, ArrowRight, ScanLine, Clock, Cpu, 
  HelpCircle, Receipt, ExternalLink, HelpCircle as HelpIcon, Sparkles, Menu
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
  const [events, setEvents] = useState<Event[]>([]);
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
  const [kycLoading, setKycLoading] = useState(false);
  const [walletSubTab, setWalletSubTab] = useState<"ledger" | "payouts">("ledger");

  // Profile Edit Form State
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileBusinessName, setProfileBusinessName] = useState("");
  const [profilePayoutNumber, setProfilePayoutNumber] = useState("");

  // Edit Event State
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editEventName, setEditEventName] = useState("");
  const [editEventDate, setEditEventDate] = useState("");
  const [editEventVenue, setEditEventVenue] = useState("");
  const [editEventDesc, setEditEventDesc] = useState("");
  const [editEventFlyer, setEditEventFlyer] = useState("");
  const [editEventStatus, setEditEventStatus] = useState<'draft' | 'active' | 'past' | 'cancelled'>("active");

  // Soft Delete State
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);

  // View Event Detail Modal State
  const [viewingEventDetail, setViewingEventDetail] = useState<Event | null>(null);
  const [viewingEventTickets, setViewingEventTickets] = useState<any[]>([]);
  const [loadingEventTickets, setLoadingEventTickets] = useState(false);

  // Pagination Pages
  const [eventsPage, setEventsPage] = useState(1);
  const eventsPageSize = 5;
  const [ledgerPage, setLedgerPage] = useState(1);
  const ledgerPageSize = 5;

  // Custom Toast State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

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

  // Sync loaded organizer parameters to profile editing fields
  useEffect(() => {
    if (organizer) {
      setProfileName(organizer.name || "");
      setProfilePhone(organizer.phone || "");
      setProfileBusinessName(organizer.businessName || "");
      setProfilePayoutNumber(organizer.mpesaPayoutNumber || "");
      setKycBusinessName(organizer.businessName || "");
    }
  }, [organizer]);

  // Dynamic ticket roster fetcher when examining event summaries
  useEffect(() => {
    const loadEventTickets = async () => {
      if (!viewingEventDetail) return;
      setLoadingEventTickets(true);
      try {
        const res = await fetch(`/api/events/${viewingEventDetail.eventCode}/tickets`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const tList = await res.json();
          setViewingEventTickets(tList);
        }
      } catch (err) {
        console.error("Failed loading event tickets details", err);
      } finally {
        setLoadingEventTickets(false);
      }
    };
    loadEventTickets();
  }, [viewingEventDetail, token]);

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
        setPayoutError(data.error || "Payout request failed.");
      } else {
        setPayoutSuccess(`Payout request of KES ${amt.toLocaleString()} submitted.`);
        setPayoutAmount("");
        setTimeout(() => fetchData(), 2500);
      }
    } catch (err) {
      setPayoutError("Failed to submit payout request.");
    } finally {
      setPayoutLoading(false);
    }
  };

  // Handler: Submit KYC Details Mock state upload
  const handleKYCUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycBusinessName) return;
    setKycLoading(true);

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
        showToast("KYC Application submitted successfully!", "success");
        fetchData();
      } else {
        showToast("KYC Application submission failed", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error uploading KYC certificate", "error");
    } finally {
      setKycLoading(false);
    }
  };

  // Handler: Update Organizer profile info (name, phone, businessName, payoutNumber)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/organizers/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileName,
          phone: profilePhone,
          businessName: profileBusinessName,
          mpesaPayoutNumber: profilePayoutNumber
        })
      });

      if (res.ok) {
        showToast("Organizer Profile updated successfully!", "success");
        fetchData();
      } else {
        const errorData = await res.json();
        showToast(errorData.error || "Failed to update profile", "error");
      }
    } catch (err) {
      showToast("Connection timeout updating profile core.", "error");
    }
  };

  // Handler: PATCH Event changes
  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    try {
      const res = await fetch(`/api/events/${editingEvent.eventCode}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editEventName,
          flyerUrl: editEventFlyer,
          eventDate: editEventDate,
          venue: editEventVenue,
          description: editEventDesc,
          status: editEventStatus
        })
      });

      if (res.ok) {
        setEditingEvent(null);
        showToast("Event details updated successfully!", "success");
        fetchData();
      } else {
        const errorData = await res.json();
        showToast(errorData.error || "Failed to revise event parameters", "error");
      }
    } catch (err) {
      showToast("Error updating event parameters", "error");
    }
  };

  // Handler: DELETE Soft Event Deletion
  const handleDeleteEvent = async () => {
    if (!deletingEvent) return;

    try {
      const res = await fetch(`/api/events/${deletingEvent.eventCode}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        setDeletingEvent(null);
        showToast(`Event '${deletingEvent.name}' cancelled successfully!`, "success");
        fetchData();
      } else {
        const errorData = await res.json();
        showToast(errorData.error || "Failed soft deleting event", "error");
      }
    } catch (err) {
      showToast("Server communication error deleting event", "error");
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

          {/* FOOTER ACCENTS */}
          <div className="p-4 mt-auto border-t border-slate-800 bg-[#0c1222] md:hidden lg:block text-[10px] text-slate-500 text-center uppercase tracking-wider font-semibold">
            SECURED ESCROW
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
        <div className={`flex-1 overflow-y-auto bg-[#F3F4F6] ${activeTab === "public" ? "" : "p-4 sm:p-8 space-y-8"}`}>
          
          {/* ==================================== TAB 1: PUBLIC BUYER PORTAL ==================================== */}
          {activeTab === "public" && (
            <div className="animate-fade-in flex flex-col min-h-full">
              
              {/* BRAND SEARCH HERO ROW */}
              <div 
                className="relative rounded-2xl overflow-hidden shadow-md bg-cover bg-center min-h-[340px] sm:min-h-[400px] flex items-center justify-center p-6 sm:p-12 text-center"
                style={{ backgroundImage: `url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80')` }}
              >
                {/* Dark Overlay */}
                <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[1px]"></div>

                {/* Content Centered Container */}
                <div className="max-w-xl w-full relative z-10 flex flex-col items-center justify-center space-y-5">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-md select-none">
                    Discover. Book. Attend.
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-md drop-shadow select-none">
                    The easiest way to find and buy tickets to events near you.
                  </p>

                  {/* ACTIVE SEARCH FILTERS */}
                  <div className="w-full space-y-3 pt-2">
                    <div className="relative w-full">
                      <input
                        id="hero-search-input"
                        type="text"
                        placeholder="Search Nairobi events, festivals, venues..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/10 backdrop-blur-md border border-white/20 focus:border-red-500 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white focus:outline-none transition placeholder:text-slate-300"
                      />
                      <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-300" />
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap gap-2 justify-center w-full">
                      <button 
                        onClick={() => {
                          const el = document.getElementById("hero-search-input");
                          if (el) el.focus();
                        }}
                        className="bg-red-650 hover:bg-red-700 text-white font-bold text-xs px-6 py-3 rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer shrink-0 w-full sm:w-auto"
                      >
                        <Search className="h-4 w-4" />
                        <span>Search</span>
                      </button>

                      <select
                        value={selectedStatusFilter}
                        onChange={(e) => setSelectedStatusFilter(e.target.value)}
                        className="bg-slate-900/80 backdrop-blur-md text-xs border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none cursor-pointer w-full sm:w-auto"
                      >
                        <option value="all" className="bg-slate-900 text-white">All Events status</option>
                        <option value="active" className="bg-slate-900 text-white">Active Only</option>
                        <option value="past" className="bg-slate-900 text-white">Past Events</option>
                      </select>

                      <button 
                        onClick={fetchData}
                        className="p-3 bg-slate-900/80 backdrop-blur-md hover:bg-slate-800 border border-white/20 rounded-xl transition text-slate-200 hover:text-white cursor-pointer"
                        title="Sync Database"
                      >
                        <RefreshCw className="h-4 w-4 animate-spin-hover" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* MAIN CONTENT INNER LAYER */}
              <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8 flex-1">
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
            <div className="space-y-6 animate-fade-in">
              
              {/* SUB HEADER INTRO */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-950 tracking-tight">Dashboard Overview</h3>
                  <p className="text-xs text-slate-500">Track and manage ticket bookings, live revenue, and payouts sweeps.</p>
                </div>
                
                <button
                  onClick={() => {
                    setActiveTab("events");
                    setShowAddEvent(true);
                  }}
                  className="bg-red-650 hover:bg-red-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Create New Event
                </button>
              </div>

              {/* 4 CORE METRIC CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Total Events */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Events</span>
                    <Calendar className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{events.length}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Created on Otiko portal</p>
                  </div>
                </div>

                {/* 2. Total Tickets Sold */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tickets Sold</span>
                    <TicketIcon className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
                      {loading ? "..." : (walletOverview?.ledger ? walletOverview.ledger.filter((x: any) => x.entryType === "sale").length : 1)}
                    </p>
                  </div>
                </div>

                {/* 3. Gross Collected Receipt Revenue */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Revenue</span>
                    <TrendingUp className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                      KES {walletOverview?.grossCollected ? walletOverview.grossCollected.toLocaleString() : "0"}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Fee margin: KES {walletOverview?.platformFees || 0} (5%)
                    </p>
                  </div>
                </div>

                {/* 4. Available Balance Sweep */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 bg-gradient-to-br from-red-500/5 to-transparent flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Available Balance</span>
                    <Wallet className="h-4.5 w-4.5 text-red-500 shrink-0" />
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-black text-red-600 font-mono tracking-tight">
                      KES {walletOverview?.availableBalance ? walletOverview.availableBalance.toLocaleString() : "0"}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <button 
                        onClick={() => setActiveTab("wallet")}
                        className="text-[10px] font-extrabold text-red-600 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded transition"
                      >
                        Payout Sweep →
                      </button>
                      <span className="text-[9px] text-slate-400 font-mono">Synced ✓</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SALES CHART - GRAPH REPRESENTATION */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Sales & Volume Metrics (Past 7 Days Feed)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Daily gross transaction receipts calculated from secure ledger indexes.
                    </p>
                  </div>
                  <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider bg-red-50 px-2.5 py-1 rounded-lg">
                    Real-time Callback active
                  </div>
                </div>

                {/* GRAPH HEIGHT REPRESENTATION VIA SVG */}
                <div className="h-60 w-full relative">
                  {/* Grid background lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="w-full border-t border-slate-100 py-1 flex justify-between text-[9px] font-mono text-slate-300">
                      <span>100%</span>
                    </div>
                    <div className="w-full border-t border-slate-100 py-1 flex justify-between text-[9px] font-mono text-slate-300">
                      <span>66%</span>
                    </div>
                    <div className="w-full border-t border-slate-300/40 py-1 flex justify-between text-[9px] font-mono text-slate-300">
                      <span>33%</span>
                    </div>
                    <div className="w-full border-b border-slate-200"></div>
                  </div>

                  {/* Render Sales Columns */}
                  <div className="absolute inset-x-0 bottom-4 top-4 flex items-end gap-3 px-8 z-10">
                    {/* Compute sales stats dynamically */}
                    {(() => {
                      const dates = Array.from({ length: 7 }).map((_, idx) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (6 - idx));
                        return d.toISOString().split("T")[0];
                      });
                      const orgLedger = walletOverview?.ledger || [];
                      const chartData = dates.map(dt => {
                        const daySales = orgLedger
                          .filter((item: any) => item.entryType === "sale" && item.createdAt.startsWith(dt))
                          .reduce((sum: number, item: any) => sum + item.grossAmount, 0);
                        const label = new Date(dt).toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
                        return { label, amount: daySales };
                      });
                      const maxVal = Math.max(...chartData.map(c => c.amount), 5000);

                      return chartData.map((bar, i) => {
                        const pct = (bar.amount / maxVal) * 100;
                        return (
                          <div key={i} className="flex-1 h-full flex flex-col justify-end items-center group relative">
                            {/* Bar Tooltip on Hover */}
                            <div className="absolute -top-10 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-bold font-mono py-1 px-2.5 rounded-lg tracking-tight pointer-events-none transition duration-200 z-30 shadow-md">
                              KES {bar.amount.toLocaleString()}
                            </div>

                            <div 
                              style={{ height: `${Math.max(5, pct)}%` }}
                              className={`w-full max-w-[40px] rounded-t-xl transition-all duration-300 relative ${
                                bar.amount > 0 
                                  ? "bg-gradient-to-t from-red-600 to-red-400 group-hover:brightness-105" 
                                  : "bg-slate-100 group-hover:bg-slate-200"
                              }`}
                            >
                              {bar.amount > 0 && (
                                <div className="absolute top-1 left-0 right-0 h-1 bg-white/20 rounded-full mx-1"></div>
                              )}
                            </div>
                            <span className="text-[10px] font-extrabold text-slate-500 font-mono mt-2 select-none block shrink-0">
                              {bar.label}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              {/* BOTTOM TWO COLUMNS METRICS */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                
                {/* RECENT EVENTS QUICK LIST (Latest 3) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      My Recent Live Events
                    </h4>
                    <button
                      onClick={() => {
                        setActiveTab("events");
                        setEventsPage(1);
                      }}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600 tracking-wider uppercase transition"
                    >
                      View All ({events.length})
                    </button>
                  </div>

                  <div className="space-y-3">
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex gap-3 items-center shimmer-bg h-14 rounded-xl"></div>
                      ))
                    ) : events.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">No events created yet. Add one in the Events tab!</p>
                    ) : (
                      events.slice(0, 3).map((evt) => (
                        <div 
                          key={evt.id} 
                          className="flex gap-3 items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl transition group relative cursor-pointer"
                          onClick={() => {
                            setViewingEventDetail(evt);
                            setActiveTab("events");
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                              <img src={evt.flyerUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-slate-800 truncate leading-tight group-hover:text-red-650 transition">
                                {evt.name}
                              </h5>
                            </div>
                          </div>
                          
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase font-sans">
                              {evt.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* LEDGER ACTIVITIES / ORDERS SIMULATOR PORTLET */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-3 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Recent Booking Logs
                    </h4>
                    <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded">
                      Audited Log Channel
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[400px]">
                      <thead>
                        <tr className="border-b border-slate-50 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                          <th className="pb-2">ID</th>
                          <th className="pb-2">Gross Receipt</th>
                          <th className="pb-2">Margin (5%)</th>
                          <th className="pb-2 text-right">Net Proceeds</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-slate-700 font-mono text-xs">
                        {loading || !walletOverview ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <tr key={i} className="h-10">
                              <td colSpan={4} className="shimmer-bg rounded my-1"></td>
                            </tr>
                          ))
                        ) : walletOverview.ledger && walletOverview.ledger.length > 0 ? (
                          walletOverview.ledger.slice(0, 4).map((item: any) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition">
                              <td className="py-2.5 font-sans">
                                <div className="font-bold text-slate-800 leading-none">{item.id}</div>
                                <span className="text-[9px] text-slate-400 mt-0.5 block">{new Date(item.createdAt).toLocaleDateString()}</span>
                              </td>
                              <td className="py-2.5 text-slate-600 font-bold">KES {item.grossAmount.toLocaleString()}</td>
                              <td className="py-2.5 text-slate-400">KES {item.platformFee.toLocaleString()}</td>
                              <td className="py-2.5 text-right font-black text-slate-900">KES {item.netAmount.toLocaleString()}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400 text-xs font-sans">
                              No sales yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          )}
                {/* ==================================== TAB 3: MANAGE EVENTS & NEW EVENT FORM ==================================== */}
          {activeTab === "events" && (
            <div className="space-y-6 animate-fade-in pb-12">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-950 tracking-tight">Active Events Center</h3>
                  <p className="text-xs text-slate-500">Manage your events, categories, and attendees.</p>
                </div>

                <button
                  onClick={() => setShowAddEvent(!showAddEvent)}
                  className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition cursor-pointer"
                >
                  {showAddEvent ? "Hide Form" : <><Plus className="h-4 w-4" /> Add Custom Event</>}
                </button>
              </div>

              {/* NEW EVENT FORM DRAWER/ACCORDION */}
              {showAddEvent && (
                <form onSubmit={handleCreateEvent} className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-6 animate-slide-up shadow-sm">
                  <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm uppercase">Create Target Ticket Pass Group</h4>
                      <p className="text-xs text-slate-400 mt-1">Registers core venue metadata and dynamic category inventory limits.</p>
                    </div>
                    <div className="bg-emerald-50 text-emerald-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                      New ID Sequence active
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Event Title Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Solfest Homecoming Concert 2026"
                        value={newEventName}
                        onChange={(e) => setNewEventName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Event Date & Timing</label>
                      <input
                        type="datetime-local"
                        required
                        value={newEventDate}
                        onChange={(e) => setNewEventDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Venue Physical Location Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. KICC Dome, Nairobi"
                        value={newEventVenue}
                        onChange={(e) => setNewEventVenue(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Flyer Image Resource (Stock URL selection below or type custom)</label>
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/photo-..."
                        value={newEventFlyer}
                        onChange={(e) => setNewEventFlyer(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Stock Flyer Images selection */}
                  <div className="space-y-1">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Fast Presets stock flyer images:</span>
                    <div className="flex gap-2 overflow-x-auto py-1">
                      {[
                        "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=800",
                        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800",
                        "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800",
                        "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&q=80&w=800"
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setNewEventFlyer(preset)}
                          className={`w-14 h-10 rounded border overflow-hidden shrink-0 transition ${
                            newEventFlyer === preset ? "border-red-600 scale-95" : "border-slate-200 hover:border-slate-400"
                          }`}
                        >
                          <img src={preset} className="w-full h-full object-cover" alt="" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Concert Public Description Notes</label>
                    <textarea
                      placeholder="Specify gate procedures, parking guidelines, and secure checkup policies."
                      rows={2}
                      value={newEventDesc}
                      onChange={(e) => setNewEventDesc(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-lg p-3 text-xs"
                    ></textarea>
                  </div>

                  {/* DYNAMIC CATEGORIES FOR CREATION */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        Dynamic Ticket Category Release Options
                      </span>
                      <button
                        type="button"
                        onClick={addCategoryRow}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold border border-slate-200 py-1.5 px-3 rounded-lg transition"
                      >
                        + Add Dynamic Tier
                      </button>
                    </div>

                    <div className="space-y-2">
                      {newEventCategories.map((cat, i) => (
                        <div key={i} className="flex flex-col md:flex-row gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 items-end">
                          <div className="flex-1 space-y-1 w-full">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Tier Class Designation</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. VIP Backstage Experience"
                              value={cat.name}
                              onChange={(e) => {
                                const copy = [...newEventCategories];
                                copy[i].name = e.target.value;
                                setNewEventCategories(copy);
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                            />
                          </div>

                          <div className="space-y-1 w-full md:w-44">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Unit Price Amount (KES)</label>
                            <input
                              type="number"
                              required
                              placeholder="1500"
                              value={cat.price}
                              onChange={(e) => {
                                const copy = [...newEventCategories];
                                copy[i].price = e.target.value;
                                setNewEventCategories(copy);
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold"
                            />
                          </div>

                          <div className="flex gap-2 items-center w-full md:w-56">
                            <div className="space-y-1 flex-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Capacity Release Limit</label>
                              <input
                                type="number"
                                required
                                placeholder="500"
                                value={cat.totalQuantity}
                                onChange={(e) => {
                                  const copy = [...newEventCategories];
                                  copy[i].totalQuantity = e.target.value;
                                  setNewEventCategories(copy);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold"
                              />
                            </div>
                            
                            {newEventCategories.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeCategoryRow(i)}
                                className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition shrink-0 h-10 mt-5"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 flex justify-end gap-3.5">
                    <button
                      type="button"
                      onClick={() => setShowAddEvent(false)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2 px-4 rounded-xl transition"
                    >
                      Dismiss Draft
                    </button>
                    <button
                      type="submit"
                      className="bg-red-650 hover:bg-red-700 text-white text-xs font-bold py-2 px-5 rounded-xl transition shadow-sm"
                    >
                      Publish Live Ticket Sales
                    </button>
                  </div>
                </form>
              )}

              {/* LIST OF REGISTERED VAULT EVENTS (WITH PAGINATION AND ACTIONS) */}
              <div className="bg-white rounded-2xl border border-slate-200/60 p-6 space-y-4">
                
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Registered Events Directory
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400">
                    Showing Page {eventsPage} of {Math.max(1, Math.ceil(filteredEvents.length / eventsPageSize))}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                        <th className="pb-3 w-14">Code</th>
                        <th className="pb-3">Event Parameters</th>
                        <th className="pb-3">Venue Physical</th>
                        <th className="pb-3 text-right">Pass Tiers Inventory</th>
                        <th className="pb-3 text-center">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                      {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <tr key={i} className="h-16">
                            <td colSpan={6} className="shimmer-bg my-2 rounded"></td>
                          </tr>
                        ))
                      ) : filteredEvents.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                            No matching organic events found in client portfolio workspace scope.
                          </td>
                        </tr>
                      ) : (
                        filteredEvents.slice((eventsPage - 1) * eventsPageSize, eventsPage * eventsPageSize).map((evt) => {
                          const isCancelled = evt.status === "cancelled";
                          return (
                            <tr key={evt.id} className="hover:bg-slate-50/50 transition">
                              <td className="py-4 font-mono font-bold text-slate-900">{evt.eventCode}</td>
                              <td className="py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-100 shadow-sm">
                                    <img src={evt.flyerUrl} className="w-full h-full object-cover" alt="" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900 group-hover:text-red-650 leading-tight">{evt.name}</div>
                                    <span className="text-[9px] font-mono text-slate-400 block mt-1">
                                      Concert: {new Date(evt.eventDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 text-slate-600 font-medium">{evt.venue}</td>
                              <td className="py-4 text-right">
                                {evt.categories && evt.categories.length > 0 ? (
                                  evt.categories.map((c) => (
                                    <div key={c.id} className="text-[9px] font-mono text-slate-500 mt-0.5">
                                      {c.name}: <span className="font-bold text-slate-800">{c.remainingQuantity} / {c.totalQuantity}</span>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-slate-400">No categories config</span>
                                )}
                              </td>
                              <td className="py-4 text-center">
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase inline-block font-sans ${
                                  evt.status === "active" 
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                    : evt.status === "draft" 
                                    ? "bg-slate-100 text-slate-700 border border-slate-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-100"
                                }`}>
                                  {evt.status}
                                </span>
                              </td>
                              <td className="py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* View Detail Action */}
                                  <button
                                    onClick={() => setViewingEventDetail(evt)}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition"
                                    title="View category allocations and guest roster list"
                                  >
                                    <Layers className="h-4 w-4" />
                                  </button>

                                  {/* Edit parameters */}
                                  {!isCancelled && (
                                    <button
                                      onClick={() => {
                                        setEditingEvent(evt);
                                        setEditEventName(evt.name);
                                        setEditEventDate(evt.eventDate);
                                        setEditEventVenue(evt.venue);
                                        setEditEventDesc(evt.description || "");
                                        setEditEventFlyer(evt.flyerUrl || "");
                                        setEditEventStatus(evt.status);
                                      }}
                                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition"
                                      title="Edit Event params"
                                    >
                                      <Settings className="h-4 w-4" />
                                    </button>
                                  )}

                                  {/* Copy Link Share */}
                                  <button
                                    onClick={() => {
                                      const pathStr = `${window.location.origin}/?event=${evt.eventCode}`;
                                      navigator.clipboard.writeText(pathStr);
                                      showToast(`Shared event path copied: ${evt.eventCode}`, "success");
                                    }}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-red-650 transition"
                                    title="Copy gate sales checkout invite link to clipboard"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </button>

                                  {/* Cancel / soft delete */}
                                  {!isCancelled && (
                                    <button
                                      onClick={() => setDeletingEvent(evt)}
                                      className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition"
                                      title="Cancel event sales permanently"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION PANEL FOR EVENTS */}
                {filteredEvents.length > eventsPageSize && (
                  <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                    <button
                      disabled={eventsPage === 1}
                      onClick={() => setEventsPage(p => Math.max(1, p - 1))}
                      className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 disabled:opacity-50 disabled:hover:bg-slate-50 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer"
                    >
                      Previous Page
                    </button>
                    <div className="flex gap-1.5">
                      {Array.from({ length: Math.ceil(filteredEvents.length / eventsPageSize) }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setEventsPage(idx + 1)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                            eventsPage === idx + 1 ? "bg-[#0F172A] text-white" : "bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700"
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      disabled={eventsPage * eventsPageSize >= filteredEvents.length}
                      onClick={() => setEventsPage(p => p + 1)}
                      className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 disabled:opacity-50 disabled:hover:bg-slate-50 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer"
                    >
                      Next Page
                    </button>
                  </div>
                )}
              </div>

              {/* OVERLAY MODAL: EVENT DETAILS / VIEW ROSTER */}
              {viewingEventDetail && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-[90] animate-fade-in overflow-y-auto">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 space-y-6 animate-slide-up relative my-8">
                    
                    {/* Header bar */}
                    <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                      <div className="flex gap-3.5 items-center">
                        <div className="w-12 h-12 rounded-lg bg-red-500 overflow-hidden shrink-0 border">
                          <img src={viewingEventDetail.flyerUrl} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold font-mono text-red-600 uppercase">EVENT METRIC SUMMARY</span>
                          <h4 className="text-base font-extrabold text-slate-950 truncate max-w-md">{viewingEventDetail.name}</h4>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setViewingEventDetail(null);
                          setViewingEventTickets([]);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Left: Metadata and category breakdown */}
                      <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-xs">
                          <div className="flex items-center gap-2 text-slate-700">
                            <Clock className="h-4 w-4 text-red-500 shrink-0" />
                            <span><strong>Date:</strong> {new Date(viewingEventDetail.eventDate).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-700">
                            <MapPin className="h-4 w-4 text-red-500 shrink-0" />
                            <span><strong>Venue Location:</strong> {viewingEventDetail.venue}</span>
                          </div>
                          <div className="pt-2 border-t text-slate-500 leading-normal">
                            {viewingEventDetail.description || "No public notes specified."}
                          </div>
                        </div>

                        {/* Category breakdown table */}
                        <div className="space-y-2">
                          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category allocations</h5>
                          <div className="bg-white border rounded-xl overflow-hidden text-xs">
                            <table className="w-full text-left">
                              <thead className="bg-slate-50 border-b">
                                <tr className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">
                                  <th className="p-2.5">Pass Level</th>
                                  <th className="p-2.5">Price</th>
                                  <th className="p-2.5 text-right">Remaing / Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-mono">
                                {viewingEventDetail.categories?.map((cat) => (
                                  <tr key={cat.id}>
                                    <td className="p-2.5 font-sans font-semibold text-slate-800">{cat.name}</td>
                                    <td className="p-2.5 font-bold">KES {cat.price.toLocaleString()}</td>
                                    <td className="p-2.5 text-right font-black text-slate-900">{cat.remainingQuantity} / {cat.totalQuantity}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Right: Guest Checkin List & CSV Downloader */}
                      <div className="space-y-3 flex flex-col justify-between">
                        <div className="space-y-2 flex-1">
                          
                          <div className="flex justify-between items-center">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attendees</h5>
                            <span className="text-[9px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 rounded">
                              {viewingEventTickets.length} Gate Passes
                            </span>
                          </div>

                          <div className="border rounded-xl bg-slate-50 max-h-56 overflow-y-auto text-xs p-2 space-y-1.5 font-mono">
                            {loadingEventTickets ? (
                              <div className="py-12 flex flex-col items-center gap-1.5 text-slate-400">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Loading...</span>
                              </div>
                            ) : viewingEventTickets.length === 0 ? (
                              <div className="py-12 text-center text-slate-400 text-xs font-sans">
                                No tickets issued for this event code yet.
                              </div>
                            ) : (
                              viewingEventTickets.map((t, idx) => (
                                <div key={t.id || idx} className="bg-white border p-2 rounded-lg flex justify-between items-center">
                                  <div>
                                    <div className="font-bold text-slate-800 text-[11px]">{t.id}</div>
                                    <span className="text-[9px] text-slate-400 block font-sans">Pass No. {t.ticketNumber} • {t.status}</span>
                                  </div>
                                  <span className="text-[9px] font-bold font-sans bg-slate-100 rounded px-1 text-slate-600 uppercase">
                                    {t.status}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Guest Download Action */}
                        <div className="space-y-2">
                          <a 
                            href={`/api/events/${viewingEventDetail.eventCode}/tickets?export=csv&token=${token}`}
                            download={`attendees_${viewingEventDetail.eventCode}.csv`}
                            className="w-full bg-slate-950 hover:bg-slate-850 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                          >
                            <Download className="h-4 w-4" /> Download Attendee Guest CSV
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              const pathUrl = `${window.location.origin}/?event=${viewingEventDetail.eventCode}`;
                              navigator.clipboard.writeText(pathUrl);
                              showToast("Direct gate payment path copied to clipboard!", "success");
                            }}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold p-1.5 rounded-lg border transition cursor-pointer"
                          >
                            Copy Customer Booking Link
                          </button>
                        </div>

                      </div>

                    </div>

                  </div>
                </div>
              )}

              {/* OVERLAY MODAL: EDIT MAIN EVENT PARAMETERS */}
              {editingEvent && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-[90] animate-fade-in overflow-y-auto">
                  <form onSubmit={handleUpdateEvent} className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 animate-slide-up my-8">
                    
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm uppercase">Modify Concert Specifications</h4>
                        <p className="text-[11px] text-slate-400">&nbsp;</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setEditingEvent(null)}
                        className="text-slate-450 hover:text-slate-900 p-1 rounded-lg"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Revise Name Title</label>
                        <input
                          type="text"
                          required
                          value={editEventName}
                          onChange={(e) => setEditEventName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-red-500 rounded-lg px-3.5 py-2 text-xs font-semibold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Revise Date</label>
                          <input
                            type="datetime-local"
                            required
                            value={editEventDate}
                            onChange={(e) => setEditEventDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Sales Release Status</label>
                          <select
                            value={editEventStatus}
                            onChange={(e: any) => setEditEventStatus(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 text-xs font-bold"
                          >
                            <option value="draft">Draft Release (Gate Closed)</option>
                            <option value="active">Active Sales (Gate Open)</option>
                            <option value="past">Completed (Gate Closed)</option>
                            <option value="cancelled">Cancelled (Sales Locked)</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Physical Venue Location</label>
                        <input
                          type="text"
                          required
                          value={editEventVenue}
                          onChange={(e) => setEditEventVenue(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-red-500 rounded-lg px-3.5 py-2 text-xs font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Poster Image Link Url</label>
                        <input
                          type="url"
                          value={editEventFlyer}
                          onChange={(e) => setEditEventFlyer(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3.5 py-2 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Concert Public Notes Notes</label>
                        <textarea
                          rows={2.5}
                          value={editEventDesc}
                          onChange={(e) => setEditEventDesc(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg p-3 text-xs"
                        ></textarea>
                      </div>
                    </div>

                    <div className="pt-3 border-t flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingEvent(null)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2 px-4 rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-slate-900 hover:bg-red-650 text-white text-xs font-bold py-2 px-5 rounded-lg transition"
                      >
                        Publish Changes
                      </button>
                    </div>

                  </form>
                </div>
              )}

              {/* CONFIRMATION OVERLAY: SOFT EVENT CANCELLATION */}
              {deletingEvent && (
                <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 z-[95] animate-fade-in">
                  <div className="bg-white rounded-2xl border border-rose-200 p-6 max-w-sm w-full space-y-4 animate-slide-up text-left shadow-2xl">
                    <div className="flex gap-3 text-rose-600">
                      <AlertTriangle className="h-6 w-6 shrink-0" />
                      <div>
                        <h4 className="font-extrabold text-slate-950 text-sm uppercase">Cancel Tickets Gate?</h4>
                        <p className="text-[10px] text-rose-500 mt-0.5">WARNING: ACTION INITIATES INSTANT SALES TERMINATION</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-normal font-sans">
                      Are you sure you want to cancel <strong>{deletingEvent.name}</strong>? This will close ticket sales and mark the event as cancelled. Existing tickets remain valid.
                    </p>

                    <div className="flex justify-end gap-2 text-xs pt-2">
                      <button
                        type="button"
                        onClick={() => setDeletingEvent(null)}
                        className="bg-slate-50 hover:bg-slate-100 border px-3.5 py-1.5 rounded-lg text-slate-650 font-bold transition cursor-pointer"
                      >
                        No, keep active
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteEvent}
                        className="bg-rose-650 hover:bg-rose-700 text-white px-4 py-1.5 rounded-lg font-bold transition shadow-sm cursor-pointer"
                      >
                        Cancel Event permanently
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ==================================== TAB 4: WALLET & FINANCE LEDGER ==================================== */}
          {activeTab === "wallet" && (
            <div className="space-y-6 animate-fade-in pb-12">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-950 tracking-tight">Payouts</h3>
                  <p className="text-xs text-slate-500">Request payouts and view transaction history.</p>
                </div>
              </div>

              {/* DYNAMIC METRICS FOR ORGANIZER FINANCES */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Total Booking Sales</span>
                    <BarChart3 className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="text-2xl font-black text-slate-950 font-mono mt-2">
                    KES {walletOverview?.grossCollected ? walletOverview.grossCollected.toLocaleString() : "0"}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 font-mono flex justify-between">
                    <span>Platform Fee (5%):</span>
                    <span className="font-bold">KES {walletOverview?.platformFees ? walletOverview.platformFees.toLocaleString() : "0"}</span>
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden bg-gradient-to-tr from-slate-50 to-transparent">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Withdrawn / Processing</span>
                    <TrendingDown className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="text-2xl font-black text-slate-950 font-mono mt-2">
                    KES {walletOverview?.payouts ? walletOverview.payouts.reduce((sum: number, p: any) => sum + p.amount, 0).toLocaleString() : "0"}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-emerald-500" />
                    <span>Processed</span>
                  </p>
                </div>

                <div className="bg-[#0F172A] p-5 rounded-2xl shadow-sm relative overflow-hidden text-white">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-300 block uppercase font-bold tracking-wider">Available For Sweep</span>
                    <Wallet className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono mt-2">
                    KES {walletOverview?.availableBalance ? walletOverview.availableBalance.toLocaleString() : "0"}
                  </div>
                  <p className="text-[10px] text-emerald-400 mt-2 font-bold flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Minimum payout: KES 100
                  </p>
                  <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-10">
                    <ShieldCheck className="h-28 w-28 text-white" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                
                {/* PAYOUT REQUEST PANEL */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/85 lg:col-span-2 space-y-4">
                  <div className="border-b border-sublte pb-3">
                    <h4 className="font-extrabold text-slate-950 text-sm uppercase">Request Payout</h4>
                    <p className="text-xs text-slate-400 mt-1">Request an instant payout to your registered number.</p>
                  </div>

                  <form onSubmit={handlePayoutRequest} className="space-y-4">
                    {payoutError && (
                      <div className="bg-rose-50 text-rose-600 text-xs p-3 rounded-xl border border-rose-100 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{payoutError}</span>
                      </div>
                    )}
                    {payoutSuccess && (
                      <div className="bg-emerald-50 text-emerald-700 text-xs p-3 rounded-xl border border-emerald-100 font-bold flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{payoutSuccess}</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Payout Number</label>
                      <input
                        type="text"
                        disabled
                        value={organizer?.mpesaPayoutNumber || "254712345678"}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Withdrawal Amount (KES)</label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          placeholder="e.g. 1000"
                          value={payoutAmount}
                          onChange={(e) => setPayoutAmount(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-lg pl-12 pr-4 py-2 text-xs font-mono font-black"
                        />
                        <span className="absolute left-3.5 top-2 text-[10px] font-mono text-slate-400 font-bold">KES</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={payoutLoading || !payoutAmount}
                      className="w-full bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      {payoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4 text-emerald-400" />}
                      Authorize Payout
                    </button>
                  </form>

                </div>

                {/* DUAL TABLE ARCHIVES (AUDIT LEDGER vs DISBURSEMENT HISTORY) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/85 lg:col-span-3 space-y-4">
                  
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                      <button
                        onClick={() => setWalletSubTab("ledger")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          walletSubTab === "ledger" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        Sales History
                      </button>
                      <button
                        onClick={() => setWalletSubTab("payouts")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          walletSubTab === "payouts" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        Payout History
                        {walletOverview?.payouts && walletOverview.payouts.some((p: any) => p.status === "requested") && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                        )}
                      </button>
                    </div>

                    <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded tracking-wide shrink-0">
                      History
                    </span>
                  </div>

                  {/* SUBTAB 1: INTERNAL LEDGER */}
                  {walletSubTab === "ledger" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-700 min-w-[500px]">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold text-[9px] tracking-wider">
                              <th className="pb-2">Reference</th>
                              <th className="pb-2">Type</th>
                              <th className="pb-2">Fee (5%)</th>
                              <th className="pb-2 text-right">Net Profit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {loading || !walletOverview ? (
                              Array.from({ length: 3 }).map((_, i) => (
                                <tr key={i} className="h-10">
                                  <td colSpan={4} className="shimmer-bg rounded my-1.5"></td>
                                </tr>
                              ))
                            ) : !walletOverview.ledger || walletOverview.ledger.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                                  No sales recorded yet.
                                </td>
                              </tr>
                            ) : (
                              walletOverview.ledger.map((item: LedgerEntry) => {
                                const isSale = item.entryType === "sale";
                                return (
                                  <tr key={item.id} className="hover:bg-slate-50/50 transition">
                                    <td className="py-3 font-mono font-medium">
                                      <div className="font-bold text-slate-900">{item.id}</div>
                                      <span className="text-[9px] text-slate-400 block mt-0.5">{new Date(item.createdAt).toLocaleString()}</span>
                                    </td>
                                    <td className="py-3 font-semibold text-slate-600 uppercase text-[9px]">{item.entryType}</td>
                                    <td className="py-3 text-slate-500 font-mono">
                                      {item.platformFee > 0 ? `KES ${item.platformFee.toLocaleString()}` : "—"}
                                    </td>
                                    <td className={`py-3 text-right font-black font-mono text-xs ${isSale ? "text-slate-900" : "text-rose-600"}`}>
                                      {isSale ? "+" : ""}KES {item.netAmount.toLocaleString()}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* SUBTAB 2: MPESA PAYOUT SPECK RECORDS */}
                  {walletSubTab === "payouts" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-700 min-w-[500px]">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold text-[9px] tracking-wider">
                              <th className="pb-2">Reference</th>
                              <th className="pb-2">Transaction ID</th>
                              <th className="pb-2">Amount</th>
                              <th className="pb-2 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {loading || !walletOverview ? (
                              Array.from({ length: 3 }).map((_, i) => (
                                <tr key={i} className="h-10">
                                  <td colSpan={4} className="shimmer-bg rounded my-1.5"></td>
                                </tr>
                              ))
                            ) : !walletOverview.payouts || walletOverview.payouts.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                                  No payout requests yet.
                                </td>
                              </tr>
                            ) : (
                              [[...walletOverview.payouts].reverse()[0], ...walletOverview.payouts.slice(0, walletOverview.payouts.length - 1)].filter(Boolean).map((payout: any, pIdx: number) => {
                                return (
                                  <tr key={payout.id || pIdx} className="hover:bg-slate-50/50 transition">
                                    <td className="py-3 font-mono">
                                      <div className="font-bold text-slate-900">{payout.id}</div>
                                      <span className="text-[9px] text-slate-400 block mt-0.5">
                                        Requested: {new Date(payout.requestedAt).toLocaleDateString()}
                                      </span>
                                    </td>
                                    <td className="py-3 font-mono text-slate-500 font-bold">
                                      {payout.mpesaTransactionId || (
                                        <span className="text-slate-455 italic flex items-center gap-1 text-[10px]">
                                          <Loader2 className="h-3 w-3 animate-spin text-amber-500" /> Pending
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 font-black font-mono text-slate-900">
                                      KES {payout.amount.toLocaleString()}
                                    </td>
                                    <td className="py-3 text-right">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                        payout.status === "completed" 
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                          : payout.status === "requested"
                                          ? "bg-amber-50 text-amber-700 border border-amber-100 animate-pulse"
                                          : "bg-slate-100 text-slate-600"
                                      }`}>
                                        {payout.status}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

          {/* ==================================== TAB 5: KYC IDENTIFICATION & PROFILE ==================================== */}
          {activeTab === "kyc" && (
            <div className="space-y-6 animate-fade-in pb-12">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-950 tracking-tight">Onboarding & Security Desk</h3>
                  <p className="text-xs text-slate-500">Submit your business details for identity verification.</p>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-xs font-bold font-sans uppercase border ${
                  organizer?.kycStatus === "verified"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : organizer?.kycStatus === "pending"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}>
                  Status: {organizer?.kycStatus || "unverified"} Verification
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* COLUMN 1: CORPORATE PROFILE DETAILS */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-7 space-y-6">
                  
                  <div className="border-b border-slate-100 pb-3">
                    <h4 className="font-extrabold text-slate-900 text-sm uppercase">Organizer Contact Coordinates</h4>
                    <p className="text-xs text-slate-400 mt-1">These values represent public representation targets for checkout pages.</p>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Contact Organizer Name</label>
                        <input
                          type="text"
                          required
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-red-500 rounded-lg px-3 py-2 text-xs font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Registered Company Title</label>
                        <input
                          type="text"
                          required
                          value={profileBusinessName}
                          onChange={(e) => setProfileBusinessName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-red-500 rounded-lg px-3 py-2 text-xs font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Public Telephone Number</label>
                        <input
                          type="text"
                          required
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-red-500 rounded-lg px-3 py-2 text-xs font-mono font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">M-Pesa Payout Number (254...)</label>
                        <input
                          type="text"
                          required
                          value={profilePayoutNumber}
                          onChange={(e) => setProfilePayoutNumber(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-red-500 rounded-lg px-3 py-2 text-xs font-mono font-black"
                        />
                      </div>

                    </div>

                    <div className="border-t border-slate-100 pt-4 flex justify-end">
                      <button
                        type="submit"
                        className="bg-slate-900 hover:bg-red-650 text-white font-bold py-2 px-5 rounded-xl text-xs transition cursor-pointer"
                      >
                        Update Profile Coordinates
                      </button>
                    </div>
                  </form>
                </div>

                {/* COLUMN 2: KYC COMPLIANCE VERIFICATION DOSSIER */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-5 space-y-6">
                  
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm uppercase">KYC Enterprise Verifier</h4>
                      <p className="text-[11px] text-slate-455 mt-1 leading-normal">
                        Upload your business registration certificate for verification.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleKYCUpload} className="space-y-4 border-t border-slate-100 pt-4">
                    
                    <div className="grid grid-cols-1 gap-3.5 text-xs">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Legal Business Entity Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Sauti Sol Music Productions Ltd"
                          value={kycBusinessName}
                          onChange={(e) => setKycBusinessName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 text-xs font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">KRA Business PIN</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. P05128391A"
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 text-xs font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Enterprise Registration Document (PDF/Certificate image)</label>
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-red-500 transition bg-slate-50/50">
                        <Layers className="h-6 w-6 text-slate-400 mx-auto mb-1 flex animate-pulse" />
                        <span className="text-[11px] font-bold text-slate-800 block">Drag certificate here or select file</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Maximum file limit: 5MB</span>
                      </div>
                    </div>

                    {kycSubmitted ? (
                      <div className="bg-emerald-50 text-emerald-700 text-[10px] p-3 rounded-xl border border-emerald-100 leading-normal font-medium font-sans">
                        ✓ <strong>Documents submitted.</strong> Verification usually takes up to 24 hours.
                      </div>
                    ) : (
                      <button
                        type="submit"
                        disabled={kycLoading || !kycBusinessName}
                        className="w-full bg-red-650 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer flex justify-center items-center gap-1.5"
                      >
                        {kycLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Submit Verification Dossier
                      </button>
                    )}
                  </form>
                </div>

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
