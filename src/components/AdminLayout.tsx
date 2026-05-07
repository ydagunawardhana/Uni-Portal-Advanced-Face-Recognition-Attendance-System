import { useState, useEffect } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { LogOut, User, Wifi, WifiOff } from "lucide-react";
import Sidebar from "./Sidebar";
import toast from "react-hot-toast";

export default function AdminLayout({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("Offline");

  // Listen for explicit camera status changes from child components
  useEffect(() => {
    // Default to offline when first loading the layout
    setCameraStatus("Offline");

    const handleCameraStatusChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail === "Online" || customEvent.detail === "Offline") {
        setCameraStatus(customEvent.detail);
      }
    };

    window.addEventListener("camera-status", handleCameraStatusChange);

    return () => {
      window.removeEventListener("camera-status", handleCameraStatusChange);
    };
  }, []);

  // Sync tab with URL for Sidebar highlight
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes("dashboard")) return "dashboard";
    if (path.includes("students")) return "students";
    if (path.includes("pre-registrations")) return "pre_registrations";
    if (path.includes("manage-students")) return "manage_students";
    if (path.includes("lecturers")) return "lecturers";
    if (path.includes("modules")) return "modules";
    if (path.includes("timetable")) return "timetable";
    if (path.includes("live-sessions")) return "live_attendance";
    if (path.includes("live-camera")) return "live_camera";
    if (path.includes("reports")) return "reports";
    if (path.includes("attendance-requests")) return "attendance_requests";
    if (path.includes("audit")) return "audit";
    if (path.includes("settings")) return "settings";
    return "dashboard";
  };

  const handleTabChange = (tab: string) => {
    switch (tab) {
      case "dashboard":
        navigate("/admin/dashboard");
        break;
      case "students":
        navigate("/admin/students");
        break;
      case "pre_registrations":
        navigate("/admin/pre-registrations");
        break;
      case "manage_students":
        navigate("/admin/manage-students");
        break;
      case "lecturers":
        navigate("/admin/manage-lecturers");
        break;
      case "modules":
        navigate("/admin/manage-modules");
        break;
      case "timetable":
        navigate("/admin/timetable");
        break;
      case "live_attendance":
        navigate("/admin/live-sessions");
        break;
      case "live_camera":
        navigate("/admin/live-camera");
        break;
      case "reports":
        navigate("/admin/reports");
        break;
      case "audit":
        navigate("/admin/audit-logs");
        break;
      case "settings":
        navigate("/admin/settings");
        break;
      default:
        navigate("/admin/dashboard");
    }
  };

  const getHeaderTitle = () => {
    const tab = getActiveTab();
    switch (tab) {
      case "dashboard":
        return "Admin Dashboard";
      case "students":
        return "Manage Students";
      case "pre_registrations":
        return "Registration Queue";
      case "manage_students":
        return "Student Database";
      case "lecturers":
        return "Manage Lecturers";
      case "modules":
        return "Manage Modules";
      case "settings":
        return "System Settings";
      case "timetable":
        return "Timetable Integration";
      case "reports":
        return "System Reports";
      case "attendance_requests":
        return "Attendance Requests";
      case "audit":
        return "System Audit Logs";
      case "live_attendance":
        return "Live Academic Overview";
      case "live_camera":
        return "Live Monitoring Feed";
      default:
        return "Portal Access";
    }
  };

  const getHeaderDescription = () => {
    const tab = getActiveTab();
    switch (tab) {
      case "dashboard":
        return "Manage your university attendance system";
      case "students":
        return "View and edit student enrollment records";
      case "pre_registrations":
        return "Process and approve pending student registrations";
      case "manage_students":
        return "View all registered students and process re-training requests";
      case "lecturers":
        return "Manage academic staff profiles and assignments";
      case "modules":
        return "Configure university modules and courses";
      case "settings":
        return "Configure system preferences and parameters";
      case "timetable":
        return "Upload and manage batch timetables";
      case "reports":
        return "Generate and export campus-wide attendance reports";
      case "attendance_requests":
        return "Review and manage attendance appeals from students";
      case "audit":
        return "View system audit logs";
      case "live_attendance":
        return "Oversee real-time attendance sessions for Lecturers";
      case "live_camera":
        return "View real-time camera feeds and attendance logs";
      default:
        return "Manage your university attendance system";
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        activeTab={getActiveTab()}
        onTabChange={handleTabChange}
        onCollapseChange={setIsSidebarCollapsed}
        onLogout={onLogout}
      />

      <div
        className={`w-full transition-all duration-300 ${isSidebarCollapsed ? "ml-[80px]" : "ml-[280px]"}`}
      >
        <header className="top-0 z-40 bg-white shadow-md border-b border-gray-200">
          <div className="px-8 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {getHeaderTitle()}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {getHeaderDescription()}
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {/* Camera Status Pill */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
                  cameraStatus === "Online"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : cameraStatus === "Offline"
                      ? "bg-red-50 border-red-200 text-red-600"
                      : "bg-gray-100 border-gray-200 text-gray-500"
                }`}
              >
                {cameraStatus === "Online" ? (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                    </span>
                    <Wifi className="w-3.5 h-3.5" />
                    Camera: Online
                  </>
                ) : cameraStatus === "Offline" ? (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                    </span>
                    <WifiOff className="w-3.5 h-3.5" />
                    Camera: Offline
                  </>
                ) : (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-pulse relative inline-flex rounded-full h-2.5 w-2.5 bg-gray-400" />
                    </span>
                    Checking…
                  </>
                )}
              </div>

              <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg border-2 border-gray-200 shadow-sm">
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-bold text-gray-700">
                  Admin User
                </span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 px-4 py-2 cursor-pointer bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-sm"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        <main className="px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
