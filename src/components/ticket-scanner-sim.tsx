/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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

    // Ticket inputs can come in "ID" or "ID:SIGNATURE" format from our qr codes
    const parts = ticketInput.trim().split(":");
    const id = parts[0];
    const signature = parts[1] || "";

    try {
      const response = await fetch(`/api/tickets/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrSignature: signature }),
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
    <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ScanLine className="h-6 w-6 text-emerald-400" />
            <h3 className="font-semibold text-lg text-white">Otiko Gate Ticket Validator</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-neutral-400 hover:text-white text-sm bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-lg transition"
          >
            Close Scanner
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-neutral-400 mb-6">
            This module simulates the physical barcode/QR scans performed by event security gates. Paste the signed ticket code from your PDF to verify authenticity.
          </p>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                Paste Ticket QR Code payload
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. tkt-664dc2:4c5c24b6f125a..."
                  value={ticketInput}
                  onChange={(e) => setTicketInput(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-neutral-600 focus:outline-none transition"
                />
                <QrCode className="absolute right-3 top-3 h-5 w-5 text-neutral-600" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !ticketInput.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-medium py-3 rounded-xl disabled:bg-neutral-800 disabled:text-neutral-500 transition duration-150"
            >
              {loading ? "Decrypting Credentials..." : "Authenticate & Scans Gate Pass"}
            </button>
          </form>

          {/* RESULTS DISPLAY */}
          {scannedTicket && (
            <div className="mt-8 bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-5 space-y-3 animate-slide-up">
              <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
                <CheckCircle2 className="h-5 w-5 fill-emerald-950/40" />
                Access Approved — Gate Pass Valid
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-mono border-t border-emerald-900/20 pt-3 text-neutral-300">
                <span className="text-neutral-500">Event:</span>
                <span className="font-sans font-medium text-white">{scannedTicket.eventName}</span>
                <span className="text-neutral-500">Attendee:</span>
                <span className="font-sans text-neutral-200">{scannedTicket.buyerName}</span>
                <span className="text-neutral-500">Category:</span>
                <span className="text-neutral-200">{scannedTicket.categoryName}</span>
                <span className="text-neutral-500">Sequence:</span>
                <span className="text-neutral-200">Ticket #{scannedTicket.ticketNumber}</span>
                <span className="text-neutral-500">Scan ID:</span>
                <span className="text-xs text-neutral-400 overflow-ellipsis overflow-hidden">{scannedTicket.id}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-8 bg-rose-950/30 border border-rose-900/50 rounded-xl p-5 text-sm space-y-2 animate-shake">
              <div className="flex items-center gap-2 text-rose-400 font-medium">
                <AlertCircle className="h-5 w-5 fill-rose-950" />
                Access Denied
              </div>
              <p className="text-xs text-neutral-300 font-mono leading-relaxed bg-neutral-950 p-2.5 rounded border border-rose-900/20">
                {error}
              </p>
              <p className="text-[11px] text-neutral-500 leading-normal">
                Make sure you copied the correct signed QR string from the generated ticket's download details below. Unauthorized signatures will fail checking instantly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
