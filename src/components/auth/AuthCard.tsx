import React from "react";
import { ArrowLeft } from "lucide-react";

interface AuthCardProps {
  children: React.ReactNode;
  onBackToHome: () => void;
}

export default function AuthCard({ children, onBackToHome }: AuthCardProps) {
  return (
    <div id="auth-card-view" className="min-h-screen w-full bg-[#F3F4F6] flex flex-col items-center justify-center p-4 relative font-sans">
      
      {/* Back to Home Action */}
      <button
        onClick={onBackToHome}
        className="absolute top-6 left-6 flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors focus:ring-2 focus:ring-red-500 rounded-lg p-1"
        aria-label="Back to Home"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Home</span>
      </button>

      {/* Main Authed Box container */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl max-w-[420px] w-full p-8 space-y-6 shrink-0 relative">
        {/* Brand visual header inside card */}
        <div className="flex flex-col items-center space-y-2">
          <div className="w-10 h-10 bg-[#0F172A] rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-md">
            O
          </div>
          <div className="text-center">
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none flex items-center justify-center gap-0.5">
              Otiko<span className="text-red-500">.com</span>
            </h1>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
