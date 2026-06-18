import React, { useState, useEffect } from "react";
import {
  Building, Calendar, MapPin, Ticket as TicketIcon, Phone, Mail,
  User, CheckCircle2, AlertTriangle, Loader2, X, Download, Printer, Share2, Check, Eye
} from "lucide-react";
import QRCodeLib from "qrcode";
import jsPDF from "jspdf";
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

  const [step, setStep] = useState<"reserve" | "paying" | "processed">("reserve");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewingTicket, setViewingTicket] = useState<number | null>(null);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [sharingIndex, setSharingIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | "all" | null>(null);

  const activeCategory = event.categories?.find(c => c.id === selectedCategory);

  const organizerName = (event as any).organizerName || event.organizerId || "Event Organizer";

  const copyToClipboard = (text: string, index: number) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      }).catch(() => {});
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
          copyToClipboard(shareUrl, -1);
        }
      }
    } else {
      copyToClipboard(shareUrl, -1);
    }
  };

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
              setError(`Reservation ${data.status.toUpperCase()}`);
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
        generateAllQrCodes(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const generateAllQrCodes = async (tktList: Ticket[]) => {
    const urls: Record<string, string> = {};
    for (const t of tktList) {
      const cat = event.categories?.find(c => c.id === t.categoryId);
      const displayDate = new Date(event.eventDate).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      });
      const payload = JSON.stringify({
        ticketNumber: t.ticketNumber,
        verificationCode: t.verificationCode || "",
        eventName: event.name,
        organizerName,
        eventDate: displayDate,
        ticketType: cat?.name || "General",
        amountPaid: `KES ${cat?.price?.toLocaleString() || "—"}`,
        brand: "Powered by Otiko.com"
      });
      try {
        urls[t.id] = await QRCodeLib.toDataURL(payload, {
          width: 300,
          margin: 2,
          color: { dark: "#0F172A", light: "#FFFFFF" },
        });
      } catch (err) {
        console.error("QR generation failed", err);
      }
    }
    setQrDataUrls(urls);
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
        body: JSON.stringify({ categoryId: selectedCategory, quantity, buyerName, buyerPhone, buyerEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.error === "NOT_ENOUGH_TICKETS") {
          setError("Ticket levels depleted. Please select another category or reduce quantity.");
        } else {
          setError(data.error || "An error occurred.");
        }
      } else {
        setOrder(data);
        setStep("paying");
        initiateStkPush(data.id, buyerPhone);
      }
    } catch (err) {
      setError("Failed to complete reservation.");
    } finally {
      setLoading(false);
    }
  };

  const initiateStkPush = async (orderId: string, phone: string) => {
    try {
      await fetch(`/api/mpesa/initiate/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const loadImageAsDataUrl = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const drawTicketOnPage = async (pdf: jsPDF, ticket: Ticket, cat: { name?: string; price?: number } | undefined, qrDataUrl: string | undefined) => {
    const pageW = 210;
    const pageH = 297;
    const margin = 15;
    const contentW = pageW - margin * 2;
    let y = margin;

    // Brand header
    pdf.setFontSize(24);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(15, 23, 42);
    pdf.text("OTIKO", margin, y);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(220, 38, 38);
    pdf.text(".COM", margin + pdf.getTextWidth("OTIKO"), y);
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text("Secure Ticket", margin, y + 5);
    y += 14;

    // Separator line
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, pageW - margin, y);
    y += 10;

    // Event Banner
    if (event.flyerUrl) {
      const bannerDataUrl = await loadImageAsDataUrl(event.flyerUrl);
      if (bannerDataUrl) {
        try {
          const bannerH = 50;
          pdf.addImage(bannerDataUrl, "JPEG", margin, y, contentW, bannerH);
          y += bannerH + 8;
        } catch {
          y += 4;
        }
      } else {
        y += 4;
      }
    }

    // Event Name
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(15, 23, 42);
    const eventNameLines = pdf.splitTextToSize(event.name, contentW);
    pdf.text(eventNameLines, margin, y);
    y += eventNameLines.length * 10 + 2;

    // Host
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Hosted by ${organizerName}`, margin, y);
    y += 10;

    // Separator
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, pageW - margin, y);
    y += 8;

    // Details in 2-column grid
    const col1X = margin;
    const col2X = margin + contentW / 2;
    const labelSize = 7;
    const valueSize = 10;
    const rowH = 12;

    pdf.setFontSize(labelSize);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(148, 163, 184);

    pdf.text("TICKET TYPE", col1X, y);
    pdf.text("AMOUNT PAID", col2X, y);
    pdf.setFontSize(valueSize);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(15, 23, 42);
    pdf.text(cat?.name || "General", col1X, y + 5);
    pdf.text(`KES ${cat?.price?.toLocaleString() || "—"}`, col2X, y + 5);
    y += rowH;

    pdf.setFontSize(labelSize);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(148, 163, 184);
    pdf.text("DATE & TIME", col1X, y);
    pdf.setFontSize(valueSize);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(15, 23, 42);
    pdf.text(formatDate(event.eventDate), col1X, y + 5);
    y += rowH;

    pdf.setFontSize(labelSize);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(148, 163, 184);
    pdf.text("VENUE", col1X, y);
    pdf.setFontSize(valueSize);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(15, 23, 42);
    const venueLines = pdf.splitTextToSize(event.venue, contentW / 2);
    pdf.text(venueLines, col1X, y + 5);
    y += Math.max(rowH, venueLines.length * 6 + 4);

    // Separator
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, pageW - margin, y);
    y += 8;

    // Ticket Number box
    const tktBoxY = y;
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(margin, tktBoxY, contentW, 18, 3, 3, "FD");
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(148, 163, 184);
    pdf.text("TICKET NUMBER", margin + 6, tktBoxY + 7);
    pdf.setFontSize(10);
    pdf.setFont("courier", "bold");
    pdf.setTextColor(15, 23, 42);
    pdf.text(ticket.ticketNumber, margin + 6, tktBoxY + 15);
    y = tktBoxY + 24;

    // QR Code
    if (qrDataUrl) {
      const qrSize = 55;
      const qrX = (pageW - qrSize) / 2;
      const qrY = y;
      try {
        pdf.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
      } catch {
        // QR failed to render
      }
      y += qrSize + 4;
    } else {
      y += 8;
    }

    // Powered by
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(148, 163, 184);
    pdf.text("Powered by Otiko.com", pageW / 2, y, { align: "center" });
  };

  const generatePdf = async (ticketIndex?: number) => {
    const indices = ticketIndex !== undefined ? [ticketIndex] : tickets.map((_, i) => i);
    if (indices.length === 0) return;

    const pdf = new jsPDF("p", "mm", "a4");

    for (let idx = 0; idx < indices.length; idx++) {
      const ti = indices[idx];
      const ticket = tickets[ti];
      if (!ticket) continue;

      if (idx > 0) pdf.addPage();

      const cat = event.categories?.find(c => c.id === ticket.categoryId);
      const qrDataUrl = qrDataUrls[ticket.id];
      await drawTicketOnPage(pdf, ticket, cat, qrDataUrl);
    }

    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ticketIndex !== undefined
      ? `${event.eventCode}-ticket-${String(ticketIndex + 1).padStart(2, "0")}.pdf`
      : `${event.eventCode}-tickets.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadTicket = async (index: number) => {
    setDownloading(index);
    await generatePdf(index);
    setDownloading(null);
  };

  const handleDownloadAll = async () => {
    setDownloading("all");
    await generatePdf();
    setDownloading(null);
  };

  const generatePdfBlob = async (ticketIndex: number): Promise<Blob | null> => {
    const ticket = tickets[ticketIndex];
    if (!ticket) return null;

    const pdf = new jsPDF("p", "mm", "a4");
    const cat = event.categories?.find(c => c.id === ticket.categoryId);
    const qrDataUrl = qrDataUrls[ticket.id];
    await drawTicketOnPage(pdf, ticket, cat, qrDataUrl);
    return pdf.output("blob");
  };

  const handleShareTicket = async (index: number) => {
    setSharingIndex(index);
    const blob = await generatePdfBlob(index);
    if (!blob) { setSharingIndex(null); return; }
    const fileName = `${event.eventCode}-ticket-${String(index + 1).padStart(2, "0")}.pdf`;
    const file = new File([blob], fileName, { type: "application/pdf" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `${event.name} Ticket`, text: `Ticket for ${event.name}` });
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = fileName; a.click();
          URL.revokeObjectURL(url);
        }
      }
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
    }
    setSharingIndex(null);
  };

  const renderTicketCard = (ticket: Ticket, index: number, standalone: boolean = false) => {
    const qrUrl = qrDataUrls[ticket.id];
    const cat = event.categories?.find(c => c.id === ticket.categoryId);

    return (
      <div
        key={ticket.id}
        className={`bg-white ${standalone ? "" : "rounded-2xl shadow-lg border border-slate-200"} overflow-hidden`}
      >
        {event.flyerUrl && (
          <div className="w-full h-44 sm:h-52 overflow-hidden bg-slate-100">
            <img
              src={event.flyerUrl}
              alt={event.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{event.name}</h3>
            <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
              <Building className="h-3.5 w-3.5" />
              {organizerName}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ticket Type</span>
              <p className="font-semibold text-slate-900 mt-0.5">{cat?.name || "General"}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Amount Paid</span>
              <p className="font-semibold text-slate-900 mt-0.5">KES {cat?.price.toLocaleString() || "—"}</p>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Date & Time</span>
              <p className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                {formatDate(event.eventDate)}
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Venue</span>
              <p className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                {event.venue}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ticket Number</span>
            <p className="font-mono font-bold text-slate-900 text-sm mt-0.5 select-all">{ticket.ticketNumber}</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="Ticket QR Code"
                className="w-36 h-36 border border-slate-200 rounded-xl p-1"
              />
            ) : (
              <div className="w-36 h-36 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
              </div>
            )}
            <span className="text-[10px] text-slate-400 font-medium">Powered by Otiko.com</span>
          </div>

          {!standalone && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <button
                onClick={() => setViewingTicket(index)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">View</span>
              </button>
              <button
                onClick={() => handleDownloadTicket(index)}
                disabled={downloading === index}
                className="bg-black hover:bg-red-600 hover:text-black text-white font-medium py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition disabled:bg-slate-300"
              >
                {downloading === index ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{downloading === index ? "..." : "PDF"}</span>
              </button>
              <button
                onClick={() => window.print()}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Print</span>
              </button>
              <button
                onClick={() => handleShareTicket(index)}
                disabled={sharingIndex === index}
                className={`font-medium py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition ${
                  sharingIndex === index
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                {sharingIndex === index ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Share2 className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{sharingIndex === index ? "Sharing..." : "Share"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center p-3 sm:p-4 z-40 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl my-4 sm:my-8">

        {/* HEADER */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex justify-between items-start gap-4">
          <div className="min-w-0">
            <span className="text-[10px] font-semibold px-2 py-1 rounded bg-red-50 text-red-600 uppercase tracking-widest">
              Ticket Booking
            </span>
            <h3 className="font-bold text-lg sm:text-xl text-slate-900 mt-2 leading-tight">{event.name}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" /> {event.venue}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleShare}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                copiedIndex === -1
                  ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                  : "bg-white border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900"
              }`}
            >
              {copiedIndex === -1 ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copiedIndex === -1 ? "Copied!" : "Share"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* STEP 1: RESERVE */}
        {step === "reserve" && (
          <form onSubmit={handleReserve}>
            <div className="p-4 sm:p-6 space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl flex gap-3 text-xs text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Select Ticket Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {event.categories?.map((cat) => {
                    const selected = selectedCategory === cat.id;
                    const soldOut = cat.remainingQuantity <= 0;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        disabled={soldOut}
                        onClick={() => { setSelectedCategory(cat.id); setQuantity(1); }}
                        className={`text-left p-4 rounded-xl border transition ${
                          selected
                            ? "bg-red-50 border-red-500 text-red-700"
                            : soldOut
                              ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                              : "bg-white border-slate-200 hover:border-slate-300 text-slate-900"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-sm">{cat.name}</span>
                          <span className="font-mono text-sm font-semibold">KES {cat.price.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                          <span>Available</span>
                          <span className={`font-mono ${cat.remainingQuantity < 20 ? "text-red-600 font-bold" : "text-slate-500"}`}>
                            {soldOut ? "SOLD OUT" : `${cat.remainingQuantity} left`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Quantity</label>
                  <div className="flex border border-slate-200 rounded-xl bg-white overflow-hidden">
                    <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-4 py-2 hover:bg-slate-50 text-slate-700 border-r border-slate-200 transition">-</button>
                    <input type="number" readOnly value={quantity} className="w-full text-center text-sm text-slate-900 font-mono bg-transparent focus:outline-none" />
                    <button type="button" onClick={() => { const limit = activeCategory?.remainingQuantity || 10; setQuantity(q => Math.min(limit, q + 1)); }} className="px-4 py-2 hover:bg-slate-50 text-slate-700 border-l border-slate-200 transition">+</button>
                  </div>
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <input type="text" required placeholder="e.g. Kamau Njoroge" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className="w-full bg-white border border-slate-200 focus:border-red-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none transition" />
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Phone Number</label>
                  <div className="relative">
                    <input type="tel" required placeholder="e.g. 0712345678" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} className="w-full bg-white border border-slate-200 focus:border-red-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none transition" />
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <input type="email" required placeholder="e.g. client@domain.com" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} className="w-full bg-white border border-slate-200 focus:border-red-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none transition" />
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center gap-4">
              <div>
                <span className="text-slate-500 text-xs block">Total</span>
                <span className="text-lg font-mono font-bold text-red-600">KES {((activeCategory?.price || 0) * quantity).toLocaleString()}</span>
              </div>
              <button type="submit" disabled={loading || !selectedCategory} className="bg-black hover:bg-red-600 hover:text-black text-white font-medium px-6 sm:px-8 py-3 rounded-xl flex items-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 transition text-sm">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <TicketIcon className="h-5 w-5" />}
                Reserve
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: PAYING */}
        {step === "paying" && order && (
          <div className="p-8 space-y-6">
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 text-emerald-500 animate-spin" />
              </div>
              
              <div className="space-y-2">
                <h4 className="font-bold text-lg text-slate-900">Payment Request Sent</h4>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                  A payment request for <span className="font-bold text-slate-900">KES {order.totalAmount.toLocaleString()}</span> has been sent to <span className="font-mono font-semibold">{order.buyerPhone}</span>.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Please check your phone and enter your PIN when prompted. Once confirmed, your tickets will appear automatically.
              </p>
            </div>

            <div className="text-xs text-center text-slate-400">
              Tickets are reserved for 5 minutes. Do not close this browser tab.
            </div>
          </div>
        )}

        {/* STEP 3: PROCESSED */}
        {step === "processed" && order && (
          <div className="p-4 sm:p-6 space-y-5">
            <div className="text-center space-y-2 py-2">
              <div className="inline-flex items-center justify-center p-2 rounded-full bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h4 className="font-bold text-xl text-slate-900">Tickets Confirmed!</h4>
              <p className="text-sm text-slate-500">{order.quantity} ticket(s) for {event.name}</p>
            </div>

            <div className="space-y-5">
              {tickets.map((ticket, index) => renderTicketCard(ticket, index))}
            </div>

            <button
              onClick={handleDownloadAll}
              disabled={downloading === "all"}
              className="w-full bg-black hover:bg-red-600 hover:text-black text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition disabled:bg-slate-300"
            >
              {downloading === "all" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {downloading === "all" ? "Generating PDF..." : "Download All Tickets (PDF)"}
            </button>

            <p className="text-[10px] text-center text-slate-400">Powered by Otiko.com</p>
          </div>
        )}

      </div>

      {/* Ticket Viewer Modal */}
      {viewingTicket !== null && tickets[viewingTicket] && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto" onClick={() => setViewingTicket(null)}>
          <div className="max-w-lg w-full mx-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setViewingTicket(null)}
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {renderTicketCard(tickets[viewingTicket], viewingTicket, true)}
              <div className="p-5 pt-0 flex gap-3">
                <button
                  onClick={() => { const idx = viewingTicket; setViewingTicket(null); setTimeout(() => handleDownloadTicket(idx), 100); }}
                  disabled={downloading === viewingTicket}
                  className="flex-1 bg-black hover:bg-red-600 hover:text-black text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition disabled:bg-slate-300"
                >
                  {downloading === viewingTicket ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download PDF
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
                <button
                  onClick={() => handleShareTicket(viewingTicket)}
                  disabled={sharingIndex === viewingTicket}
                  className={`font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition px-4 ${
                    sharingIndex === viewingTicket
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {sharingIndex === viewingTicket ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}