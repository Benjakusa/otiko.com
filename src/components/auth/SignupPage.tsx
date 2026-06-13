import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { signupSchema, SignupInput } from "../../lib/validation/authSchemas";
import { authService } from "../../lib/firebase/auth";
import PasswordInput from "./PasswordInput";
import PasswordStrengthIndicator from "./PasswordStrengthIndicator";
import AuthCard from "./AuthCard";

interface SignupPageProps {
  onBackToHome: () => void;
  onLoginNavigate: () => void;
  onSignupSuccess: (organizerData: any) => void;
}

export default function SignupPage({ 
  onBackToHome, 
  onLoginNavigate, 
  onSignupSuccess 
}: SignupPageProps) {
  const [loading, setLoading] = useState(false);
  const [passwordScore, setPasswordScore] = useState(0);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur"
  });

  const passwordVal = watch("password") || "";

  const onSubmit = async (data: SignupInput) => {
    // Block if password is evaluated as weak (score <= 2)
    if (passwordScore <= 2) {
      setSubmissionError("Please choose a stronger password matching the criteria.");
      return;
    }

    setLoading(true);
    setSubmissionError(null);

    try {
      // 1. Normalize phone to 2547XXXXXXXX
      let normalizedPhone = data.phone;
      if (normalizedPhone.startsWith("07")) {
        normalizedPhone = "2547" + normalizedPhone.substring(2);
      }

      // 2. Client Side Auth sign up via our service wrapper
      const user = await authService.createUser(data.email, data.password, data.fullName);

      // 3. Register with Otiko Server
      const registerRes = await fetch("/api/organizers/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          firebaseUid: user.uid,
          name: data.fullName,
          email: data.email,
          phone: normalizedPhone,
          businessName: `${data.fullName} Events`,
          mpesaPayoutNumber: normalizedPhone
        })
      });

      if (!registerRes.ok) {
        const errorData = await registerRes.json();
        throw new Error(errorData.error || "Failed to persist account details with Otiko core server.");
      }

      const freshOrganizer = await registerRes.json();
      
      // 4. Pass back authenticated organizer profile details
      onSignupSuccess(freshOrganizer);
    } catch (err: any) {
      console.error("Signup failed:", err);
      if (err.code === "auth/email-already-in-use") {
        setSubmissionError("An organizer account with this email already exists.");
      } else {
        setSubmissionError(err.message || "An unexpected error occurred during registration. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard onBackToHome={onBackToHome}>
      <div className="space-y-1.5 text-center">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Create your account</h2>
        <p className="text-xs text-slate-500">Manage your events and ticket sales in one place.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" aria-live="polite">
        
        {/* Contact Full Name */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            Full Name
          </label>
          <input
            type="text"
            placeholder="e.g. Kamau Njoroge"
            {...register("fullName")}
            className={`w-full bg-slate-50 border focus:bg-white rounded-xl px-3 py-2.5 text-xs transition-colors focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none ${
              errors.fullName ? "border-rose-450" : "border-slate-200"
            }`}
          />
          {errors.fullName && (
            <p className="text-[11px] font-semibold text-rose-650 mt-1">{errors.fullName.message}</p>
          )}
        </div>

        {/* Business Email */}
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

        {/* Contact Mobile Phone */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            Phone Number
          </label>
          <input
            type="text"
            placeholder="e.g. 0712345678 or 254712345678"
            {...register("phone")}
            className={`w-full bg-slate-50 border focus:bg-white rounded-xl px-3 py-2.5 text-xs transition-colors focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none ${
              errors.phone ? "border-rose-450" : "border-slate-200"
            }`}
          />
          {errors.phone && (
            <p className="text-[11px] font-semibold text-rose-650 mt-1">{errors.phone.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <PasswordInput
            label="Password"
            placeholder="password"
            {...register("password")}
            error={errors.password?.message}
          />
          <PasswordStrengthIndicator 
            password={passwordVal} 
            onStrengthEvaluated={setPasswordScore} 
          />
        </div>

        {/* Confirm Password */}
        <div>
          <PasswordInput
            label="Confirm Password"
            placeholder="password"
            {...register("confirmPassword")}
            error={errors.confirmPassword?.message}
          />
        </div>

        {/* Unified Error Alert Row */}
        {submissionError && (
          <div className="text-[11px] font-semibold text-rose-650 bg-rose-50 border border-rose-100 p-3 rounded-xl">
            {submissionError}
          </div>
        )}

        {/* Submit Register Button */}
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="w-full bg-[#0F172A] hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl text-xs transition-colors duration-250 flex items-center justify-center gap-2 mt-4 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span>Creating profile...</span>
            </>
          ) : (
            <span>Create Account</span>
          )}
        </button>

        {/* Account alternative navigation */}
        <div className="text-center pt-2">
          <p className="text-xs text-slate-500">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onLoginNavigate}
              className="font-bold text-red-650 hover:text-red-750 hover:underline transition-colors focus:outline-none"
            >
              Log in
            </button>
          </p>
        </div>

      </form>
    </AuthCard>
  );
}
