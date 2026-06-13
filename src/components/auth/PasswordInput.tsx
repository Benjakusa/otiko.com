import React, { useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label = "Password", error, className = "", ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const toggleVisibility = (e: React.MouseEvent) => {
      e.preventDefault();
      setShowPassword((prev) => !prev);
    };

    return (
      <div className="space-y-1.5 w-full">
        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
          {label}
        </label>
        
        <div className="relative flex items-center">
          <input
            {...props}
            ref={ref}
            type={showPassword ? "text" : "password"}
            className={`w-full bg-slate-50 border focus:bg-white rounded-xl pl-3 pr-10 py-2.5 text-xs transition-colors focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none ${
              error ? "border-rose-450 focus:ring-rose-450 focus:border-rose-450" : "border-slate-200"
            } ${className}`}
          />
          
          <button
            onClick={toggleVisibility}
            type="button"
            className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors p-1"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {error && (
          <p className="text-[11px] font-semibold text-rose-600 animate-slide-up mt-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

export default PasswordInput;
