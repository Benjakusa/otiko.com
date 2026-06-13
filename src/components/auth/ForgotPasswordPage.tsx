import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CheckCircle2 } from "lucide-react";
import { forgotPasswordSchema, ForgotPasswordInput } from "../../lib/validation/authSchemas";
import { authService } from "../../lib/firebase/auth";
import AuthCard from "./AuthCard";

interface ForgotPasswordPageProps {
  onBackToHome: () => void;
  onLoginNavigate: () => void;
}

export default function ForgotPasswordPage({ 
  onBackToHome, 
  onLoginNavigate 
}: ForgotPasswordPageProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur"
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setLoading(true);
    setSubmissionError(null);

    try {
      await authService.sendResetEmail(data.email);
      setSuccess(true);
    } catch (err: any) {
      console.error("Forgot password request failed:", err);
      setSubmissionError(err.message || "Unable to send password reset request right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard onBackToHome={onBackToHome}>
      <div className="space-y-1.5 text-center">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Reset your password</h2>
        <p className="text-xs text-slate-500">Enter your email and we'll send you a reset link</p>
      </div>

      {success ? (
        <div className="space-y-6 text-center animate-fade-in pt-2">
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 bg-emerald-55 text-emerald-600 rounded-full inline-block">
              <CheckCircle2 className="h-10 w-10" strokeWidth={2.5} />
            </div>
            <p className="text-xs text-slate-650 leading-relaxed max-w-[320px] mx-auto font-medium">
              If an account exists with this email, a reset link has been sent.
            </p>
          </div>
          <button
            type="button"
            onClick={onLoginNavigate}
            className="w-full bg-[#0F172A] hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition-all tracking-wide cursor-pointer"
          >
            Back to Login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" aria-live="polite">
          
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              placeholder="e.g. events@domain.com"
              {...register("email")}
              className={`w-full bg-slate-50 border focus:bg-white rounded-xl px-3 py-2.5 text-xs transition-colors focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none ${
                errors.email ? "border-rose-450" : "border-slate-200"
              }`}
            />
            {errors.email && (
              <p className="text-[11px] font-semibold text-rose-650 mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Submission error feedback option */}
          {submissionError && (
            <div className="text-[11px] font-semibold text-rose-650 bg-rose-50 border border-rose-100 p-3 rounded-xl">
              {submissionError}
            </div>
          )}

          {/* Reset Action Button */}
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full bg-[#0F172A] hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl text-xs transition-colors duration-250 flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Sending link...</span>
              </>
            ) : (
              <span>Send Reset Link</span>
            )}
          </button>

          {/* Footer Back to Login routing link */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onLoginNavigate}
              className="font-bold text-slate-600 hover:text-red-650 text-xs transition-colors focus:outline-none"
            >
              Back to Login
            </button>
          </div>

        </form>
      )}
    </AuthCard>
  );
}
