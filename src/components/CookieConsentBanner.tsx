import React, { useState, useEffect, useRef } from "react";
import { X, Check, Settings, ChevronDown, ChevronUp, Cookie } from "lucide-react";
import { getConsent, setConsent, clearConsent, type ConsentSettings } from "../lib/cookieConsent";
import { clearAllPreferences } from "../lib/preferenceCache";

interface ConsentBannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CookieConsentBanner({ open, onOpenChange }: ConsentBannerProps) {
  const [mode, setMode] = useState<"banner" | "customize">("banner");
  const [functional, setFunctional] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      const existing = getConsent();
      if (!existing) {
        setShowBanner(true);
      } else {
        setShowBanner(false);
      }
    } else {
      setShowBanner(true);
    }
  }, [open]);

  useEffect(() => {
    if (mode === "customize" && dialogRef.current) {
      const timer = setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== "customize") return;
      if (e.key === "Escape") {
        setMode("banner");
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mode]);

  const handleAcceptAll = () => {
    setConsent({ functional: true, analytics: true });
    setShowBanner(false);
    onOpenChange(false);
  };

  const handleRejectNonEssential = () => {
    setConsent({ functional: false, analytics: false });
    clearAllPreferences();
    setShowBanner(false);
    onOpenChange(false);
  };

  const handleSaveCustom = () => {
    setConsent({ functional, analytics });
    if (!functional) clearAllPreferences();
    setMode("banner");
    setShowBanner(false);
    onOpenChange(false);
  };

  const handleOpenCustomize = () => {
    const existing = getConsent();
    setFunctional(existing?.functional ?? false);
    setAnalytics(existing?.analytics ?? false);
    setMode("customize");
  };

  const handleCloseCustomize = () => {
    setMode("banner");
  };

  if (!showBanner) return null;

  const isCustomize = mode === "customize";

  if (!isCustomize) {
    return (
      <div
        role="dialog"
        aria-modal="false"
        aria-label="Cookie consent"
        className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-slate-200 shadow-2xl p-4 sm:p-5 animate-fade-in"
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Cookie className="h-5 w-5 text-slate-400 shrink-0 mt-0.5 hidden sm:block" />
            <div>
              <p className="text-sm font-bold text-slate-900">We value your privacy</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                We use cookies and similar technologies to help the platform function reliably, remember your preferences, and understand how you use Otiko. You can choose which categories to allow.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              ref={firstFocusableRef}
              onClick={handleOpenCustomize}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5"
            >
              <Settings className="h-3.5 w-3.5" />
              Customize
            </button>
            <button
              onClick={handleRejectNonEssential}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:border-slate-400 px-4 py-2 rounded-lg transition cursor-pointer"
            >
              Reject Non-Essential
            </button>
            <button
              onClick={handleAcceptAll}
              className="text-xs font-bold text-white bg-red-600 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              Accept All
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Cookie preferences"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cookie className="h-5 w-5 text-slate-700" />
            <h2 className="text-base font-extrabold text-slate-900">Cookie Preferences</h2>
          </div>
          <button
            onClick={handleCloseCustomize}
            className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-1 transition-colors w-7 h-7 flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Choose which cookies to allow. Essential cookies are always enabled for the platform to function. Your choice will be saved and can be changed at any time via the Cookie Preferences link in the footer.
        </p>

        <div className="space-y-3">
          {/* Essential - always on */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-sm font-bold text-slate-900">Essential</p>
              <p className="text-xs text-slate-500">Required for platform operation — auth token, security features. Cannot be disabled.</p>
            </div>
            <div className="bg-slate-200 text-slate-500 text-[10px] font-bold px-2 py-1 rounded uppercase">Always On</div>
          </div>

          {/* Functional - toggle */}
          <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-sm font-bold text-slate-900">Functional</p>
              <p className="text-xs text-slate-500">Remembers your preferences — sidebar state, dashboard view, theme, locale, page size, and active filters. Reduces redundant recomputation on return visits.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={functional}
                onChange={(e) => setFunctional(e.target.checked)}
                className="sr-only peer"
                aria-label="Functional cookies toggle"
              />
              <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-black peer-focus:ring-2 peer-focus:ring-slate-300 transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform" />
            </label>
          </div>

          {/* Analytics - toggle */}
          <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-sm font-bold text-slate-900">Analytics</p>
              <p className="text-xs text-slate-500">Helps us understand how visitors use the platform. No analytics tooling is currently active — this category is reserved for future use.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="sr-only peer"
                aria-label="Analytics cookies toggle"
              />
              <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-black peer-focus:ring-2 peer-focus:ring-slate-300 transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform" />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={handleCloseCustomize}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg transition cursor-pointer"
          >
            Back
          </button>
          <button
            onClick={handleSaveCustom}
            className="text-xs font-bold text-white bg-red-600 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5"
          >
            <Check className="h-3.5 w-3.5" />
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
