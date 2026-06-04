import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import StudentSidebar from "./StudentSidebar";
import DashboardOverview from "./DashboardOverview";
import StudentTimetable from "./StudentTimetable";
import AttendanceCorrectionRequest from "./AttendanceCorrectionRequest";
import StudentProfileSecurity from "./StudentProfileSecurity";
import StudentHelpSupport from "./StudentHelpSupport";
import BookAppointments from "./BookAppointments";
import { API_BASE_URL } from "../config";
import StudentMyAttendance from "./StudentMyAttendance";
import {
  Bell,
  LogOut,
  CheckCircle,
  AlertTriangle,
  Info,
  RefreshCw,
} from "lucide-react";
import { useLocation } from "react-router-dom";

const API_BASE = API_BASE_URL;

interface StudentDashboardProps {
  onLogout: () => void;
  onNavigate?: (screen: any) => void;
}

export default function StudentDashboard({
  onLogout,
  onNavigate,
}: StudentDashboardProps) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [studentFirstName, setStudentFirstName] = useState("Student");
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem("studentToken");
      const response = await fetch(
        `${API_BASE}/api/attendance/student/dashboard-summary`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched Dashboard Data:", data); // DEBUGGING: Check console
        setDashboardData(data);
      } else {
        console.error("Failed to fetch data, status:", response.status);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Notification States
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const timeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);

    if (diffInSeconds < 60) return "Just now";
    const mins = Math.floor(diffInSeconds / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Fetch Data
  const fetchNotifications = async () => {
    try {
      const studentToken = localStorage.getItem("studentToken");
      if (!studentToken) return;

      const response = await fetch(`${API_BASE}/api/student/notifications`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      if (response.ok) {
        const newData = await response.json();

        // Check for new unread notifications compared to local state
        setNotifications((prev) => {
          const prevUnreadIds = new Set(
            prev.filter((n) => !n.is_read).map((n) => n.id)
          );
          newData.forEach((notif: any) => {
            if (!notif.is_read && !prevUnreadIds.has(notif.id)) {
              toast.success(`New Notification: ${notif.title}`, {
                icon: "🔔",
                duration: 4000,
              });
            }
          });
          return newData;
        });
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  useEffect(() => {
    const fetchStudentProfile = async () => {
      try {
        const token = localStorage.getItem("studentToken");
        if (!token) return;

        const response = await fetch(`${API_BASE}/api/student/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();

          const firstName = data.name.split(" ")[0];
          setStudentFirstName(firstName);
        }
      } catch (error) {
        console.error("Failed to fetch student profile", error);
      }
    };

    fetchStudentProfile();

    // Initial fetch and 10s polling for notifications
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  // Password Warning — read flag from localStorage set by login handler.
  useEffect(() => {
    const checkFlag = () => {
      const requiresPassChange =
        localStorage.getItem("requiresPasswordChange") === "true";
      setNeedsPasswordChange(requiresPassChange);

      if (requiresPassChange) {
        toast(
          "⚠️ Security Alert: Please go to your Profile to change your auto-generated temporary password.",
          {
            duration: 10000,
            style: {
              background: "#fff3cd",
              color: "#856404",
              fontWeight: 500,
              border: "1px solid #ffeeba",
            },
            id: "password-warning-toast",
          }
        );
      }
    };

    // Check immediately on mount
    checkFlag();

    // Re-check whenever another tab/component removes the flag from localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "requiresPasswordChange") {
        setNeedsPasswordChange(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Listen for navigation state changes (e.g., from 'My Attendance' to 'Fix / Appeal')
  useEffect(() => {
    if (location.state && location.state.prefilledSessionId) {
      setActiveTab("request-correction");
    }
  }, [location.state]);

  // Listen for hash changes to support Quick Actions
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      const validTabs = [
        "dashboard",
        "timetable",
        "attendance",
        "request-correction",
        "profile",
        "help",
        "book-appointments",
      ];
      if (hash && validTabs.includes(hash)) {
        setActiveTab(hash);
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange(); // Check on initial load

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("studentToken");
      if (!token) return;

      const response = await fetch(
        `${API_BASE}/api/student/notifications/mark-read`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      }
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
    }
  };

  const handleLogoutClick = () => {
    onLogout();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        // Re-check flag each time the user returns to the dashboard tab
        // (e.g., after they changed their password in the Profile tab)
        const flagStillSet =
          localStorage.getItem("requiresPasswordChange") === "true";
        if (needsPasswordChange !== flagStillSet) {
          setNeedsPasswordChange(flagStillSet);
        }
        if (loading)
          return (
            <div className="p-8 text-center text-gray-500">
              Loading dashboard...
            </div>
          );
        if (!dashboardData)
          return (
            <div className="p-8 text-center text-red-500">
              Failed to load data. Please check backend response.
            </div>
          );

        return (
          <div className="p-8 pb-10">
            {needsPasswordChange && (
              <div className="bg-white border border-gray-200 p-4 mb-6 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-5">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2 rounded-lg mr-4">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-700">
                      Security Warning: Temporary Password in Use
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      Please navigate to your <strong>My Profile</strong> and Go
                      to Change Password Section to change your password
                      immediately to secure your account.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    window.location.hash = "password-settings";
                    setActiveTab("profile");
                  }}
                  className="ml-6 px-4 py-2 bg-yellow-100 text-black text-sm font-bold rounded-lg hover:bg-red-100 border-2 transition-colors whitespace-nowrap cursor-pointer shadow-md"
                >
                  Go to Profile
                </button>
              </div>
            )}
            <DashboardOverview data={dashboardData} isLoading={loading} />
          </div>
        );
      case "timetable":
        return <StudentTimetable />;
      case "attendance":
        return <StudentMyAttendance />;
      case "request-correction":
        return (
          <AttendanceCorrectionRequest
            onLogout={onLogout}
            onNavigate={onNavigate || (() => {})}
          />
        );
      case "profile":
        return <StudentProfileSecurity notifications={notifications} />;
      case "help":
        return <StudentHelpSupport />;
      case "book-appointments":
        return <BookAppointments />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <StudentSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogoutClick}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-4 flex justify-between items-center flex-shrink-0 relative z-40">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 capitalize">
              {activeTab.replace("-", " ")}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Welcome back, {studentFirstName}!
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {activeTab === "dashboard" && (
              <button
                onClick={fetchDashboardData}
                disabled={refreshing}
                className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50 mr-4"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    refreshing ? "animate-spin text-blue-600" : ""
                  }`}
                />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            )}
            {/* Notification Dropdown Container */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 cursor-pointer hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
              >
                <Bell className="w-6 h-6 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-6 right-6 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown Menu */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 transform transition-all flex flex-col">
                  <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0">
                    <h3 className="font-bold cursor-pointer text-gray-800">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No new notifications</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {notifications.map((notif) => (
                          <li
                            key={notif.id}
                            className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer flex gap-4 ${
                              !notif.is_read ? "bg-blue-50/50" : ""
                            }`}
                          >
                            <div className="flex-shrink-0 mt-1">
                              {getNotificationIcon(notif.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-semibold truncate ${
                                  !notif.is_read
                                    ? "text-gray-900"
                                    : "text-gray-700"
                                }`}
                              >
                                {notif.title}
                              </p>
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                                {notif.message}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-wider">
                                {timeAgo(notif.timestamp)}
                              </p>
                            </div>
                            {!notif.is_read && (
                              <div className="flex-shrink-0 flex items-center">
                                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="p-3 border-t bg-gray-50 text-center shrink-0">
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline w-full">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogoutClick}
              className="flex items-center cursor-pointer space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold shadow-sm"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Dynamic Content Body */}
        <main className="flex-1 overflow-y-auto">{renderContent()}</main>
      </div>
    </div>
  );
}
