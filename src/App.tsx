import { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import LandingPage from "./components/LandingPage";
import LoginScreen from "./components/LoginScreen";
import AdminDashboard from "./components/AdminDashboard";
import LecturerDashboard from "./components/LecturerDashboard";
import AttendanceReporting from "./components/AttendanceReports";
import StudentDashboard from "./components/StudentDashboard";
import ForgotPasswordScreen from "./components/ForgotPasswordScreen";
import StudentCorrectionRequestScreen from "./components/AttendanceCorrectionRequest";
import LecturerLiveClassMonitoring from "./components/LecturerLiveClassMonitoring";
import AdminLogin from "./components/AdminLogin";

type Screen =
  | "landing"
  | "login"
  | "admin"
  | "lecturer"
  | "reporting"
  | "student"
  | "forgot-password"
  | "sidebar-demo"
  | "start-live-session"
  | "live-monitoring"
  | "student-correction"
  | "admin-login";
type UserRole = "Admin" | "Lecturer" | "Student" | null;

export default function App() {
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem("user_role") as UserRole) || null;
  });

  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    const role = localStorage.getItem("user_role");
    if (role === "Admin") return "admin";
    if (role === "Lecturer") return "lecturer";
    if (role === "Student") return "student";
    return "landing";
  });

  const [loginRole, setLoginRole] = useState<"Lecturer" | "Student">("Student");

  const handleLogin = (role: "Admin" | "Lecturer" | "Student") => {
    setUserRole(role);
    if (role === "Admin") {
      setCurrentScreen("admin");
    } else if (role === "Lecturer") {
      setCurrentScreen("lecturer");
    } else if (role === "Student") {
      setCurrentScreen("student");
    }
  };

  const handleLogout = () => {
    // Completely destroy the local session cache
    localStorage.removeItem("token");
    localStorage.removeItem("studentToken");
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_email");
    localStorage.removeItem("isAdminLoggedIn");
    localStorage.removeItem("adminActiveTab");
    localStorage.removeItem("requiresPasswordChange");

    setCurrentScreen("landing");
    setUserRole(null);
  };

  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const handleForgotPassword = () => {
    setCurrentScreen("forgot-password");
  };

  const handleBackToLogin = () => {
    setCurrentScreen("login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Global toast container — sits above all screens */}
      <Toaster
        position="top-center"
        toastOptions={{
          style: { fontFamily: "inherit", fontSize: "0.95rem" },
          success: { iconTheme: { primary: "#16a34a", secondary: "#fff" } },
          error:   { iconTheme: { primary: "#dc2626", secondary: "#fff" } },
        }}
      />
      {currentScreen === "landing" && (
        <LandingPage onNavigateToLogin={(role) => {
          if (role === "Admin") {
            setCurrentScreen("admin-login");
          } else {
            setLoginRole(role ?? "Student");
            setCurrentScreen("login");
          }
        }} />
      )}
      {currentScreen === "login" && (
        <LoginScreen
          initialRole={loginRole}
          onLogin={handleLogin}
          onForgotPassword={handleForgotPassword}
          onBackToHome={() => setCurrentScreen("landing")}
        />
      )}
      {currentScreen === "admin-login" && (
        <AdminLogin
          onLogin={handleLogin}
          onBackToHome={() => setCurrentScreen("landing")}
        />
      )}
      {currentScreen === "forgot-password" && (
        <ForgotPasswordScreen onBackToLogin={handleBackToLogin} />
      )}
      {currentScreen === "admin" && (
        <AdminDashboard onLogout={handleLogout} onNavigate={handleNavigate} />
      )}
      {currentScreen === "lecturer" && (
        <LecturerDashboard onLogout={handleLogout} />
      )}
      {currentScreen === "reporting" && (
        <AttendanceReporting />
      )}
      {currentScreen === "student" && (
        <StudentDashboard onLogout={handleLogout} />
      )}
      {currentScreen === "live-monitoring" && (
        <LecturerLiveClassMonitoring
          onLogout={handleLogout}
          onNavigate={handleNavigate}
        />
      )}
      {currentScreen === "student-correction" && (
        <StudentCorrectionRequestScreen
          onLogout={handleLogout}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}
