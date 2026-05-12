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
  Scan,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";
import ChatbotWidget from "./ChatbotWidget";

const API_BASE = "http://localhost:8000";

interface ForgotPasswordScreenProps {
  onBackToLogin: () => void;
}

export default function ForgotPasswordScreen({
  onBackToLogin,
}: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Sending code...");

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to send verification code");
      }

      setRecoveryEmail(data.recovery_email);

      toast.success("Success! Verification code sent to your email.", {
        id: toastId,
        duration: 4000,
      });
      setStep(2);
    } catch (error: any) {
      toast.error(error.message || "Connection error. Please try again.", {
        id: toastId,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      toast.error("Please enter the full 6-digit code.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Verifying code...");

    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Invalid or expired code.");
      }

      // UX delay — keep the loading spinner visible
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Toast AFTER delay
      toast.success("Code verified! You can now reset your password.", {
        id: toastId,
      });
      setStep(3);
    } catch (error: any) {
      toast.error(error.message || "Verification failed. Please try again.", {
        id: toastId,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Resetting password...");

    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp: otp.join(""),
          new_password: newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Error resetting password.");
      }

      // UX delay — keep the loading spinner visible
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Toast AFTER delay
      toast.success("Password successfully reset! Please login.", {
        id: toastId,
        duration: 4000,
      });
      onBackToLogin();
    } catch (error: any) {
      toast.error(error.message || "Reset failed. Please try again.", {
        id: toastId,
      });
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

          <button
            onClick={onBackToLogin}
            className="absolute top-4 left-6 lg:left-12 flex items-center gap-2 p-3 text-blue-100 hover:text-white transition-colors z-50"
          >
            <ArrowLeft size={20} />
            <span className="font-medium tracking-wide">Back to Login</span>
          </button>

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
              Secure Account
              <br />
              <span style={{ color: "#93c5fd" }}>Recovery</span>
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
              Enter your registered email address to receive a secure 6-digit
              verification code to reset your password and regain access to the
              portal.
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
          <button
            className="mobile-only"
            onClick={onBackToLogin}
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
              {/* Step Progress Indicator */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  marginBottom: "2rem",
                }}
              >
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`step-bar ${step >= s ? "active" : ""}`}
                  />
                ))}
              </div>

              {step === 1 && (
                <>
                  <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "4rem",
                        height: "4rem",
                        background: "#eff6ff",
                        color: "#2563eb",
                        borderRadius: "9999px",
                        marginBottom: "1.25rem",
                        border: "1px solid #dbeafe",
                      }}
                    >
                      <GraduationCap size={32} />
                    </div>
                    <h2
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "#111827",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Reset Password
                    </h2>
                    <p style={{ color: "#5a5d61ff", fontSize: "0.895rem" }}>
                      Enter your registered email address to receive a 6-digit
                      verification code.
                    </p>
                  </div>

                  <form
                    onSubmit={handleSubmit}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1.5rem",
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
                          className="login-input text-sm rounded-xl font-semibold"
                          placeholder="Enter your Email Address"
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                      }}
                    >
                      <button
                        type="submit"
                        disabled={loading}
                        className="login-btn"
                      >
                        {loading ? (
                          <>
                            <Loader2
                              size={20}
                              style={{ animation: "spin 1s linear infinite" }}
                            />{" "}
                            Sending Code…
                          </>
                        ) : (
                          "Send Verification Code"
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={onBackToLogin}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.5rem",
                          fontSize: "0.875rem",
                          color: "#2563eb",
                          fontWeight: 500,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "0.5rem",
                          transition: "color 0.2s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = "#1d4ed8")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color = "#2563eb")
                        }
                      >
                        <ArrowLeft size={16} />
                        Back to Login
                      </button>
                    </div>
                  </form>
                </>
              )}

              {step === 2 && (
                <>
                  <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "4rem",
                        height: "4rem",
                        background: "#eff6ff",
                        color: "#2563eb",
                        borderRadius: "9999px",
                        marginBottom: "1.25rem",
                        border: "1px solid #dbeafe",
                      }}
                    >
                      <Mail size={32} />
                    </div>
                    <h2
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "#111827",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Check your email
                    </h2>
                    <p style={{ color: "#5a5d61ff", fontSize: "0.895rem" }}>
                      We've sent a 6-digit verification code to your registered
                      email:
                      <br />{" "}
                      <span className="text-gray-800 font-medium">
                        {recoveryEmail}
                      </span>
                    </p>
                  </div>

                  <form onSubmit={handleVerifyOtp}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                        marginBottom: "1.5rem",
                      }}
                    >
                      {otp.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`otp-${idx}`}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(e.target.value, idx)}
                          onKeyDown={(e) => handleKeyDown(e, idx)}
                          disabled={loading}
                          className="otp-input"
                        />
                      ))}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                      }}
                    >
                      <button
                        type="submit"
                        disabled={loading}
                        className="login-btn"
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
                          "Verify Code"
                        )}
                      </button>

                      <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
                        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                          Didn't receive the code?{" "}
                          <button
                            type="button"
                            onClick={handleSubmit}
                            style={{
                              color: "#2563eb",
                              fontWeight: 600,
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.textDecoration =
                                "underline")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.textDecoration = "none")
                            }
                          >
                            Resend
                          </button>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={onBackToLogin}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.5rem",
                          fontSize: "0.875rem",
                          color: "#2563eb",
                          fontWeight: 500,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "0.5rem",
                          transition: "color 0.2s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = "#1d4ed8")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color = "#2563eb")
                        }
                      >
                        <ArrowLeft size={16} />
                        Back to Login
                      </button>
                    </div>
                  </form>
                </>
              )}

              {step === 3 && (
                <>
                  <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "4rem",
                        height: "4rem",
                        background: "#eff6ff",
                        color: "#2563eb",
                        borderRadius: "9999px",
                        marginBottom: "1.25rem",
                        border: "1px solid #dbeafe",
                      }}
                    >
                      <ShieldCheck size={32} />
                    </div>
                    <h2
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "#111827",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Set New Password
                    </h2>
                    <p style={{ color: "#5a5d61ff", fontSize: "0.895rem" }}>
                      Your new password must be different from previously used
                      passwords.
                    </p>
                  </div>

                  <form
                    onSubmit={handlePasswordReset}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1.5rem",
                    }}
                  >
                    <div>
                      <label
                        htmlFor="new-password"
                        style={{
                          display: "block",
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          color: "#374151",
                          marginBottom: "0.5rem",
                        }}
                      >
                        New Password
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
                          id="new-password"
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="login-input text-sm rounded-xl font-semibold"
                          placeholder="Enter your new password"
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="confirm-password"
                        style={{
                          display: "block",
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          color: "#374151",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Confirm Password
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
                          id="confirm-password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="login-input text-sm rounded-xl font-semibold"
                          placeholder="Enter your confirm password"
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                      }}
                    >
                      <button
                        type="submit"
                        disabled={loading}
                        className="login-btn"
                      >
                        {loading ? (
                          <>
                            <Loader2
                              size={20}
                              style={{ animation: "spin 1s linear infinite" }}
                            />{" "}
                            Resetting Password…
                          </>
                        ) : (
                          "Reset Password"
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={onBackToLogin}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.5rem",
                          fontSize: "0.875rem",
                          color: "#2563eb",
                          fontWeight: 500,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "0.5rem",
                          transition: "color 0.2s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = "#1d4ed8")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color = "#2563eb")
                        }
                      >
                        <ArrowLeft size={16} />
                        Back to Login
                      </button>
                    </div>
                  </form>
                </>
              )}
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
        .otp-input {
          width: 3rem;
          height: 3.5rem;
          text-align: center;
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          background: rgba(249,250,251,0.5);
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          outline: none;
          transition: all 0.2s;
        }
        .otp-input:focus {
          border-color: #3b82f6;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .step-bar {
          height: 0.375rem;
          border-radius: 9999px;
          background: #e5e7eb;
          width: 1rem;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .step-bar.active {
          width: 2rem;
          background: #2563eb;
          box-shadow: 0 0 8px rgba(37, 99, 235, 0.4);
        }
        @media (min-width: 640px) {
          .otp-input {
            width: 3.5rem;
            height: 4rem;
          }
        }
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
