import { useState } from "react";
import { MessageCircle, GraduationCap, ArrowLeft, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import ChatbotWidget from "./ChatbotWidget";

const API_BASE = "http://localhost:8000";

interface LoginScreenProps {
  onLogin: (role: "Admin" | "Lecturer" | "Student") => void;
  onForgotPassword: () => void;
  onBackToHome?: () => void;
}

export default function LoginScreen({
  onLogin,
  onForgotPassword,
  onBackToHome,
}: LoginScreenProps) {
  const [selectedRole, setSelectedRole] = useState<"Admin" | "Lecturer" | "Student">("Admin");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password, role: selectedRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Use the server's error detail if available
        const msg: string =
          data?.detail ?? "Login failed. Please try again.";
        toast.error(msg, { duration: 4000 });
        return;
      }

      // Persist token for authenticated API calls later
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_role",    data.role);
      localStorage.setItem("user_email",   data.email);

      toast.success(`🎉 Login Successful! Welcome back.`, {
        duration: 3000,
        style: {
          background: "#1d4ed8",
          color:       "#fff",
          fontWeight:  "600",
          padding:     "14px 20px",
          borderRadius: "10px",
        },
        iconTheme: { primary: "#fff", secondary: "#1d4ed8" },
      });

      // Brief pause so the toast is visible before navigation
      await new Promise((r) => setTimeout(r, 900));
      onLogin(data.role as "Admin" | "Lecturer" | "Student");

    } catch {
      toast.error("Server error. Please make sure the backend is running.", {
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 relative">
      {/* Back to Home Button */}
      {onBackToHome && (
        <button
          onClick={onBackToHome}
          className="absolute top-6 left-6 flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Home</span>
        </button>
      )}

      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* University Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-4">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              University Portal
            </h1>
            <p className="text-sm text-gray-600">
              Face Recognition Attendance System
            </p>
          </div>

          {/* Login Form — identical structure, just wired to API */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>

            {/* Role Tabs — unchanged styling */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Role
              </label>
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                {(["Admin", "Lecturer", "Student"] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    disabled={loading}
                    onClick={() => setSelectedRole(role)}
                    className={`flex-1 py-3 text-center font-medium transition-colors ${
                      selectedRole === role
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying…
                </>
              ) : (
                "Login"
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={onForgotPassword}
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              Forgot Password?
            </button>
          </div>
        </div>
      </div>

      {/* Help Desk Chatbot Button */}
      {!showChatbot && (
        <button
          onClick={() => setShowChatbot(true)}
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110"
          title="Open Help Desk Chatbot"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chatbot Widget */}
      {showChatbot && <ChatbotWidget onClose={() => setShowChatbot(false)} />}
    </div>
  );
}
