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
  onSignupSuccess: (organizerData: any, token: string) => void;
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
      
      // 4. Pass back authenticated organizer profile details with Firebase ID token
      onSignupSuccess(freshOrganizer, user.idToken);
    } catch (err: any) {
      console.error("Signup failed:", err);
      if (err.code === "auth/email-already-in-use") {
        setSubmissionError("An organizer account with this email already exists.");
      } else if (err.code === "auth/configuration-not-found" || (err.message && err.message.includes("configuration-not-found"))) {
        setSubmissionError("CONFIGURATION_NOT_FOUND");
      } else {
        setSubmissionError(err.message || "An unexpected error occurred during registration. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setSubmissionError(null);
    try {
      const user = await authService.signInWithGoogle();
      
      const registerRes = await fetch("/api/organizers/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          firebaseUid: user.uid,
          name: user.displayName,
          email: user.email,
          phone: "254712345678",
          businessName: `${user.displayName} Events`,
          mpesaPayoutNumber: "254712345678"
        })
      });

      if (!registerRes.ok) {
        throw new Error("Failed to register Google Organizer with Otiko core server.");
      }

      const freshOrganizer = await registerRes.json();
      onSignupSuccess(freshOrganizer, "");
    } catch (err: any) {
      console.error("Google login failed:", err);
      if (err.code === "auth/configuration-not-found" || (err.message && err.message.includes("configuration-not-found"))) {
        setSubmissionError("CONFIGURATION_NOT_FOUND");
      } else {
        setSubmissionError(err.message || "Failed to sign up with Google.");
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

      <div className="space-y-4">
        {/* Google Authentication Button */}
        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={loading}
          className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold py-2.5 rounded-xl text-xs transition duration-250 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
            <g transform="matrix(1, 0, 0, 1, 0, 0)">
              <path d="M21.35,11.1H12v2.7h5.38C16.88,16.34,14.67,18,12,18c-3.31,0-6-2.69-6-6s2.69-6,6-6c1.47,0,2.81,0.54,3.86,1.42l2.12-2.12C16.33,3.67,14.3,3,12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9c4.54,0,8.45-3.02,9.35-7.3v-2.6H21.35z" fill="#4285F4" />
            </g>
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-150"></div>
          <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">or email signup</span>
          <div className="flex-grow border-t border-slate-150"></div>
        </div>
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
        {submissionError && submissionError !== "CONFIGURATION_NOT_FOUND" && (
          <div className="text-[11px] font-semibold text-rose-650 bg-rose-50 border border-rose-100 p-3 rounded-xl">
            {submissionError}
          </div>
        )}

        {/* DIAGNOSTIC PANEL FOR CONFIGURATION NOT FOUND */}
        {submissionError === "CONFIGURATION_NOT_FOUND" && (
          <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <h4 className="font-bold text-rose-650 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
              <span>⚠️ Backend Auth Setup Required</span>
            </h4>
            <p className="text-[11px] text-slate-600 leading-normal">
              Firebase Email/Password login is not enabled in your Firebase Console yet.
            </p>
            <div className="bg-white rounded-lg border border-slate-100 p-2 text-[10px] space-y-1 text-slate-500">
              <p>1. Go to your <strong>Firebase Console</strong>.</p>
              <p>2. Open <strong>Authentication</strong> &gt; <strong>Sign-in method</strong>.</p>
              <p>3. Add and enable the <strong>Email/Password</strong> provider.</p>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              💡 <strong>Quick Fix:</strong> Click <strong>Continue with Google</strong> above, as Google Sign-in is already configured!
            </p>
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
