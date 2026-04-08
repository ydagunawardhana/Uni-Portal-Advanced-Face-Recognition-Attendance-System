import React, { useState } from "react";
import { Lock, Mail, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = "http://localhost:8000";

interface AdminLoginProps {
  onLogin: (role: "Admin") => void;
  onBackToHome?: () => void;
}

export default function AdminLogin({ onLogin, onBackToHome }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Please enter your admin email and password.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Authenticating...");

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "Admin" }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(
          data?.detail || "Invalid admin credentials or unauthorized.",
          { id: toastId },
        );
        return;
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_role", data.role || "Admin");
      localStorage.setItem("user_email", email);

      toast.success("Administrator login successful!", { id: toastId });
      
      setIsRedirecting(true);
      setTimeout(() => {
        onLogin("Admin");
      }, 1500);
    } catch (error: any) {
      toast.error(
        error.message || "Network error while connecting to server.",
        { id: toastId },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 max-w-md w-full border border-gray-100 animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <div className="bg-blue-50 text-blue-600 p-4 rounded-full mx-auto mb-4 w-fit flex items-center justify-center">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            System Administrator
          </h1>
          <p className="text-gray-500 text-sm font-medium">
            Secure access to the university control panel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Email
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400"
                placeholder="Enter Email"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400"
                placeholder="Enter Password"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || isRedirecting}
            className="w-full cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg py-2.5 transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20 disabled:opacity-70 mt-6"
          >
            <span>
              {isRedirecting
                ? "Authenticating..."
                : loading
                ? "Verifying..."
                : "Secure Sign In"}
            </span>
          </button>
        </form>

        {onBackToHome && (
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <button
              onClick={onBackToHome}
              className="text-sm text-gray-500 hover:text-blue-600 font-medium cursor-pointer flex items-center justify-center gap-2 transition-colors mx-auto"
            >
              <ArrowLeft size={16} />
              Return to Public Portal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
