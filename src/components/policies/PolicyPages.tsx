import React from "react";
import { ArrowLeft, BookOpen, Shield, ShieldCheck, HelpCircle, FileText } from "lucide-react";

export type PolicySection = "refund" | "privacy" | "cookies" | "terms";

interface PolicyPagesProps {
  activeSection: PolicySection;
  onChangeSection: (section: PolicySection) => void;
  onBackToHome: () => void;
}

export default function PolicyPages({
  activeSection,
  onChangeSection,
  onBackToHome,
}: PolicyPagesProps) {
  return (
    <div id="policy-shared-layout" className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-red-250 selection:text-slate-900 pb-16">
      
      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 py-4 px-6 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-red-650 transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-slate-900 tracking-tight">
              Otiko<span className="text-red-500">.com</span>
            </span>
          </div>
        </div>
      </header>

      {/* SHARED CONTENT GRID LAYOUT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* SIDEBAR NAVIGATION TAB BAR */}
          <aside className="lg:col-span-1 space-y-2">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
                Legal Directory
              </p>

              <button
                onClick={() => onChangeSection("refund")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  activeSection === "refund"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <BookOpen className="h-4 w-4 shrink-0" />
                <span>Refund Policy</span>
              </button>

              <button
                onClick={() => onChangeSection("privacy")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  activeSection === "privacy"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Shield className="h-4 w-4 shrink-0" />
                <span>Privacy Policy</span>
              </button>

              <button
                onClick={() => onChangeSection("cookies")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  activeSection === "cookies"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span>Cookie Policy</span>
              </button>

              <button
                onClick={() => onChangeSection("terms")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  activeSection === "terms"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Terms & Conditions</span>
              </button>
            </div>

            <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2 border border-slate-800 shadow-sm">
              <HelpCircle className="h-5 w-5 text-red-500" />
              <h5 className="font-bold text-xs">Need Legal Support?</h5>
              <p className="text-[10px] text-slate-300 leading-relaxed">
                Contact our customer compliance panel directly for active billing or tickets disputes.
              </p>
              <div className="pt-1.5 text-[10px] space-y-1 font-mono text-slate-400">
                <p>Email: privacy@otiko.com</p>
                <p>Tel: 0722839617</p>
              </div>
            </div>
          </aside>

          {/* MAIN DOCUMENT TEXT AREA (MAX WIDTH 3XL & PRINT-FRIENDLY TYPOGRAPHY) */}
          <main className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm print:border-none print:shadow-none">
            <div className="max-w-3xl mx-auto prose prose-slate">
              
              {/* PAGE 1: REFUND POLICY */}
              {activeSection === "refund" && (
                <article className="space-y-6">
                  <header className="border-b border-slate-100 pb-5">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      Event Postponement & Cancellation Refund Policy
                    </h1>
                    <p className="text-xs text-slate-500 font-semibold font-mono mt-2">
                      Last updated: June 13, 2026
                    </p>
                  </header>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    This policy governs ticket refunds for events listed and sold through Otiko.com (operated by Otiko Technologies). By purchasing a ticket on Otiko.com, you (the buyer) confirm that you have read, understood, and agree to be bound by these terms. This policy forms a legally binding agreement between you and Otiko Technologies.
                  </p>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                      1. Event Postponement
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      If an event is postponed (i.e., the date is changed to a later date):
                    </p>
                    <ul className="list-disc pl-5 space-y-3 text-sm text-slate-650">
                      <li>
                        <strong className="text-slate-905">Tickets remain valid</strong> – All tickets already purchased will automatically be honored for the rescheduled date. No action is required to retain your seat or entry.
                      </li>
                      <li>
                        <strong className="text-slate-905">Refund window</strong> – You may request a refund only within seven (7) calendar days starting from the official postponement announcement date. Refund requests received after this period will not be accepted.
                      </li>
                      <li>
                        <strong className="text-slate-905">Refund approval process</strong> – Refunds are subject to:
                        <ul className="list-circle pl-5 mt-1 space-y-1">
                          <li>Joint review and approval by both the event organizer and Otiko Technologies.</li>
                          <li>Deduction of any non-refundable transaction fees (payment gateway charges, etc.).</li>
                          <li>A processing period of up to 7 working days from the date of approval, depending on your payment method and the organizer's response time.</li>
                        </ul>
                      </li>
                      <li>
                        <strong className="text-slate-900">How we notify you</strong> – Otiko Technologies will announce postponements via:
                        <ul className="list-circle pl-5 mt-1 space-y-1">
                          <li>Email sent to the address you provided at checkout.</li>
                          <li>SMS or chat message to the phone number you provided.</li>
                          <li>Official posts on Otiko.com and our social media channels.</li>
                        </ul>
                      </li>
                      <li>
                        <strong className="text-slate-900">No liability for indirect losses</strong> – Otiko Technologies shall not be liable for any consequential damages such as travel, accommodation, lost wages, or other expenses incurred due to the postponement.
                      </li>
                    </ul>
                  </section>

                  <section className="space-y-4 pt-2">
                    <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                      2. Event Cancellation
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      If an event is fully cancelled (i.e., it will not take place at any future date):
                    </p>
                    <ul className="list-disc pl-5 space-y-3 text-sm text-slate-650">
                      <li>
                        <strong className="text-slate-905">Refund processing</strong> – Refunds will be processed after consultation with the event organizer.
                      </li>
                      <li>
                        <strong className="text-slate-905">Organizer reimbursement</strong> – If ticket revenue has already been spent on event preparations, refunds may be delayed until the organizer repays the funds to Otiko's ticketing account. Otiko will keep you informed of the status.
                      </li>
                      <li>
                        <strong className="text-slate-905">Refund method</strong> – Refunds will be issued only to the original payment method used at the time of purchase. For group or multiple-ticket orders, the entire refund will go to the original purchaser's payment method.
                      </li>
                      <li>
                        <strong className="text-slate-900">Cancellation notification</strong> – We will inform you of a cancellation using:
                        <ul className="list-circle pl-5 mt-1 space-y-1">
                          <li>Email (to the address on your order).</li>
                          <li>SMS or chat (to the phone number provided).</li>
                          <li>Announcements on Otiko.com official social media channels.</li>
                        </ul>
                      </li>
                      <li>
                        <strong className="text-slate-900">Deadline to request</strong> – Any refund request must be submitted within seven (7) working days from the date the cancellation is officially announced.
                      </li>
                      <li>
                        <strong className="text-slate-900">Organizer delay disclaimer</strong> – Otiko Technologies shall not be held liable for delays caused by the event organizer's inability or failure to return ticket funds to Otiko in a timely manner.
                      </li>
                    </ul>
                  </section>

                  <section className="space-y-4 pt-2">
                    <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                      3. General Terms
                    </h2>
                    <ul className="list-disc pl-5 space-y-3 text-sm text-slate-655 font-normal leading-relaxed">
                      <li>
                        <strong className="text-slate-900">Force Majeure</strong> – Otiko Technologies is not responsible for event postponements or cancellations caused by circumstances beyond our reasonable control, including but not limited to natural disasters, government orders, public health emergencies, strikes, or acts of terrorism.
                      </li>
                      <li>
                        <strong className="text-slate-900">Transaction fees</strong> – All refunds are subject to deduction of applicable transaction fees (e.g., card processing fees, M-Pesa charges, etc.). By purchasing, you waive any right to dispute these fee deductions.
                      </li>
                      <li>
                        <strong className="text-slate-900">Refund timelines</strong> – Depending on your bank or mobile money provider, refunds may take up to 30 working days to appear in your account. Otiko Technologies is not liable for delays caused by third-party payment processors.
                      </li>
                      <li>
                        <strong className="text-slate-900">Non-transferability</strong> – Refunds are only available to the original purchaser using the original payment method. Tickets obtained through resale, transfer, or from any third party are not eligible for a refund under this policy unless explicitly approved in writing by Otiko.
                      </li>
                      <li>
                        <strong className="text-slate-900">Buyer responsibility</strong> – You are solely responsible for providing accurate and up-to-date contact information when placing an order. Otiko Technologies is not responsible for any failure to communicate important updates if your email, phone number, or other details are incorrect, outdated, or blocked by your service provider.
                      </li>
                      <li>
                        <strong className="text-slate-900">Governing law & jurisdiction</strong> – This policy and any disputes arising from it shall be governed by and construed in accordance with the laws of the Republic of Kenya. All legal actions or proceedings shall be brought exclusively in the courts of Kenya, and you consent to the personal jurisdiction of those courts.
                      </li>
                    </ul>
                  </section>

                  <section className="space-y-4 pt-2">
                    <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                      4. Communication & Notification Commitment
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Otiko Technologies will make reasonable efforts to notify ticket holders of any postponement or cancellation using:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-650">
                      <li>Email – To the email address you supplied during checkout.</li>
                      <li>SMS / chat – To the phone number provided with your order.</li>
                      <li>Website & social media – Updates will also be posted on Otiko.com and our official social media accounts (e.g., X, Facebook, Instagram).</li>
                    </ul>

                    <p className="text-sm font-semibold text-slate-900 pt-1">
                      Limitation of liability for communication failures:
                    </p>
                    <p className="text-sm text-slate-650 leading-relaxed">
                      Otiko Technologies shall not be held liable if you do not receive a notification due to:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600">
                      <li>Incorrect or outdated contact information you provided.</li>
                      <li>Spam or junk mail filtering by your email provider.</li>
                      <li>Network outages, mobile carrier issues, or unavailability of messaging services.</li>
                      <li>Your failure to check your messages or the Otiko.com website for updates.</li>
                    </ul>

                    <p className="text-sm text-slate-600 leading-relaxed">
                      By purchasing a ticket on Otiko.com, you acknowledge that you have read this entire policy, understand its terms, and agree to be bound by them. You also waive any legal claims against Otiko Technologies except as explicitly provided for in this policy.
                    </p>

                    <div className="bg-slate-50 border border-slate-205/65 p-4 rounded-xl mt-4 text-xs font-mono space-y-1">
                      <p className="font-bold text-slate-900">For any refund requests or questions about this policy, please contact:</p>
                      <p>Email: refunds@otiko.com</p>
                      <p>Phone: +254 (0) 700 000 000 (support hours: Mon–Fri, 9am–5pm EAT)</p>
                    </div>
                  </section>
                </article>
              )}

              {/* PAGE 2: PRIVACY POLICY */}
              {activeSection === "privacy" && (
                <article className="space-y-6">
                  <header className="border-b border-slate-100 pb-5">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      Privacy Policy
                    </h1>
                    <p className="text-xs text-slate-500 font-semibold font-mono mt-2">
                      Last updated: June 13, 2026
                    </p>
                  </header>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    This Privacy Policy explains how Otiko Technologies ("Otiko", "we", "us", "our") collects, uses, stores, and protects your personal information when you use Otiko.com ("the Platform") to browse, purchase, or manage event tickets.
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed font-semibold">
                    By using the Platform, you consent to the practices described in this policy.
                  </p>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      1. Information We Collect
                    </h2>
                    <p className="text-sm text-slate-650 leading-relaxed">
                      When you purchase a ticket, we collect:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-650">
                      <li>Full name</li>
                      <li>Email address</li>
                      <li>Phone number</li>
                      <li>Payment confirmation details (transaction ID, amount, M-Pesa reference — we do not store your M-Pesa PIN or full payment card details)</li>
                    </ul>

                    <p className="text-sm text-slate-650 leading-relaxed">
                      If you register as an event organizer, we additionally collect:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-650">
                      <li>Business name and contact details</li>
                      <li>KYC verification documents (where required for payout eligibility)</li>
                      <li>M-Pesa payout number</li>
                    </ul>

                    <p className="text-sm text-slate-650 leading-relaxed">
                      We also automatically collect:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-650">
                      <li>Device and browser information</li>
                      <li>IP address</li>
                      <li>Pages visited and actions taken on the Platform (via cookies and analytics — see our Cookie Policy)</li>
                    </ul>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      2. How We Use Your Information
                    </h2>
                    <p className="text-sm text-slate-600">
                      We use your information to:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-650">
                      <li>Process ticket purchases and deliver tickets (email and in-app download)</li>
                      <li>Verify payment via M-Pesa Daraja API</li>
                      <li>Communicate important updates about events you've purchased tickets for (postponements, cancellations, reminders)</li>
                      <li>Provide organizer dashboards, sales analytics, and payout processing</li>
                      <li>Detect and prevent fraud, abuse, and unauthorized access</li>
                      <li>Improve the Platform through aggregated, anonymized usage analytics</li>
                      <li>Comply with legal and regulatory obligations</li>
                    </ul>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      3. How We Share Your Information
                    </h2>
                    <p className="text-sm text-slate-600">
                      We do not sell your personal information. We may share data with:
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-slate-650">
                      <li><strong className="text-slate-900">Event organizers</strong> – buyer name, phone number, and email for the specific event(s) they organize, so they can manage attendee communication and entry</li>
                      <li><strong className="text-slate-900">Payment processors</strong> – Safaricom M-Pesa (Daraja API) to process transactions</li>
                      <li><strong className="text-slate-900">Service providers</strong> – email delivery (e.g., SendGrid), cloud hosting and storage providers, strictly for operating the Platform</li>
                      <li><strong className="text-slate-900">Legal authorities</strong> – where required by law, court order, or to protect the rights, safety, or property of Otiko, our users, or the public</li>
                    </ul>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      4. Data Storage & Security
                    </h2>
                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-650">
                      <li>Your data is stored on secure cloud infrastructure with encryption at rest and in transit</li>
                      <li>Access to personal data is restricted to authorized personnel on a need-to-know basis</li>
                      <li>We implement industry-standard security measures including secure authentication, rate limiting, and regular security reviews</li>
                      <li>While we take reasonable steps to protect your information, no system is completely secure, and we cannot guarantee absolute security</li>
                    </ul>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      5. Data Retention
                    </h2>
                    <p className="text-sm text-slate-600">
                      We retain your personal information for as long as necessary to:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-650">
                      <li>Fulfil the purpose it was collected for (e.g., ticket delivery, refund processing)</li>
                      <li>Comply with legal, tax, and accounting obligations</li>
                      <li>Resolve disputes and enforce our agreements</li>
                    </ul>
                    <p className="text-sm text-slate-600">
                      Ticket and transaction records are retained for a minimum of <strong className="text-slate-900">[X years]</strong> for financial reconciliation and audit purposes.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      6. Your Rights
                    </h2>
                    <p className="text-sm text-slate-600">
                      Subject to applicable law (including the Kenya Data Protection Act, 2019), you have the right to:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-650">
                      <li>Access the personal information we hold about you</li>
                      <li>Request correction of inaccurate information</li>
                      <li>Request deletion of your information, where legally permissible</li>
                      <li>Object to or restrict certain processing of your data</li>
                      <li>Withdraw consent where processing is based on consent</li>
                    </ul>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      To exercise these rights, contact us at <span className="underline font-medium">privacy@otiko.com</span>. We may need to verify your identity before fulfilling certain requests.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      7. Children's Privacy
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      The Platform is not intended for individuals under the age of 18. We do not knowingly collect personal information from minors. If we become aware that we have collected data from a minor without parental consent, we will take steps to delete it.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      8. Third-Party Links
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      The Platform may contain links to third-party websites (e.g., event organizer social media pages). We are not responsible for the privacy practices of these third parties. Review their policies independently.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      9. Changes to This Policy
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      We may update this Privacy Policy from time to time. Material changes will be communicated via email or a notice on the Platform. Continued use of the Platform after changes take effect constitutes acceptance of the revised policy.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      10. Governing Law
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      This Privacy Policy is governed by the laws of the Republic of Kenya, including the Data Protection Act, 2019.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      11. Contact Us
                    </h2>
                    <div className="bg-slate-50 border border-slate-205/65 p-4 rounded-xl text-xs font-mono space-y-1">
                      <p className="font-bold text-slate-900">For privacy-related questions, requests, or concerns:</p>
                      <p>Email: privacy@otiko.com</p>
                      <p>Phone: +254 (0) 700 000 000 (support hours: Mon–Fri, 9am–5pm EAT)</p>
                    </div>
                  </section>
                </article>
              )}

              {/* PAGE 3: COOKIE POLICY */}
              {activeSection === "cookies" && (
                <article className="space-y-6">
                  <header className="border-b border-slate-100 pb-5">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      Cookie Policy
                    </h1>
                    <p className="text-xs text-slate-500 font-semibold font-mono mt-2">
                      Last updated: June 13, 2026
                    </p>
                  </header>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    This Cookie Policy explains how Otiko Technologies ("Otiko", "we", "us") uses cookies and similar tracking technologies on Otiko.com ("the Platform").
                  </p>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      1. What Are Cookies
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Cookies are small text files stored on your device when you visit a website. They help the website function properly, remember your preferences, and understand how visitors use the site.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      2. Types of Cookies We Use
                    </h2>
                    <div className="space-y-3">
                      <div className="border-l-2 border-slate-900 pl-4 py-1">
                        <h4 className="text-sm font-bold text-slate-900">Essential Cookies</h4>
                        <p className="text-xs text-slate-600 leading-relaxed mt-1">
                          Required for the Platform to function — for example, maintaining your login session, remembering items in your checkout flow, and ensuring security features work correctly. These cannot be disabled without affecting core functionality.
                        </p>
                      </div>

                      <div className="border-l-2 border-slate-900 pl-4 py-1">
                        <h4 className="text-sm font-bold text-slate-900">Performance & Analytics Cookies</h4>
                        <p className="text-xs text-slate-600 leading-relaxed mt-1">
                          Help us understand how visitors interact with the Platform (e.g., pages visited, time spent, errors encountered) so we can improve performance and user experience. This data is generally aggregated and anonymized.
                        </p>
                      </div>

                      <div className="border-l-2 border-slate-900 pl-4 py-1">
                        <h4 className="text-sm font-bold text-slate-900">Functional Cookies</h4>
                        <p className="text-xs text-slate-600 leading-relaxed mt-1">
                          Remember your preferences (e.g., search filters, display settings) to enhance your experience on return visits.
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      3. Third-Party Cookies
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      We may use third-party services that set their own cookies, including:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-650">
                      <li>Analytics providers (e.g., Google Analytics) to understand site usage</li>
                      <li>Payment processing partners (M-Pesa Daraja API) during checkout</li>
                    </ul>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      These third parties have their own privacy and cookie policies, which we encourage you to review.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      4. Managing Cookies
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      You can control or disable cookies through your browser settings. Most browsers allow you to:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-650">
                      <li>View what cookies are stored and delete them individually</li>
                      <li>Block third-party cookies</li>
                      <li>Block all cookies from specific or all websites</li>
                    </ul>
                    <p className="text-sm text-slate-600 italic leading-relaxed pt-1 font-medium">
                      Please note that disabling essential cookies may affect the functionality of the Platform, including your ability to log in, complete purchases, or access your dashboard.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      5. Changes to This Policy
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our practices. Updates will be posted on this page with a revised "Last updated" date.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      6. Contact Us
                    </h2>
                    <div className="bg-slate-50 border border-slate-205/65 p-4 rounded-xl text-xs font-mono space-y-1">
                      <p className="font-bold text-slate-900">For questions about our use of cookies:</p>
                      <p>Email: privacy@otiko.com</p>
                      <p>Phone: +254 (0) 700 000 000 (support hours: Mon–Fri, 9am–5pm EAT)</p>
                    </div>
                  </section>
                </article>
              )}

              {/* PAGE 4: TERMS & CONDITIONS */}
              {activeSection === "terms" && (
                <article className="space-y-6">
                  <header className="border-b border-slate-100 pb-5">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      Terms & Conditions
                    </h1>
                    <p className="text-xs text-slate-500 font-semibold font-mono mt-2">
                      Last updated: June 13, 2026
                    </p>
                  </header>

                  <p className="text-sm text-slate-650 leading-relaxed">
                    These Terms & Conditions ("Terms") govern your use of Otiko.com ("the Platform"), operated by Otiko Technologies. By accessing or using the Platform, whether as a ticket buyer or event organizer, you agree to be bound by these Terms.
                  </p>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      1. Overview of Services
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Otiko.com is a ticketing platform that allows event organizers to create and sell tickets for their events, and allows buyers to discover, purchase, and receive tickets for those events. Otiko acts as an intermediary platform and is not the organizer of any event listed unless explicitly stated.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      2. Eligibility
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      You must be at least 18 years old to create an account, purchase tickets, or register as an organizer on the Platform. By using the Platform, you represent that you meet this requirement.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      3. Account Registration (Organizers)
                    </h2>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-650">
                      <li>Organizers must provide accurate, current, and complete information during registration</li>
                      <li>Organizers are responsible for maintaining the confidentiality of their login credentials</li>
                      <li>Otiko reserves the right to suspend or terminate organizer accounts found to be fraudulent, abusive, or in violation of these Terms</li>
                    </ul>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      4. Event Listings
                    </h2>
                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-650">
                      <li>Organizers are solely responsible for the accuracy of event details (date, venue, description, pricing, ticket availability)</li>
                      <li>Otiko reserves the right to remove any event listing that violates these Terms, applicable law, or is deemed misleading, fraudulent, or inappropriate</li>
                      <li>Otiko does not guarantee that any event will take place as scheduled</li>
                    </ul>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      5. Ticket Purchases
                    </h2>
                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-650">
                      <li>All ticket sales are processed via M-Pesa through the Daraja API</li>
                      <li>Once a payment is confirmed, a ticket (PDF with unique QR code) will be issued to the email address provided at checkout and made available for download</li>
                      <li>Tickets are non-transferable unless explicitly stated by the organizer</li>
                      <li>It is the buyer's responsibility to ensure ticket details (name, phone number, email) are accurate at the time of purchase, as tickets may be tied to this information for entry verification</li>
                    </ul>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      6. Pricing & Fees
                    </h2>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-650">
                      <li>Ticket prices are set by event organizers</li>
                      <li>Otiko charges a service fee of 8% on the gross value of each ticket sold, deducted from the amount remitted to the organizer</li>
                      <li>All prices are displayed in Kenyan Shillings (KES) unless otherwise stated</li>
                    </ul>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      7. Refunds & Cancellations
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Refunds are governed separately by our Refund Policy, available at `/policies/refund` (or by selecting the Refund Policy tab in this panel). By purchasing a ticket, you agree to the terms of that policy.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      8. Organizer Payouts
                    </h2>
                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-650">
                      <li>Available balances reflect the net amount collected (gross sales minus the 8% service fee) less any prior payouts</li>
                      <li>Payout requests are processed to the M-Pesa number registered on the organizer's account</li>
                      <li>Otiko reserves the right to delay, withhold, or review payouts in cases of suspected fraud, chargebacks, disputes, or pending refund obligations related to the organizer's event(s)</li>
                    </ul>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      9. Prohibited Conduct
                    </h2>
                    <p className="text-sm text-slate-605">
                      You agree not to:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-650">
                      <li>Use the Platform for any unlawful purpose</li>
                      <li>Attempt to manipulate ticket inventory, pricing, or sales data</li>
                      <li>Use automated tools (bots) to purchase tickets in violation of stated per-user limits</li>
                      <li>Reproduce, duplicate, or tamper with ticket QR codes</li>
                      <li>Upload false, misleading, or infringing content (event details, flyers, descriptions)</li>
                    </ul>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      10. Intellectual Property
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      All content on the Platform, including the Otiko name, logo, design, and software, is the property of Otiko Technologies and may not be used without written permission. Event flyers and descriptions remain the property of the respective organizers, who grant Otiko a license to display them on the Platform.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      11. Limitation of Liability
                    </h2>
                    <p className="text-sm text-slate-600">
                      Otiko Technologies provides the Platform on an "as is" and "as available" basis. To the maximum extent permitted by law, Otiko shall not be liable for:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-650">
                      <li>Any event being postponed, cancelled, or changed by the organizer</li>
                      <li>Losses arising from incorrect information provided by buyers or organizers</li>
                      <li>Service interruptions, downtime, or technical failures beyond our reasonable control</li>
                      <li>Indirect, incidental, or consequential damages arising from use of the Platform</li>
                    </ul>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      12. Indemnification
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      You agree to indemnify and hold harmless Otiko Technologies, its directors, employees, and partners from any claims, damages, or expenses arising from your violation of these Terms or misuse of the Platform.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      13. Changes to These Terms
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Otiko reserves the right to modify these Terms at any time. Continued use of the Platform after changes are posted constitutes acceptance of the revised Terms.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      14. Governing Law & Jurisdiction
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      These Terms are governed by the laws of the Republic of Kenya. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of Kenya.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      15. Contact Us
                    </h2>
                    <div className="bg-slate-50 border border-slate-205/65 p-4 rounded-xl text-xs font-mono space-y-1">
                      <p className="font-bold text-slate-900">For questions about these Terms:</p>
                      <p>Email: support@otiko.com</p>
                      <p>Phone: +254 (0) 700 000 000 (support hours: Mon–Fri, 9am–5pm EAT)</p>
                    </div>
                  </section>
                </article>
              )}

            </div>
          </main>

        </div>
      </div>

    </div>
  );
}
