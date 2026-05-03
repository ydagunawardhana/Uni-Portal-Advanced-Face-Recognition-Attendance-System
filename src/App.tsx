import { useState, useEffect } from "react";
import PostSessionReview from "./components/PostSessionReview";
import { Toaster, toast } from "react-hot-toast";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import LandingPage from "./components/LandingPage";
import LoginScreen from "./components/LoginScreen";
import LecturerDashboard from "./components/LecturerDashboard";
import AttendanceReporting from "./components/AttendanceReports";
import StudentDashboard from "./components/StudentDashboard";
import ForgotPasswordScreen from "./components/ForgotPasswordScreen";
import StudentCorrectionRequestScreen from "./components/AttendanceCorrectionRequest";
import LecturerLiveClassMonitoring from "./components/LecturerLiveClassMonitoring";
import LecturerDailySessions from "./components/LecturerDailySessions";
import AdminLogin from "./components/AdminLogin";
import StudentEnrollment from "./components/StudentEnrollment";
import AdminLayout from "./components/AdminLayout";
import DashboardHome from "./components/DashboardHome";
import SettingsScreen from "./components/SettingsScreen";
import ManageLecturers from "./components/ManageLecturers";
import ManageStudents from "./components/ManageStudents";
import PendingRegistrations from "./components/PendingRegistrations";
import TimetableUpload from "./components/TimetableUpload";
import ManageModules from "./components/ManageModules";
import LiveSessionsDashboard from "./components/LiveSessionsDashboard";
import SystemAuditLogs from "./components/SystemAuditLogs";
import StudentRegistration from "./components/StudentRegistration";

type UserRole = "Admin" | "Lecturer" | "Student" | null;

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [userRole, setUserRole] = useState<UserRole>(() => {
    if (
      localStorage.getItem("adminToken") &&
      localStorage.getItem("admin_role") === "Admin"
    )
      return "Admin";
    if (
      localStorage.getItem("lecturerToken") &&
      localStorage.getItem("lecturer_role") === "Lecturer"
    )
      return "Lecturer";
    if (
      localStorage.getItem("studentToken") &&
      localStorage.getItem("student_role") === "Student"
    )
      return "Student";
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
          error: { iconTheme: { primary: "#dc2626", secondary: "#fff" } },
        }}
      />

      <Routes>
        <Route
          path="/"
          element={
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
          }
        />

        <Route
          path="/login"
          element={
            <LoginScreen
              initialRole={loginRole}
              onLogin={handleLogin}
              onForgotPassword={() => navigate("/forgot-password")}
              onBackToHome={() => navigate("/")}
            />
          }
        />
        <Route
          path="/admin-login"
          element={
            <AdminLogin
              onLogin={handleLogin}
              onBackToHome={() => navigate("/")}
            />
          }
        />
        <Route
          path="/enroll"
          element={<StudentEnrollment onBackToHome={() => navigate("/")} />}
        />
        <Route
          path="/forgot-password"
          element={
            <ForgotPasswordScreen onBackToLogin={() => navigate("/login")} />
          }
        />

        {/* Admin Portal (Route-Based) */}
        <Route
          path="/admin"
          element={
            userRole === "Admin" ? (
              <AdminLayout onLogout={handleLogout} />
            ) : (
              <Navigate to="/admin-login" />
            )
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route
            path="dashboard"
            element={
              <DashboardHome onTabChange={(tab) => navigate(`/admin/${tab}`)} />
            }
          />
          <Route path="students" element={<StudentRegistration />} />
          <Route
            path="pre-registrations"
            element={
              <PendingRegistrations
                onProcess={(data) =>
                  navigate("/admin/students", { state: { preFill: data } })
                }
              />
            }
          />
          <Route
            path="manage-students"
            element={
              <ManageStudents
                onRegisterNew={() => navigate("/admin/students")}
              />
            }
          />
          <Route path="manage-lecturers" element={<ManageLecturers />} />
          <Route path="manage-modules" element={<ManageModules />} />
          <Route path="timetable" element={<TimetableUpload />} />
          <Route path="live-sessions" element={<LiveSessionsDashboard />} />
          <Route
            path="live-camera"
            element={
              <LecturerLiveClassMonitoring
                onLogout={handleLogout}
                onNavigate={() => {}}
              />
            }
          />
          <Route path="reports" element={<AttendanceReporting />} />
          <Route path="audit-logs" element={<SystemAuditLogs />} />
          <Route path="settings" element={<SettingsScreen />} />
        </Route>

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
              <LecturerDashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/lecturer/my-subjects"
          element={
            userRole === "Lecturer" ? (
              <LecturerDashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/lecturer/timetable"
          element={
            userRole === "Lecturer" ? (
              <LecturerDashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/lecturer/appointments"
          element={
            userRole === "Lecturer" ? (
              <LecturerDashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/lecturer/profile"
          element={
            userRole === "Lecturer" ? (
              <LecturerDashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/lecturer/history"
          element={
            userRole === "Lecturer" ? (
              <LecturerDashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/lecturer/manual-attendances"
          element={
            userRole === "Lecturer" ? (
              <LecturerDashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/lecturer/session-review"
          element={
            userRole === "Lecturer" ? (
              <LecturerDashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/lecturer/correction-requests"
          element={
            userRole === "Lecturer" ? (
              <LecturerDashboard onLogout={handleLogout} />
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
        <Route
          path="/student"
          element={
            userRole === "Student" ? (
              <StudentDashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/student-correction"
          element={
            userRole === "Student" ? (
              <StudentCorrectionRequestScreen
                onLogout={handleLogout}
                onNavigate={() => navigate("/student")}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Global Reporting */}
        <Route path="/reporting" element={<AttendanceReporting />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}
