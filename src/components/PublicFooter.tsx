import React, { useState } from "react";
import { Facebook, Twitter, Instagram, Youtube, Phone, Mail, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";

interface PublicFooterProps {
  onOrganizerClick: () => void;
  onBrowseEventsClick?: () => void;
  onPolicyClick?: (section: "refund" | "privacy" | "cookies" | "terms") => void;
  onCookiePreferencesClick?: () => void;
}

export default function PublicFooter({ onOrganizerClick, onBrowseEventsClick, onPolicyClick, onCookiePreferencesClick }: PublicFooterProps) {
  const currentYear = new Date().getFullYear();
  const [activeModal, setActiveModal] = useState<"refund" | "privacy" | "terms" | "how-it-works" | null>(null);

  const handleBrowseEvents = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onBrowseEventsClick) {
      onBrowseEventsClick();
    } else {
      const searchEl = document.getElementById("hero-search-input");
      if (searchEl) {
        searchEl.focus();
        searchEl.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <footer id="public-landing-footer" className="bg-slate-50 border-t border-slate-200/80 py-12 px-6 sm:px-8 mt-16 w-full font-sans">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* ROW 1: MULTI-COLUMN MAIN FOOTER CONTENT */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* COLUMN 1: BRAND SECTION */}
          <div className="space-y-4">
            <div className="flex items-center">
              <img src="/assets/otikologo.png" alt="Otiko" className="h-5 w-auto" />
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Your gateway to live events in Kenya. Book concert tickets, discover local festivals, and attend the best experiences near you.
            </p>

            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <a href="mailto:info@otiko.com" className="hover:text-red-650 transition-colors font-medium">
                  info@otiko.com
                </a>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <a href="tel:0722839617" className="hover:text-red-650 transition-colors font-semibold">
                  0722839617
                </a>
              </div>
            </div>
          </div>

          {/* COLUMN 2: QUICK LINKS */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quick Links</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={handleBrowseEvents}
                  className="text-slate-550 hover:text-red-650 transition-colors duration-150 font-medium cursor-pointer"
                >
                  Browse Events
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveModal("how-it-works")}
                  className="text-slate-550 hover:text-red-650 transition-colors duration-150 font-medium cursor-pointer"
                >
                  How It Works
                </button>
              </li>
              <li>
                <a
                  href="mailto:info@otiko.com"
                  className="text-slate-550 hover:text-red-650 transition-colors duration-150 font-medium"
                >
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* COLUMN 3: LEGAL POLICIES */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Legal</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={() => onPolicyClick ? onPolicyClick("refund") : setActiveModal("refund")}
                  className="text-slate-550 hover:text-red-650 transition-colors duration-150 font-medium text-left cursor-pointer"
                >
                  Refund Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onPolicyClick ? onPolicyClick("privacy") : setActiveModal("privacy")}
                  className="text-slate-550 hover:text-red-650 transition-colors duration-150 font-medium text-left cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onPolicyClick ? onPolicyClick("cookies") : setActiveModal("privacy")}
                  className="text-slate-550 hover:text-red-650 transition-colors duration-150 font-medium text-left cursor-pointer"
                >
                  Cookie Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onPolicyClick ? onPolicyClick("terms") : setActiveModal("terms")}
                  className="text-slate-550 hover:text-red-650 transition-colors duration-150 font-medium text-left cursor-pointer"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={() => onCookiePreferencesClick?.()}
                  className="text-slate-550 hover:text-red-650 transition-colors duration-150 font-medium text-left cursor-pointer"
                >
                  Cookie Preferences
                </button>
              </li>
            </ul>
          </div>

          {/* COLUMN 4: SOCIAL & WORKSPACE ACCESS */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Organizer Portal</h4>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you an event master? Easily register to host tickets, handle transactions and manage access keys live.
            </p>

            <button
              onClick={onOrganizerClick}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:text-red-650 transition-colors duration-150 group cursor-pointer focus:outline-none"
            >
              <span>Organizer Workspace</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Social Icons Container */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://facebook.com"
                target="_blank"
                referrerPolicy="no-referrer"
                className="p-1.5 bg-white border border-slate-200/60 hover:bg-slate-100 text-slate-450 hover:text-red-650 rounded-lg transition-colors duration-150"
                aria-label="Facebook"
              >
                <Facebook className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                referrerPolicy="no-referrer"
                className="p-1.5 bg-white border border-slate-200/60 hover:bg-slate-100 text-slate-450 hover:text-red-650 rounded-lg transition-colors duration-150"
                aria-label="X (formerly Twitter)"
              >
                <Twitter className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                referrerPolicy="no-referrer"
                className="p-1.5 bg-white border border-slate-200/60 hover:bg-slate-100 text-slate-450 hover:text-red-650 rounded-lg transition-colors duration-150"
                aria-label="Instagram"
              >
                <Instagram className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                referrerPolicy="no-referrer"
                className="p-1.5 bg-white border border-slate-200/60 hover:bg-slate-100 text-slate-450 hover:text-red-650 rounded-lg transition-colors duration-150"
                aria-label="YouTube"
              >
                <Youtube className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

        </div>

        {/* ROW 2: DIVIDER */}
        <hr className="border-t border-slate-200/60" />

        {/* ROW 3: BOTTOM COPYRIGHT & TRUST INDICATORS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-450 font-medium">
          <div>
            &copy; {currentYear} Otiko.com. All rights reserved.
          </div>
          
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200/60 shadow-sm text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span className="text-slate-500">Payments secured securely by</span>
            <span className="font-extrabold text-[#39B54A]">M-Pesa</span>
          </div>
        </div>

      </div>

      {/* POLICY & HOW-IT-WORKS LIGHTWEIGHT INTEGRATED SLID-IN MODALS */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-250 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                {activeModal === "refund" && "Refund Policy"}
                {activeModal === "privacy" && "Privacy & Cookie Policy"}
                {activeModal === "terms" && "Terms & Conditions of Attendance"}
                {activeModal === "how-it-works" && "How To Buy Tickets"}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-1 transition-colors text-xs font-bold leading-none w-6 h-6 flex items-center justify-center shrink-0 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="text-xs text-slate-650 leading-relaxed space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {activeModal === "refund" && (
                <>
                  <p className="font-semibold text-slate-900">1. Instant Safaricom Refunds</p>
                  <p>All ticket purchases through Otiko are fully claimable within 24 hours of purchase if requested before the scheduled gate opening time.</p>
                  <p className="font-semibold text-slate-900">2. Event Cancellation Guard</p>
                  <p>If an event is cancelled or postponed, our escrow account triggers automatic reversed payout balances instantly. No complex bank paperwork is required; funds arrive back to your original paying M-Pesa line.</p>
                </>
              )}
              {activeModal === "privacy" && (
                <>
                  <p>At Otiko, your data safety is our top priority. We do not aggregate, sell, or tracking-market your personal contacts to any third-party advertising companies.</p>
                  <p className="font-semibold text-slate-900">Billing details:</p>
                  <p>Your M-Pesa mobile transaction codes and phone contacts are processed strictly for Safaricom C2B API routing and validation checks. No persistent security credit logs are kept in browser cookie caches.</p>
                </>
              )}
              {activeModal === "terms" && (
                <>
                  <p>By reserving a ticket on this open platform, you agree to comply with standard Kenyan safety guidelines.</p>
                  <p>1. Every bar-coded virtual ticket pass represents a unique entry ledger token and must not be resold to third-party brokers.</p>
                  <p>2. Physical or digital duplication of barcodes will fail checking at the scanner terminal gateway, resulting in automatic invalidation.</p>
                </>
              )}
              {activeModal === "how-it-works" && (
                <>
                  <p>Reserving high-demand tickets in Nairobi has never been easier:</p>
                  <ol className="list-decimal pl-4 space-y-2">
                    <li>Choose your preferred concert or festival from the active showcase listing grid.</li>
                    <li>Select the ticket tier (Regular, VIP, or Golden Circle) and input your accurate details.</li>
                    <li>Click <strong>Request Checkout</strong> to prompt a simulated M-Pesa push notification on your interface.</li>
                    <li>Instantly download your validated entry ticket and receipt directly to your console!</li>
                  </ol>
                </>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 text-right">
              <button
                onClick={() => setActiveModal(null)}
                className="bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

    </footer>
  );
}
