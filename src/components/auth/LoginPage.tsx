import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { loginSchema, LoginInput } from "../../lib/validation/authSchemas";
import { authService } from "../../lib/firebase/auth";
import PasswordInput from "./PasswordInput";
import AuthCard from "./AuthCard";

interface LoginPageProps {
  onBackToHome: () => void;
  onSignupNavigate: () => void;
  onForgotPasswordNavigate: () => void;
  onLoginSuccess: (organizerData: any, token: string) => void;
}

export default function LoginPage({ 
  onBackToHome, 
  onSignupNavigate, 
  onForgotPasswordNavigate, 
  onLoginSuccess 
}: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur"
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    setSubmissionError(null);

    try {
      // 1. Sign in via client-side Auth wrapper
      const user = await authService.signIn(data.email, data.password);

      // 2. Load Organizer profile details from Otiko backend system
      const res = await fetch("/api/organizers/me", {
        headers: {
          "Authorization": `Bearer ${user.uid}`
        }
      });

      if (!res.ok) {
        throw new Error("Local profile registration mismatch on Otiko cloud.");
      }

      const organizerData = await res.json();
      
      // 3. Callback to update parent context state
      onLoginSuccess(organizerData, user.uid);
    } catch (err: any) {
      console.error("Login verification failed:", err);
      // Security Best Practice: Don't reveal which credential was incorrect.
      setSubmissionError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard onBackToHome={onBackToHome}>
      <div className="space-y-1.5 text-center">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Welcome back</h2>
        <p className="text-xs text-slate-500">Log in to manage your events</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" aria-live="polite">
        
        {/* Email Field */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            Email Address
          </label>
          <input
            type="email"
            placeholder="myemail@gmail.com"
            {...register("email")}
            className={`w-full bg-slate-50 border focus:bg-white rounded-xl px-3 py-2.5 text-xs transition-colors focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none ${
              errors.email ? "border-rose-450" : "border-slate-200"
            }`}
          />
          {errors.email && (
            <p className="text-[11px] font-semibold text-rose-650 mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password and Forgot link */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Password
            </label>
            {submissionError && (
              <button
                type="button"
                onClick={onForgotPasswordNavigate}
                className="text-[11px] font-bold text-red-650 hover:text-red-750 transition-colors focus:outline-none"
              >
                Forgot password?
              </button>
            )}
          </div>
          <PasswordInput
            placeholder="password"
            {...register("password")}
            error={errors.password?.message}
          />
        </div>

        {/* Invalid Credential Box */}
        {submissionError && (
          <div className="text-[11px] font-semibold text-rose-650 bg-rose-50 border border-rose-100 p-3 rounded-xl text-center">
            {submissionError}
          </div>
        )}

        {/* Log In Button */}
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="w-full bg-[#0F172A] hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl text-xs transition-colors duration-250 flex items-center justify-center gap-2 mt-2 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span>Verifying credentials...</span>
            </>
          ) : (
            <span>Log In</span>
          )}
        </button>

        {/* Signup redirection route */}
        <div className="text-center pt-2">
          <p className="text-xs text-slate-500">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={onSignupNavigate}
              className="font-bold text-red-650 hover:text-red-750 hover:underline transition-colors focus:outline-none"
            >
              Sign up
            </button>
          </p>
        </div>

      </form>
    </AuthCard>
  );
}
