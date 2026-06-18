import React, { useState } from "react";
import { CheckCircle2, AlertCircle, QrCode, ScanLine } from "lucide-react";

interface TicketScannerSimProps {
  onClose: () => void;
}

export default function TicketScannerSim({ onClose }: TicketScannerSimProps) {
  const [ticketInput, setTicketInput] = useState("");
  const [scannedTicket, setScannedTicket] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketInput.trim()) return;

    setLoading(true);
    setError(null);
    setScannedTicket(null);

    // QR payload format: "ticketNumber:verificationCode|Event|Organizer|Type|Amount|Date|Otiko.com"
    const raw = ticketInput.trim();
    const pipeParts = raw.split("|");
    const creds = pipeParts[0] || raw;
    const colonIdx = creds.indexOf(":");
    const ticketNumber = colonIdx >= 0 ? creds.slice(0, colonIdx) : creds;
    const verificationCode = colonIdx >= 0 ? creds.slice(colonIdx + 1) : "";

    try {
      const response = await fetch(`/api/tickets/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketNumber, verificationCode }),
      });

      const data = await response.json();
      if (!response.ok || data.valid === false) {
        setError(data.error || "Failed to verify ticket scan.");
      } else {
        setScannedTicket(data.ticket);
      }
    } catch (err) {
      setError("Server connection issue. Please verify endpoint state.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ScanLine className="h-6 w-6 text-emerald-600" />
            <h3 className="font-semibold text-lg text-slate-900">Ticket Validator</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
          >
            Close
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-slate-500 mb-6">
            Paste the ticket code from the QR code to verify ticket authenticity at the gate.
          </p>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Ticket Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. OTK-EVENT-00001:a1b2c3d4"
                  value={ticketInput}
                  onChange={(e) => setTicketInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none transition"
                />
                <QrCode className="absolute right-3 top-3 h-5 w-5 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !ticketInput.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-xl disabled:bg-slate-200 disabled:text-slate-400 transition duration-150"
            >
              {loading ? "Verifying..." : "Verify Ticket"}
            </button>
          </form>

          {scannedTicket && (
            <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-3 animate-slide-up">
              <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
                <CheckCircle2 className="h-5 w-5" />
                Access Approved
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs border-t border-emerald-200 pt-3 text-slate-600">
                <span className="text-slate-500">Event:</span>
                <span className="font-medium text-slate-900">{scannedTicket.eventName}</span>
                <span className="text-slate-500">Attendee:</span>
                <span className="text-slate-900">{scannedTicket.buyerName}</span>
                <span className="text-slate-500">Category:</span>
                <span className="text-slate-900">{scannedTicket.categoryName}</span>
                <span className="text-slate-500">Ticket:</span>
                <span className="text-slate-900">#{scannedTicket.ticketNumber}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-8 bg-red-50 border border-red-200 rounded-xl p-5 text-sm space-y-2 animate-shake">
              <div className="flex items-center gap-2 text-red-600 font-medium">
                <AlertCircle className="h-5 w-5" />
                Access Denied
              </div>
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-red-100">
                {error}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}