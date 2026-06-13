/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Building, Calendar, MapPin, Ticket as TicketIcon, Phone, Mail, 
  User, CheckCircle2, AlertTriangle, Loader2, RefreshCw, X, Download, QrCode,
  Share2, Check
} from "lucide-react";
import { Event, Order, Ticket } from "../types";

interface PublicBuyFlowProps {
  event: Event;
  onClose: () => void;
  onPurchaseComplete?: () => void;
}

export default function PublicBuyFlow({ event, onClose, onPurchaseComplete }: PublicBuyFlowProps) {
  const [selectedCategory, setSelectedCategory] = useState(event.categories ? event.categories[0]?.id : "");
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");

  const [step, setStep] = useState<"reserve" | "paying" | "processed" | "pdf_view">("reserve");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Mpesa STK response logs
  const [stkStatus, setStkStatus] = useState<string>("");
  const [mpesaNo, setMpesaNo] = useState("");
  const [copied, setCopied] = useState(false);

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Fallback copy fail', err);
    }
    document.body.removeChild(textArea);
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        fallbackCopyTextToClipboard(text);
      });
    } else {
      fallbackCopyTextToClipboard(text);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?event=${event.eventCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Otiko.com - ${event.name}`,
          text: `Reserve tickets for ${event.name} at ${event.venue} on Otiko.com!`,
          url: shareUrl,
        });
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const activeCategory = event.categories?.find(c => c.id === selectedCategory);

  // Poll for database order state updates
  useEffect(() => {
    let intervalId: any;
    if (step === "paying" && order?.id) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`/api/orders/${order.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === "paid") {
              setOrder(data);
              setStep("processed");
              fetchTickets(order.id);
              if (onPurchaseComplete) onPurchaseComplete();
              clearInterval(intervalId);
            } else if (data.status === "failed" || data.status === "expired") {
              setOrder(data);
              setError(`Reservation state changed to: ${data.status.toUpperCase()}`);
              clearInterval(intervalId);
            }
          }
        } catch (err) {
          console.error("Error polling order", err);
        }
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [step, order]);

  const fetchTickets = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/tickets`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || quantity < 1 || !buyerName || !buyerPhone || !buyerEmail) {
      setError("Please fill all booking requirements correctly.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/orders/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCategory,
          quantity,
          buyerName,
          buyerPhone,
          buyerEmail
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.error === "NOT_ENOUGH_TICKETS") {
          setError("Ticket levels depleted. Please select another category or reduce quantity booking.");
        } else {
          setError(data.error || "An error occurred with reservation processing.");
        }
      } else {
        setOrder(data);
        setStep("paying");
        // Auto-trigger STK push initiation on Nairobi Daraja
        initiateStkPush(data.id, buyerPhone);
      }
    } catch (err) {
      setError("Failed to secure tickets connection with reservation system.");
    } finally {
      setLoading(false);
    }
  };

  const initiateStkPush = async (orderId: string, phone: string) => {
    setStkStatus("Initiating Daraja checkout handshake...");
    try {
      const res = await fetch(`/api/mpesa/initiate/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone })
      });
      const data = await res.json();
      if (res.ok) {
        setStkStatus("STK Push prompt sent successfully! Check phone for payment PIN.");
        if (data.mpesaCheckoutRequestId) {
          setMpesaNo(data.mpesaCheckoutRequestId);
        }
      } else {
        setStkStatus(data.error || "M-Pesa STK push timeout.");
      }
    } catch (err) {
      setStkStatus("Warning: Local network failure while triggering prompt.");
    }
  };

  // Safe manual bypass trigger for debug sandbox
  const handleForcePaySuccess = async (success: boolean) => {
    if (!order || !mpesaNo) return;
    try {
      await fetch("/api/mpesa/simulated-callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutRequestId: mpesaNo, success })
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-40 animate-fade-in overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl my-8">
        
        {/* HEADER */}
        <div className="p-6 bg-neutral-950 border-b border-neutral-800 flex justify-between items-start">
          <div>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-red-500/10 text-red-500 uppercase tracking-widest">
              Securing Tickets
            </span>
            <h3 className="font-semibold text-xl text-white mt-2 leading-tight">{event.name}</h3>
            <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-neutral-500" /> {event.venue}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleShare}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                copied 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                  : "bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white"
              }`}
              title="Copy event reservation link to clipboard"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  <span>Share</span>
                </>
              )}
            </button>
            <button 
              type="button"
              onClick={onClose} 
              className="text-neutral-400 hover:text-white p-2 hover:bg-neutral-800 rounded-lg transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* STEP 1: RESERVE */}
        {step === "reserve" && (
          <form onSubmit={handleReserve}>
            <div className="p-6 space-y-6">
              {error && (
                <div className="bg-rose-950/40 border border-rose-900/50 p-4 rounded-xl flex gap-3 text-xs text-rose-300">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div>
                    <span className="font-semibold block uppercase">Reservation Conflict</span>
                    {error}
                  </div>
                </div>
              )}

              {/* TICKET CATEGORY SELECTION */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Select Ticket Level
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {event.categories?.map((cat) => {
                    const selected = selectedCategory === cat.id;
                    const soldOut = cat.remainingQuantity <= 0;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        disabled={soldOut}
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setQuantity(1);
                        }}
                        className={`text-left p-4 rounded-xl border transition ${
                          selected 
                            ? "bg-red-500/10 border-red-500 text-red-400" 
                            : soldOut 
                              ? "bg-neutral-950 border-neutral-800 text-neutral-600 cursor-not-allowed" 
                              : "bg-neutral-950 border-neutral-800 hover:border-neutral-700 text-white"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-sm block">{cat.name}</span>
                          <span className="font-mono text-sm font-semibold">
                            KES {cat.price.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-3 text-xs text-neutral-400">
                          <span>Available in Vault</span>
                          <span className={`font-mono ${cat.remainingQuantity < 20 ? "text-red-500 font-bold" : "text-neutral-500"}`}>
                            {soldOut ? "SOLD OUT" : `${cat.remainingQuantity} spots`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DETAILS AND QUANTITY */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 space-y-2">
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                    Quantity
                  </label>
                  <div className="flex border border-neutral-800 rounded-xl bg-neutral-950 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="px-4 py-2 hover:bg-neutral-800 text-white border-r border-neutral-800 transition"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      readOnly
                      value={quantity}
                      className="w-full text-center text-sm text-white font-mono bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const limit = activeCategory?.remainingQuantity || 10;
                        setQuantity(q => Math.min(limit, q + 1));
                      }}
                      className="px-4 py-2 hover:bg-neutral-800 text-white border-l border-neutral-800 transition"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                    Full Legal Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kamau Njoroge"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none transition"
                    />
                    <User className="absolute left-3 top-3.5 h-4 w-4 text-neutral-600" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                    M-Pesa Mobile Number
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 0712345678"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none transition"
                    />
                    <Phone className="absolute left-3 top-3.5 h-4 w-4 text-neutral-600" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                    Email Address (PDF Tickets dispatch)
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="e.g. client@domain.com"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none transition"
                    />
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-neutral-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* LOWER CART ACTIONS */}
            <div className="p-6 bg-neutral-950 border-t border-neutral-800 flex justify-between items-center gap-6">
              <div>
                <span className="text-neutral-500 text-xs block">Total Cart Amount</span>
                <span className="text-lg font-mono font-bold text-red-500">
                  KES {((activeCategory?.price || 0) * quantity).toLocaleString()}
                </span>
              </div>
              <button
                type="submit"
                disabled={loading || !selectedCategory}
                className="bg-red-650 hover:bg-red-600 text-white font-medium px-8 py-3 rounded-xl flex items-center gap-2 disabled:bg-neutral-800 disabled:text-neutral-600 transition"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <TicketIcon className="h-5 w-5" />}
                Reserve Spots
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: STK PUSH PAYING STATE */}
        {step === "paying" && order && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col items-center justify-center py-6 text-center text-sm space-y-2">
              <Loader2 className="h-10 w-10 text-red-500 animate-spin" />
              <h4 className="font-semibold text-lg text-white mt-4">Waiting for M-Pesa PIN Input...</h4>
              <p className="text-xs text-neutral-400 max-w-sm">
                We have pushed a secure STK prompt of <span className="font-semibold text-red-500">KES {order.totalAmount.toLocaleString()}</span> to the handset registred with <span className="font-mono text-white">{order.buyerPhone}</span>.
              </p>
            </div>

            {/* DARAJA SANDBOX TELEMETRY LOGS */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 font-mono text-xs">
              <div className="flex justify-between items-center mb-3 text-neutral-500 text-[10px] uppercase font-sans tracking-widest font-semibold border-b border-neutral-800 pb-2">
                <span>Daraja STK Sandboxed Telemetry</span>
                <span className="flex items-center gap-1 text-emerald-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Safe Listening Endpoint
                </span>
              </div>
              <div className="space-y-1.5 text-neutral-300">
                <p><span className="text-neutral-500">CheckoutID:</span> {mpesaNo || "Initiating..."}</p>
                <p><span className="text-neutral-500">Client Status:</span> {stkStatus}</p>
                <p><span className="text-neutral-500">Auth Token:</span> Bearer CACHED_IN_REDIS_TTL_3599</p>
              </div>

              {/* ACTION TOGGLES FOR EASY TESTING WITHOUT HANDSET KEY */}
              <div className="mt-5 border-t border-neutral-800 pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => handleForcePaySuccess(true)}
                  className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 hover:border-emerald-500 text-emerald-400 font-sans text-xs px-4 py-2 rounded-lg transition"
                >
                  Simulate M-Pesa Callback (Success)
                </button>
                <button
                  onClick={() => handleForcePaySuccess(false)}
                  className="bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 hover:border-rose-500 text-rose-400 font-sans text-xs px-3 py-2 rounded-lg transition"
                >
                  Simulate M-Pesa Callback (Cancel)
                </button>
              </div>
            </div>

            <div className="text-[11px] text-center text-neutral-500 font-sans leading-normal">
              Tickets will reserve for 5 minutes only. Do not refresh or browse back. Safaricom's webhook returns validation code automatically.
            </div>
          </div>
        )}

        {/* STEP 3: PROCESSED SUCCESS */}
        {step === "processed" && order && (
          <div className="p-6 space-y-6">
            <div className="text-center space-y-3 py-4">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h4 className="font-bold text-2xl text-white">Tickets Activated Successfully!</h4>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                Payment received for checkout request <span className="font-mono text-white text-xs">{mpesaNo}</span>. {order.quantity} ticket codes have been generated and signature-signed.
              </p>
            </div>

            {/* GENERATED TICKETS CONTAINER */}
            <div className="space-y-4">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Authorized Passes ({tickets.length})
              </h5>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {tickets.map((t) => (
                  <div key={t.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="text-xs text-neutral-500 font-medium">PASS IDENTIFIER</div>
                      <div className="text-sm font-semibold font-mono text-red-500 uppercase mt-0.5">
                        {event.eventCode}—TKT-{t.ticketNumber}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-1 font-mono font-bold max-w-sm overflow-hidden text-ellipsis">
                        SIG: {t.qrSignature}
                      </div>
                    </div>
                    <button
                      onClick={() => setStep("pdf_view")}
                      className="bg-neutral-850 hover:bg-neutral-700 text-white hover:text-red-300 font-medium text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 border border-neutral-700 transition"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Print / Download Pass
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-xs leading-relaxed text-red-200">
              <span className="font-semibold block mb-0.5">Physical scanner warning:</span>
              To enter gates, make sure you copy the entire <span className="font-semibold">ID:SIGNATURE</span> string (e.g. <span className="font-mono bg-neutral-900 border border-neutral-800 px-1 rounded text-[11px]">{tickets[0]?.id}:{tickets[0]?.qrSignature}</span>) to test the Validator Scanner tools provided in headers.
            </div>
          </div>
        )}

        {/* STEP 4: PRESET REAL-TICKET PDF EMULATOR */}
        {step === "pdf_view" && tickets.length > 0 && (
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-xs font-bold uppercase tracking-widest text-red-500 font-semibold">Official Ticketing Dispatch</h4>
              <button
                onClick={() => setStep("processed")}
                className="text-xs text-neutral-400 hover:text-white"
              >
                ← Back to Order
              </button>
            </div>

            {/* IMMERSIVE TICKET PDF LAYOUT */}
            <div className="bg-white text-neutral-950 rounded-2xl p-6 shadow-xl space-y-6 print:p-0">
              {/* BRAND HEADER */}
              <div className="flex justify-between items-center border-b-2 border-dashed border-neutral-200 pb-4">
                <div>
                  <h1 className="text-2xl font-black tracking-tighter text-neutral-900 flex items-center gap-1.5 animate-pulse">
                    OTIKO<span className="text-red-600">.COM</span>
                  </h1>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">
                    Secure Entry Gate Credentials
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold bg-neutral-100 text-neutral-800 px-2 py-1 rounded">
                    {event.eventCode}
                  </span>
                </div>
              </div>

              {/* EVENT SPECS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs uppercase font-bold text-neutral-400 tracking-wider">EVENT VENUE</h3>
                  <p className="font-semibold text-neutral-900 text-sm mt-0.5">{event.name}</p>
                  
                  <h3 className="text-xs uppercase font-bold text-neutral-400 tracking-wider mt-4">DATE & TIME</h3>
                  <p className="font-medium text-neutral-800 text-sm mt-0.5">
                    {new Date(event.eventDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>

                  <h3 className="text-xs uppercase font-bold text-neutral-400 tracking-wider mt-4">TICKET HOLDER</h3>
                  <p className="font-semibold text-neutral-900 text-sm mt-0.5">{buyerName || " Kamau Njoroge"}</p>
                </div>

                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 space-y-3">
                  <div>
                    <h3 className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">PASSE LEVEL</h3>
                    <p className="font-bold text-sm text-neutral-900 mt-0.5">
                      {event.categories?.find(c => c.id === selectedCategory)?.name || "VIP Regular"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-neutral-200/60 pt-3">
                    <div>
                      <h3 className="text-[10px] uppercase font-bold text-neutral-400">AMOUNT</h3>
                      <p className="font-semibold text-xs font-mono text-neutral-900">
                        KES {activeCategory?.price.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-[10px] uppercase font-bold text-neutral-400">QUANTITY</h3>
                      <p className="font-semibold text-xs font-mono text-neutral-900">{quantity} ticket(s)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* TICKET SCAN ENTRY WRAPPER */}
              <div className="bg-neutral-50/50 border border-neutral-100 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4">
                {/* Simulated SVG QR representing ticket id/signature */}
                <div className="h-28 w-28 bg-white border border-neutral-200 rounded-xl p-2 flex items-center justify-center shrink-0">
                  <div className="relative text-neutral-900 h-full w-full flex flex-col items-center justify-center">
                    <QrCode className="h-16 w-16 text-red-600" />
                    <span className="text-[9px] font-bold text-neutral-400 mt-1 uppercase">SIGNED PASS</span>
                  </div>
                </div>

                <div className="text-left w-full space-y-2">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                    GATE PASS SIGNATURE SECURITY VERIFY
                  </h4>
                  <p className="text-[11px] leading-relaxed text-neutral-500">
                    To prevent duplication or counterfeits, Otiko tickets are secure signed with HMAC-SHA256. When gate stewards scan the code, the verification engine verifies the credentials on-chain.
                  </p>
                  <div className="bg-neutral-900 text-red-500 font-mono text-[9px] font-bold p-2.5 rounded-lg border border-neutral-800 break-all select-all">
                    {tickets[0]?.id}:{tickets[0]?.qrSignature}
                  </div>
                </div>
              </div>

              {/* TERMS CONDITIONS SLAT */}
              <div className="text-[9px] leading-relaxed text-neutral-400 border-t border-neutral-100 pt-4 text-center">
                This ticket is subject to individual venue rules and terms. Admission is subject to age and security check limitations. 
                Otiko.com is registered by Sol Foundation Co.
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-red-650 hover:bg-red-600 text-white font-semibold py-3 rounded-xl shadow transition text-sm flex items-center justify-center gap-1.5"
              >
                <Download className="h-4 w-4" />
                Trigger System Print Dialog
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
