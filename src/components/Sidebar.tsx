import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  UserCog,
  History,
  GraduationCap,
  Clock,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  FileSpreadsheet,
  BookOpen,
  Video,
  Edit,
} from "lucide-react";

const API_BASE = "http://localhost:8000";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onCollapseChange?: (isCollapsed: boolean) => void;
  onLogout?: () => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  onCollapseChange,
  onLogout,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [preRegCount, setPreRegCount] = useState(0);
  const [reTrainCount, setReTrainCount] = useState(0);
  const [pendingCorrectionCount, setPendingCorrectionCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      const token = localStorage.getItem("adminToken");
      if (!token) return;
      try {
        const [preRegRes, reTrainRes, correctionRes] = await Promise.all([
          fetch(`${API_BASE}/api/admin/pre-registrations`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_BASE}/api/admin/pending-retrains`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_BASE}/api/attendance/admin/attendance-requests`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);
        if (preRegRes.ok) {
          const data = await preRegRes.json();
          setPreRegCount(Array.isArray(data) ? data.length : 0);
        }
        if (reTrainRes.ok) {
          const data = await reTrainRes.json();
          setReTrainCount(Array.isArray(data) ? data.length : 0);
        }
        if (correctionRes.ok) {
          const data = await correctionRes.json();
          const pending = Array.isArray(data)
            ? data.filter((r: any) => r.status === "Pending").length
            : 0;
          setPendingCorrectionCount(pending);
        }
      } catch {
        // Silently fail — badges simply won't show if network is down
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleCollapse = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    if (onCollapseChange) {
      onCollapseChange(newCollapsedState);
    }
  };

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      path: "/admin/dashboard",
    },
    {
      id: "students",
      label: "Student Registration",
      icon: Users,
      path: "/admin/students",
    },
    {
      id: "pre_registrations",
      label: "Pre Registration Queue",
      icon: Clock,
      path: "/admin/pre-registrations",
      badgeCount: preRegCount,
    },
    {
      id: "manage_students",
      label: "Manage Students",
      icon: GraduationCap,
      path: "/admin/manage-students",
      badgeCount: reTrainCount,
      badgeTheme: "amber" as const,
    },
    {
      id: "lecturers",
      label: "Manage Lecturers",
      icon: UserCog,
      path: "/admin/manage-lecturers",
    },
    {
      id: "modules",
      label: "Manage Modules",
      icon: BookOpen,
      path: "/admin/manage-modules",
    },
    {
      id: "timetable",
      label: "Timetable Integration",
      icon: FileSpreadsheet,
      path: "/admin/timetable",
    },
    {
      id: "live_attendance",
      label: "Live Class Monitoring",
      icon: Video,
      path: "/admin/live-sessions",
    },
    {
      id: "manual_attendances",
      label: "Manual Attendances",
      icon: Edit,
      path: "/admin/manual-attendances",
    },
    {
      id: "attendance_requests",
      label: "Attendance Requests",
      icon: History,
      path: "/admin/attendance-requests",
      badgeCount: pendingCorrectionCount,
      badgeTheme: "red" as const,
    },
    { id: "reports", label: "Reports", icon: FileText, path: "/admin/reports" },

    {
      id: "audit",
      label: "Audit Logs",
      icon: History,
      path: "/admin/audit-logs",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      path: "/admin/settings",
    },
  ];

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-[#1e293b] to-[#0f172a] text-white flex flex-col transition-all duration-300 z-50 ${
        isCollapsed ? "w-[80px]" : "w-[280px]"
      }`}
    >
      {/* Header Section */}
      <div className="p-6 border-b border-gray-500">
        <div className="flex items-center space-x-3">
          {/* University Logo Icon */}
          <div className="bg-blue-600 p-2 rounded-xl flex-shrink-0">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>

          {/* Text Content */}
          {!isCollapsed && (
            <div>
              <h2 className="text-lg font-bold text-white tracking-wider">
                University Portal
              </h2>
              <p className="text-sm text-gray-400 mt-0.5 font-semibold">
                Admin Panel
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const badge = item.badgeCount ?? 0;
          const isAmber = (item as any).badgeTheme === "amber";

          const badgeClass = isActive
            ? isAmber
              ? "bg-white text-blue-600"
              : "bg-white text-blue-600"
            : isAmber
              ? "bg-blue-600 text-white"
              : "bg-blue-600 text-white";

          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                `w-full flex items-center cursor-pointer ${isCollapsed ? "justify-center px-0 py-3" : "px-4 py-2.5"} rounded-lg transition-all duration-200 group ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/50"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`
              }
              title={isCollapsed ? item.label : ""}
            >
              <Icon
                className={`min-w-[20px] shrink-0 transition-transform ${isCollapsed ? "w-5 h-5 mx-auto" : "w-6 h-6"}`}
              />

              {!isCollapsed && (
                <div className="flex items-center justify-between w-full ml-3">
                  <span className="text-sm font-medium">{item.label}</span>

                  {badge > 0 && (
                    <span
                      className={`inline-flex items-center justify-center min-w-[22px] h-[22px] px-2 py-1 text-xs font-bold rounded-full transition-colors ${badgeClass}`}
                    >
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </div>
              )}

              {/* Collapsed state: dot indicator when there are pending items */}
              {isCollapsed && badge > 0 && (
                <span
                  className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
                    isAmber ? "bg-amber-400" : "bg-blue-400"
                  }`}
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / Collapse Trigger */}
      <div className="p-4 mt-1 pt-2 border-t border-gray-700 space-y-4">
        {/* Logout */}
        {onLogout && (
          <button
            onClick={onLogout}
            className={`w-full flex items-center px-4 py-3 cursor-pointer rounded-lg transition-colors text-red-400 hover:bg-gray-800 hover:text-red-300 ${
              isCollapsed ? "justify-center" : "gap-3"
            }`}
          >
            <LogOut
              className={`min-w-[20px] shrink-0 transition-transform ${isCollapsed ? "w-6 h-6 mx-auto" : "w-5 h-5"}`}
            />
            {!isCollapsed && (
              <span className="text-sm font-medium">Logout</span>
            )}
          </button>
        )}

        {/* Collapse toggle */}
        <button
          onClick={handleToggleCollapse}
          className="w-full flex items-center justify-center cursor-pointer space-x-3 px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-300 hover:text-white"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? (
            <ChevronsRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronsLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
