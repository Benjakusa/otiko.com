import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import TicketScannerSim from "./components/ticket-scanner-sim";
import SignupPage from "./components/auth/SignupPage";
import LoginPage from "./components/auth/LoginPage";
import ForgotPasswordPage from "./components/auth/ForgotPasswordPage";
import PolicyPages from "./components/policies/PolicyPages";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./components/AdminDashboard";
import { useAppStore } from "./store/useAppStore";

export default function App() {
  const { token, fetchData } = useAppStore();

  useEffect(() => {
    fetchData();
  }, [fetchData, token]);

  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!token) {
      return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-red-500/30 selection:text-red-900">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/policies" element={<PolicyPages />} />
          <Route path="/scanner" element={<TicketScannerSim />} />
          
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <div className="max-w-7xl mx-auto p-4 sm:p-8">
                <UserDashboard />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
