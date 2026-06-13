import React from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password?: string;
  onStrengthEvaluated?: (score: number) => void;
}

export default function PasswordStrengthIndicator({ password = "", onStrengthEvaluated }: PasswordStrengthIndicatorProps) {
  // 1. Checks:
  const lengthCheck = password.length >= 8;
  const upperCheck = /[A-Z]/.test(password);
  const lowerCheck = /[a-z]/.test(password);
  const numberCheck = /[0-9]/.test(password);
  const specialCheck = /[^A-Za-z0-9]/.test(password);

  // 2. Score calculations (0 to 5)
  let score = 0;
  if (lengthCheck) score++;
  if (upperCheck) score++;
  if (lowerCheck) score++;
  if (numberCheck) score++;
  if (specialCheck) score++;

  React.useEffect(() => {
    if (onStrengthEvaluated) {
      onStrengthEvaluated(score);
    }
  }, [score, onStrengthEvaluated]);

  // 3. Status mappings
  let label = "No Password";
  let colorClass = "bg-slate-200";
  let textClass = "text-slate-400";
  let widthPercent = "w-0";

  if (password.length > 0) {
    if (score <= 2) {
      label = "Weak";
      colorClass = "bg-rose-500";
      textClass = "text-rose-500";
      widthPercent = "w-1/3";
    } else if (score <= 4) {
      label = "Medium";
      colorClass = "bg-amber-500";
      textClass = "text-amber-500";
      widthPercent = "w-2/3";
    } else {
      label = "Strong";
      colorClass = "bg-emerald-500";
      textClass = "text-emerald-500";
      widthPercent = "w-full";
    }
  }

  return (
    <div className="space-y-2 mt-1 px-0.5">
      {/* Label and visual metric bar */}
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
        <span className="text-slate-500">Security Index</span>
        <span className={textClass}>{label}</span>
      </div>

      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${colorClass} ${widthPercent} transition-all duration-350 ease-out`} />
      </div>

      {/* Modern Compact Checklist */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
        <div className="flex items-center gap-1.5 text-[10px] font-medium">
          {lengthCheck ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={3} />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1" />
          )}
          <span className={lengthCheck ? "text-slate-900 font-semibold" : "text-slate-400"}>8+ Characters</span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-medium">
          {upperCheck ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={3} />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1" />
          )}
          <span className={upperCheck ? "text-slate-900 font-semibold" : "text-slate-400"}>Uppercase (A-Z)</span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-medium">
          {lowerCheck ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={3} />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1" />
          )}
          <span className={lowerCheck ? "text-slate-900 font-semibold" : "text-slate-400"}>Lowercase (a-z)</span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-medium">
          {numberCheck ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={3} />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1" />
          )}
          <span className={numberCheck ? "text-slate-900 font-semibold" : "text-slate-400"}>Numbers (0-9)</span>
        </div>

        <div className="col-span-2 flex items-center gap-1.5 text-[10px] font-medium pt-0.5">
          {specialCheck ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={3} />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1" />
          )}
          <span className={specialCheck ? "text-slate-900 font-semibold" : "text-slate-400"}>Symbols (!@#$%^&*)</span>
        </div>
      </div>
    </div>
  );
}
