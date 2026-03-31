import { useState } from "react";
import {
  MessageCircle,
  GraduationCap,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Clock,
  BarChart3,
  Mail,
  Lock,
  Scan,
} from "lucide-react";
import toast from "react-hot-toast";
import ChatbotWidget from "./ChatbotWidget";

const API_BASE = "http://localhost:8000";

interface LoginScreenProps {
  onLogin: (role: "Admin" | "Lecturer" | "Student") => void;
  onForgotPassword: () => void;
  onBackToHome?: () => void;
  initialRole?: "Admin" | "Lecturer" | "Student";
}

export default function LoginScreen({
  onLogin,
  onForgotPassword,
  onBackToHome,
  initialRole = "Admin",
}: LoginScreenProps) {
  const [selectedRole, setSelectedRole] = useState<
    "Admin" | "Lecturer" | "Student"
  >(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Please enter your email and password.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Authenticating...");

    try {
      const endpoint =
        selectedRole === "Student"
          ? `${API_BASE}/api/student/login`
          : `${API_BASE}/api/login`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: selectedRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg: string =
          data?.detail ?? "Invalid credentials or server error";
        toast.error(msg, { id: toastId, duration: 4000 });
        return;
      }

      if (selectedRole === "Student") {
        localStorage.setItem("studentToken", data.token);
        localStorage.setItem(
          "requiresPasswordChange",
          String(data.requires_password_change),
        );
      } else {
        localStorage.setItem("access_token", data.access_token);
      }

      localStorage.setItem("user_role", data.role || selectedRole);
      localStorage.setItem("user_email", email);

      toast.success("Login Successful!", { id: toastId, duration: 3000 });
      await new Promise((r) => setTimeout(r, 900));
      onLogin(selectedRole);
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Server connection error";
      toast.error(msg, { id: toastId, duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <ShieldCheck size={20} />,
      title: "Military-Grade Security",
      desc: "End-to-end encrypted data with multi-factor authentication.",
    },
    {
      icon: <Clock size={20} />,
      title: "Real-Time Processing",
      desc: "Instant face detection and attendance logging under 2 seconds.",
    },
    {
      icon: <BarChart3 size={20} />,
      title: "Comprehensive Reports",
      desc: "Granular analytics and exportable attendance summaries.",
    },
  ];

  const roles: Array<"Admin" | "Lecturer" | "Student"> = [
    "Admin",
    "Lecturer",
    "Student",
  ];

  return (
    <>
      <div className="login-wrapper">
        <div className="login-left">
          {/* Decorative glows */}
          <div
            className="glow-circle"
            style={{
              top: "-6rem",
              left: "-6rem",
              width: "24rem",
              height: "24rem",
              background: "rgba(255,255,255,0.16)",
            }}
          />
          <div
            className="glow-circle"
            style={{
              bottom: "-8rem",
              right: "-8rem",
              width: "30rem",
              height: "30rem",
              background: "rgba(83,85,209,0.27)",
            }}
          />
          <div
            className="glow-circle"
            style={{
              top: "50%",
              left: "33%",
              width: "16rem",
              height: "16rem",
              background: "rgba(87,133,190,0.28)",
            }}
          />

          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="absolute top-4 left-6 lg:left-12 flex items-center gap-2 p-3 text-blue-100 hover:text-white transition-colors z-50"
            >
              <ArrowLeft size={20} />
              <span className="font-medium tracking-wide">Back to Home</span>
            </button>
          )}

          <div className="branding-inner-wrapper">
            <div className="flex items-center gap-4 mb-16 relative z-10 ">
              <div className="bg-white text-blue-700 p-3.5 rounded-2xl shadow-xl">
                <GraduationCap size={52} strokeWidth={2} />
              </div>
              <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm">
                University Portal
              </h1>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.375rem 0.75rem",
                background: "rgba(255,255,255,0.1)",
                borderRadius: "9999px",
                border: "1px solid rgba(255,255,255,0.1)",
                fontSize: "0.75rem",
                fontWeight: 500,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                marginBottom: "1.5rem",
              }}
            >
              <Scan size={14} />
              AI-Powered System
            </div>

            <h2
              style={{
                fontSize: "clamp(2rem, 3.5vw, 3rem)",
                fontWeight: 800,
                lineHeight: 1.15,
                marginBottom: "1rem",
              }}
            >
              Next-Generation
              <br />
              <span style={{ color: "#93c5fd" }}>Face Recognition</span>
            </h2>
            <p
              style={{
                color: "rgba(191,219,254,0.8)",
                fontSize: "1.125rem",
                lineHeight: 1.6,
                maxWidth: "28rem",
                marginBottom: "3rem",
              }}
            >
              Seamless, contactless attendance tracking powered by advanced
              neural networks and real-time biometric analysis.
            </p>

            <div
              style={{
                position: "relative",
                zIndex: 10,
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                width: "100%",
              }}
            >
              {features.map((f, i) => (
                <div key={i} className="feature-card">
                  <div className="feature-icon">{f.icon}</div>
                  <div>
                    <h4
                      style={{
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        marginBottom: "0.125rem",
                      }}
                    >
                      {f.title}
                    </h4>
                    <p
                      style={{
                        color: "rgba(191,219,254,0.6)",
                        fontSize: "0.75rem",
                        lineHeight: 1.5,
                      }}
                    >
                      {f.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="login-right">
          {onBackToHome && (
            <button
              className="mobile-only"
              onClick={onBackToHome}
              style={{
                position: "absolute",
                top: "1.5rem",
                left: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "#4b5563",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
          )}

          <div className="login-card-container">
            <div
              className="mobile-only"
              style={{
                textAlign: "center",
                marginBottom: "2rem",
                marginTop: "2rem",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "4rem",
                  height: "4rem",
                  background: "#2563eb",
                  borderRadius: "1rem",
                  marginBottom: "0.75rem",
                  boxShadow: "0 10px 15px -3px rgba(37,99,235,0.25)",
                }}
              >
                <GraduationCap size={32} color="#fff" />
              </div>
              <h1
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                University Portal
              </h1>
            </div>

            <div
              style={{
                background: "#fff",
                borderRadius: "1.5rem",
                boxShadow:
                  "0 20px 25px -5px rgba(0,0,0,0.06), 0 8px 10px -6px rgba(0,0,0,0.04)",
                padding: "2.5rem",
                border: "1px solid #f3f4f6",
              }}
            >
              <div style={{ marginBottom: "2rem" }}>
                <h2
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: "0.25rem",
                  }}
                >
                  Welcome back
                </h2>
                <p style={{ color: "#5a5d61ff", fontSize: "0.895rem" }}>
                  Sign in to your account to continue
                </p>
              </div>

              <div
                style={{
                  background: "#f3f4f6ff",
                  borderRadius: "1rem",
                  padding: "0.375rem",
                  display: "flex",
                  marginBottom: "2rem",
                }}
              >
                {roles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    disabled={loading}
                    onClick={() => setSelectedRole(role)}
                    className={`role-tab ${selectedRole === role ? "role-tab-active" : "role-tab-inactive"}`}
                  >
                    {role}
                  </button>
                ))}
              </div>

              <form
                onSubmit={handleSubmit}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                <div>
                  <label
                    htmlFor="email"
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#374151",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Email Address
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail
                      size={20}
                      style={{
                        position: "absolute",
                        left: "1rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#9ca3af",
                        pointerEvents: "none",
                      }}
                    />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="login-input"
                      placeholder="Enter your Email Address"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#374151",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <Lock
                      size={20}
                      style={{
                        position: "absolute",
                        left: "1rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#9ca3af",
                        pointerEvents: "none",
                      }}
                    />
                    <input
                      type="password"
                      id="password"
                      name="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="login-input"
                      placeholder="Enter your password"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{
                        width: "1rem",
                        height: "1rem",
                        accentColor: "#2563eb",
                        cursor: "pointer",
                        borderRadius: "5rem",
                      }}
                    />
                    <span style={{ fontSize: "0.875rem", color: "#4b5563" }}>
                      Remember me
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    style={{
                      fontSize: "0.875rem",
                      color: "#2563eb",
                      fontWeight: 500,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.textDecoration = "underline")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.textDecoration = "none")
                    }
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="login-btn mt-4"
                >
                  {loading ? (
                    <>
                      <Loader2
                        size={20}
                        style={{ animation: "spin 1s linear infinite" }}
                      />{" "}
                      Verifying…
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>
            </div>

            <p
              style={{
                textAlign: "center",
                fontSize: "0.75rem",
                color: "#9ca3af",
                marginTop: "1.5rem",
              }}
            >
              © {new Date().getFullYear()} University Portal. All rights
              reserved.
            </p>
          </div>
        </div>
      </div>

      {!showChatbot && (
        <button
          className="chat-bubble"
          onClick={() => setShowChatbot(true)}
          title="Open Help Desk Chatbot"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {showChatbot && <ChatbotWidget onClose={() => setShowChatbot(false)} />}

      <style>{`
        .login-wrapper {
          display: flex;
          min-height: 100vh;
          width: 100%;
        }
        .login-left {
          display: none;
          width: 50%;
          position: relative;
          overflow: hidden;
          flex-direction: column;
          justify-content: center;
          padding-left: 3rem;
          padding-right: 3rem;
          color: #fff;
          background: linear-gradient(to bottom right, #1d4ed8, #1e40af, #3730a3);
        }
        .login-right {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: #f9fafb;
          position: relative;
          min-height: 100vh;
        }
        @media (min-width: 1024px) {
          .login-left  { display: flex; }
          .login-right { width: 50%; padding: 3rem; }
          .mobile-only { display: none !important; }
        }
        @media (min-width: 1280px) {
          .login-left { padding-left: 5rem; padding-right: 5rem; }
        }
        .branding-inner-wrapper {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 36rem;
          margin-left: auto;
          margin-right: auto;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          margin-top: 2.5rem;
        }
        .login-card-container {
          width: 100%;
          max-width: 440px;
        }
        .glow-circle {
          position: absolute;
          border-radius: 9999px;
          filter: blur(80px);
          pointer-events: none;
        }
        .feature-card {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255,255,255,0.07);
          border-radius: 0.75rem;
          border: 1px solid rgba(255,255,255,0.1);
          transition: background 0.2s;
        }
        .feature-card:hover { background: rgba(255,255,255,0.12); }
        .feature-icon {
          padding: 0.5rem;
          background: rgba(255,255,255,0.1);
          border-radius: 0.5rem;
          color: #67e8f9;
          flex-shrink: 0;
        }
        .role-tab {
          flex: 1;
          padding: 0.625rem 0;
          font-size: 0.875rem;
          font-weight: 600;
          border-radius: 0.75rem;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .role-tab-active {
          background: #fff;
          color: #2563eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .role-tab-inactive {
          background: transparent;
          color: #6b7280;
        }
        .role-tab-inactive:hover { color: #374151; }
        .login-input {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 3rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          outline: none;
          font-size: 0.875rem;
          background: rgba(249,250,251,0.5);
          transition: box-shadow 0.2s, border-color 0.2s;
        }
        .login-input:focus {
          border-color: transparent;
          box-shadow: 0 0 0 2px #3b82f6;
        }
        .login-input::placeholder { color: #9ca3af; }
        .login-btn {
          width: 100%;
          padding: 0.875rem;
          border: none;
          border-radius: 0.75rem;
          font-weight: 600;
          font-size: 0.875rem;
          color: #fff;
          background: #2563eb;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(37,99,235,0.25);
          transition: background 0.2s, box-shadow 0.2s;
        }
        .login-btn:hover { background: #1d4ed8; box-shadow: 0 10px 15px -3px rgba(37,99,235,0.4); }
        .login-btn:disabled { opacity: 0.7; cursor: not-allowed; box-shadow: none; }
        .chat-bubble {
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          background: #2563eb;
          color: #fff;
          padding: 1rem;
          border-radius: 9999px;
          border: none;
          cursor: pointer;
          box-shadow: 0 10px 15px -3px rgba(37,99,235,0.3);
          transition: transform 0.3s, background 0.2s;
          z-index: 50;
        }
        .chat-bubble:hover { background: #1d4ed8; transform: translateY(-4px); }
        @media (min-width: 1024px) {
          .chat-bubble { bottom: 2.5rem; right: 2.5rem; }
        }
      `}</style>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
