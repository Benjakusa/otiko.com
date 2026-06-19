import React, { useState } from "react";
import { AlertTriangle, Loader2, CheckCircle, Trash2, ShieldOff } from "lucide-react";

interface DeleteAccountSectionProps {
  token: string;
  organizerName: string;
  onAccountDeleted: () => void;
}

type DeleteStep = "initial" | "confirm-password" | "final-confirm" | "processing" | "result";

export default function DeleteAccountSection({ token, organizerName, onAccountDeleted }: DeleteAccountSectionProps) {
  const [step, setStep] = useState<DeleteStep>("initial");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ deleted?: boolean; deactivated?: boolean; message: string } | null>(null);

  const handleInitiate = () => {
    setError("");
    setStep("confirm-password");
  };

  const handlePasswordSubmit = async () => {
    if (!password) { setError("Please enter your password."); return; }
    setError("");
    setStep("final-confirm");
  };

  const handleExecuteDeletion = async () => {
    setStep("processing");
    setError("");
    try {
      const res = await fetch("/api/organizers/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to delete account.");
        setStep("final-confirm");
        return;
      }
      setResult(data);
      setStep("result");
    } catch {
      setError("Network error. Please try again.");
      setStep("final-confirm");
    }
  };

  const goBack = () => {
    setError("");
    if (step === "confirm-password") setStep("initial");
    else if (step === "final-confirm") setStep("confirm-password");
  };

  if (step === "result" && result) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        {result.deleted ? (
          <div className="flex flex-col items-center text-center py-6 space-y-3">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h4 className="text-lg font-extrabold text-slate-900">Account Deleted</h4>
            <p className="text-sm text-slate-500 max-w-md">{result.message}</p>
            <button
              onClick={onAccountDeleted}
              className="mt-4 bg-red-600 hover:bg-blue-600 hover:text-white text-white text-xs font-bold px-6 py-2.5 rounded-xl transition cursor-pointer"
            >
              Return to Home
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center py-6 space-y-3">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
              <ShieldOff className="h-6 w-6 text-amber-600" />
            </div>
            <h4 className="text-lg font-extrabold text-slate-900">Account Deactivated</h4>
            <p className="text-sm text-slate-500 max-w-md">{result.message}</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700 text-left max-w-md">
              <p className="font-bold mb-1">What happens next?</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Your events have been cancelled and are no longer visible to buyers.</li>
                <li>You can no longer log in to this account.</li>
                <li>Ticket records for past purchases are preserved for customer reference.</li>
                <li>If you need to reactivate or have questions, contact support.</li>
              </ul>
            </div>
            <button
              onClick={onAccountDeleted}
              className="mt-2 bg-red-600 hover:bg-blue-600 hover:text-white text-white text-xs font-bold px-6 py-2.5 rounded-xl transition cursor-pointer"
            >
              Return to Home
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-rose-50">
          <Trash2 className="h-5 w-5 text-rose-500" />
        </div>
        <div>
          <h4 className="font-bold text-slate-900 text-sm">Delete Account</h4>
          <p className="text-xs text-slate-500 mt-1">Permanently remove your account and associated data.</p>
        </div>
      </div>

      {step === "initial" && (
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-700 space-y-2">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Warning
            </p>
            <p>Deleting your account is permanent and cannot be undone. Depending on your account status:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>No tickets sold</strong> — All your data will be permanently deleted, including events, tickets, and payout records.</li>
              <li><strong>Tickets have been sold</strong> — Your account will be deactivated, events cancelled, and login access removed. Ticket and financial records are retained for audit and customer support.</li>
            </ul>
          </div>
          <button
            onClick={handleInitiate}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer"
          >
            Continue with Deletion
          </button>
        </div>
      )}

      {step === "confirm-password" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-600">Please enter your account password to confirm your identity.</p>
          {error && (
            <div className="bg-rose-50 text-rose-600 text-xs p-3 rounded-lg border border-rose-100 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
            </div>
          )}
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              onClick={goBack}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg transition cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={handlePasswordSubmit}
              disabled={!password}
              className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === "final-confirm" && (
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-700 space-y-2">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Final Confirmation Required
            </p>
            <p>This action is irreversible. Are you absolutely sure you want to delete the account for <strong>{organizerName}</strong>?</p>
          </div>
          {error && (
            <div className="bg-rose-50 text-rose-600 text-xs p-3 rounded-lg border border-rose-100 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={goBack}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg transition cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={handleExecuteDeletion}
              disabled={step === "processing"}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              {step === "processing" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Permanently Delete Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
