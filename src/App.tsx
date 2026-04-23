import { useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import LoginScreen from "./components/LoginScreen";
import AdminDashboard from "./components/AdminDashboard";
import LecturerDashboard from "./components/LecturerDashboard";
import AttendanceReporting from "./components/AttendanceReports";
import StudentDashboard from "./components/StudentDashboard";
import ForgotPasswordScreen from "./components/ForgotPasswordScreen";
import StudentCorrectionRequestScreen from "./components/AttendanceCorrectionRequest";
import LecturerLiveClassMonitoring from "./components/LecturerLiveClassMonitoring";
import LecturerDailySessions from "./components/LecturerDailySessions";
import AdminLogin from "./components/AdminLogin";
import StudentEnrollment from "./components/StudentEnrollment";

type UserRole = "Admin" | "Lecturer" | "Student" | null;

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [userRole, setUserRole] = useState<UserRole>(() => {
    if (localStorage.getItem("adminToken") && localStorage.getItem("admin_role") === "Admin") return "Admin";
    if (localStorage.getItem("lecturerToken") && localStorage.getItem("lecturer_role") === "Lecturer") return "Lecturer";
    if (localStorage.getItem("studentToken") && localStorage.getItem("student_role") === "Student") return "Student";
    return null;
  });

  const [loginRole, setLoginRole] = useState<"Lecturer" | "Student">("Student");

  const handleLogin = (role: "Admin" | "Lecturer" | "Student") => {
    setUserRole(role);
    if (role === "Admin") navigate("/admin");
    else if (role === "Lecturer") navigate("/lecturer");
    else if (role === "Student") navigate("/student");
  };

  const handleLogout = () => {
    toast.success("Logged out successfully", { icon: "👋", duration: 3000 });
    setTimeout(() => {
      localStorage.clear();
      setUserRole(null);
      navigate("/");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster
        position="top-center"
        containerStyle={{ zIndex: 2147483647 }}
        toastOptions={{
          style: { fontFamily: "inherit", fontSize: "0.95rem" },
          success: { iconTheme: { primary: "#16a34a", secondary: "#fff" } },
          error:   { iconTheme: { primary: "#dc2626", secondary: "#fff" } },
        }}
      />
      
      <Routes>
        <Route path="/" element={
          <LandingPage 
            onNavigateToLogin={(role) => {
              if (role === "Admin") navigate("/admin-login");
              else {
                setLoginRole(role ?? "Student");
                navigate("/login");
              }
            }} 
            onNavigateToEnroll={() => navigate("/enroll")}
          />
        } />

        <Route path="/login" element={<LoginScreen initialRole={loginRole} onLogin={handleLogin} onForgotPassword={() => navigate("/forgot-password")} onBackToHome={() => navigate("/")} />} />
        <Route path="/admin-login" element={<AdminLogin onLogin={handleLogin} onBackToHome={() => navigate("/")} />} />
        <Route path="/enroll" element={<StudentEnrollment onBackToHome={() => navigate("/")} />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen onBackToLogin={() => navigate("/login")} />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={userRole === "Admin" ? <AdminDashboard onLogout={handleLogout} onNavigate={(scr) => navigate(`/${scr}`)} /> : <Navigate to="/admin-login" />} />
        <Route path="/admin/live-class-monitoring" element={userRole === "Admin" ? <AdminDashboard onLogout={handleLogout} onNavigate={(scr) => navigate(`/${scr}`)} /> : <Navigate to="/admin-login" />} />
        <Route path="/admin/live-camera" element={userRole === "Admin" ? <AdminDashboard onLogout={handleLogout} onNavigate={(scr) => navigate(`/${scr}`)} /> : <Navigate to="/admin-login" />} />
        
        {/* Lecturer Routes */}
        <Route
          path="/lecturer"
          element={
            userRole === "Lecturer" ? (
              <LecturerDashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/lecturer/mark-attendances"
          element={
            userRole === "Lecturer" ? (
              <div className="flex min-h-screen bg-gray-50">
                <LecturerDailySessions />
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/lecturer/live-class-monitoring"
          element={
            userRole === "Lecturer" ? (
              <LecturerLiveClassMonitoring
                onLogout={handleLogout}
                onNavigate={() => navigate("/lecturer")}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        
        {/* Student Routes */}
        <Route path="/student" element={userRole === "Student" ? <StudentDashboard onLogout={handleLogout} /> : <Navigate to="/login" />} />
        <Route path="/student-correction" element={userRole === "Student" ? <StudentCorrectionRequestScreen onLogout={handleLogout} onNavigate={() => navigate("/student")} /> : <Navigate to="/login" />} />

        {/* Global Reporting */}
        <Route path="/reporting" element={<AttendanceReporting />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}
