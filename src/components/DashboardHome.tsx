import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Users,
  GraduationCap,
  CheckCircle,
  ArrowRight,
  UserPlus,
  ClipboardCheck,
  UserCheck,
  Clock,
  AlertCircle,
  LogIn,
  LogOut,
  Trash2,
  Edit,
  Download,
  Settings,
  RefreshCw,
  Power,
  Camera,
  AlertTriangle,
  ClipboardList,
  ChevronRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_BASE = "http://localhost:8000";

interface DashboardHomeProps {
  onTabChange?: (tab: string) => void;
}

// API shapes
interface DashboardStats {
  total_students: number;
  total_lecturers: number;
  todays_attendance_pct: number;
  pending_manual_requests: number;
  pendingRetrains: number;
  lowAttendanceAlerts: number;
  activeModulesToday: number;
  weeklyTrend: any[];
  departmentStats: any[];
}

interface ActivityItem {
  id: number;
  action_type: string;
  description: string;
  timestamp: string;
}

// Skeleton helper
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className ?? ""}`} />
  );
}

// Time formatter
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} hour${diffH > 1 ? "s" : ""} ago`;
  const diffD = Math.round(diffH / 24);
  return `${diffD} day${diffD > 1 ? "s" : ""} ago`;
}

// Component
export default function DashboardHome({ onTabChange }: DashboardHomeProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statsError, setStatsError] = useState(false);
  const [activityError, setActivityError] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [preRegCount, setPreRegCount] = useState<number | null>(null);

  // Fetch pre-registration count (same source as Sidebar badge)
  useEffect(() => {
    const fetchPreRegCount = async () => {
      const token = localStorage.getItem("adminToken");
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/api/admin/pre-registrations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPreRegCount(Array.isArray(data) ? data.length : 0);
        }
      } catch {
        // Silently fail
      }
    };
    fetchPreRegCount();
    const interval = setInterval(fetchPreRegCount, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Mock data for visualizations
  const weeklyTrendData = [
    { name: "Mon", attendance: 75 },
    { name: "Tue", attendance: 82 },
    { name: "Wed", attendance: 90 },
    { name: "Thu", attendance: 85 },
    { name: "Fri", attendance: 88 },
    { name: "Sat", attendance: 65 },
    { name: "Sun", attendance: 40 },
  ];

  const departmentData = [
    { name: "CS", attendance: 85 },
    { name: "Math", attendance: 78 },
    { name: "Physics", attendance: 92 },
    { name: "Engineering", attendance: 81 },
  ];

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsError(false);
    try {
      const res = await fetch(`${API_BASE}/api/admin/dashboard-stats`);
      if (!res.ok) throw new Error("non-2xx");
      const data = await res.json();
      setStats({
        ...data,
        pendingRetrains: data.pending_retrains,
        lowAttendanceAlerts: data.low_attendance_alerts,
        activeModulesToday: data.active_modules_today,
      });
    } catch {
      setStatsError(true);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Fetch recent activity
  const fetchActivity = useCallback(async () => {
    setActivityError(false);
    try {
      const res = await fetch(`${API_BASE}/api/admin/recent-activity`);
      if (!res.ok) throw new Error("non-2xx");
      setActivity(await res.json());
    } catch {
      setActivityError(true);
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await fetchActivity();
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchStats();
    setLoadingActivity(true);
    fetchActivity();

    // Live Polling every 5 seconds
    const intervalId = setInterval(() => {
      fetchActivity();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [fetchStats, fetchActivity]);

  // Derived stat cards
  const statCards = [
    {
      title: "Total Students",
      value: stats ? stats.total_students.toLocaleString() : "—",
      icon: Users,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      cardBg: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      title: "Total Lecturers",
      value: stats ? stats.total_lecturers.toLocaleString() : "—",
      icon: GraduationCap,
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600",
      cardBg: "bg-purple-50",
      borderColor: "border-purple-200",
    },
    {
      title: "Today's Attendance",
      value: stats ? `${stats.todays_attendance_pct}%` : "—",
      icon: CheckCircle,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      cardBg: "bg-green-50",
      borderColor: "border-green-200",
    },
  ];

  // Activity icon helper
  const ActivityIcon = ({ type }: { type: string }) => {
    switch (type) {
      case "Deletions":
        return (
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
        );
      case "Updates":
        return (
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Edit className="w-5 h-5 text-blue-600" />
          </div>
        );
      case "Creations":
        return (
          <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-green-600" />
          </div>
        );
      case "Login Activity":
        return (
          <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <LogIn className="w-5 h-5 text-indigo-600" />
          </div>
        );
      case "Session Started":
        return (
          <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-emerald-600" />
          </div>
        );
      case "Session Ended":
        return (
          <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <LogOut className="w-5 h-5 text-orange-600" />
          </div>
        );
      case "Exports":
        return (
          <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Download className="w-5 h-5 text-purple-600" />
          </div>
        );
      case "Approvals":
        return (
          <div className="flex-shrink-0 w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-teal-600" />
          </div>
        );
      default:
        return (
          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-gray-600" />
          </div>
        );
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-600 mt-1">
          Welcome back! Here's what's happening today.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className={`${stat.cardBg} border ${stat.borderColor} rounded-xl shadow-md p-6 transition-shadow`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bgColor} p-4 rounded-lg`}>
                  <Icon className={`w-8 h-8 ${stat.iconColor}`} />
                </div>
              </div>
              <h3 className="text-gray-700 text-sm font-bold mb-2">
                {stat.title}
              </h3>
              {loadingStats ? (
                <Skeleton className="h-10 w-24 mt-1" />
              ) : statsError ? (
                <p className="text-2xl font-bold text-red-400">Error</p>
              ) : (
                <p className={`text-3xl font-bold`}>{stat.value}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* System Alerts & Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 mb-6">
        {/* Card 1: Pending Face Re-trains */}
        <div
          className="bg-red-50 p-6 rounded-xl border border-red-200 cursor-pointer shadow-sm flex flex-col hover:shadow-md transition-shadow shadow-md"
          onClick={() => onTabChange && onTabChange("manage-students")}
        >
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mb-4">
            <Camera size={30} className="animate-pulse" />
          </div>
          <p className="text-sm font-bold text-red-900">
            Face Re-train Requests
          </p>
          <h3 className="text-3xl font-bold text-red-900 mt-1">
            {stats ? stats.pendingRetrains : "—"} Pending
          </h3>
        </div>

        {/* Card 2: Low Attendance Alerts */}
        <div className="bg-amber-50 p-6 rounded-xl border border-yellow-200 shadow-sm flex flex-col transition-shadow shadow-md">
          <div className="w-16 h-16 bg-yellow-100 text-amber-600 rounded-xl flex items-center justify-center mb-4">
            <AlertTriangle size={30} />
          </div>
          <p className="text-sm font-bold text-amber-900">
            Low Attendance Alerts
          </p>
          <h3 className="text-3xl font-bold text-amber-900 mt-1">
            {stats ? stats.lowAttendanceAlerts : "—"} Students
          </h3>
        </div>

        {/* Card 3: Pending Pre-Registrations */}
        <div
          className="bg-orange-50 p-6 rounded-xl border border-orange-100 shadow-sm flex flex-col hover:shadow-md transition-shadow shadow-md cursor-pointer"
          onClick={() => onTabChange && onTabChange("pre-registrations")}
        >
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-4">
            <ClipboardList size={34} />
          </div>
          <p className="text-sm font-bold text-orange-900">
            Pending Pre-Registrations
          </p>
          <h3 className="text-3xl font-bold text-orange-900 mt-1">
            {preRegCount !== null ? preRegCount : "—"} Pending
          </h3>
        </div>
      </div>

      {/* Pending Requests Alert Card */}
      <div className="mt-6">
        {loadingStats ? (
          <Skeleton className="h-16 w-full rounded-xl" />
        ) : statsError ? null : (
          <div
            className={`flex items-center justify-between px-5 py-4 rounded-xl border-2 shadow-sm transition-all ${
              stats && stats.pending_manual_requests > 0
                ? "bg-red-100 border-red-200"
                : "bg-green-50 border-green-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  stats && stats.pending_manual_requests > 0
                    ? "bg-red-100"
                    : "bg-green-200"
                }`}
              >
                <AlertCircle
                  className={`w-7 h-7 ${
                    stats && stats.pending_manual_requests > 0
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                />
              </div>
              <div>
                <p
                  className={`text-sm font-bold ${
                    stats && stats.pending_manual_requests > 0
                      ? "text-amber-900"
                      : "text-emerald-900"
                  }`}
                >
                  Pending Manual Attendance Requests
                </p>
                <p
                  className={`text-sm mt-0.5 font-bold ${
                    stats && stats.pending_manual_requests > 0
                      ? "text-red-700"
                      : "text-green-700"
                  }`}
                >
                  {stats && stats.pending_manual_requests > 0
                    ? "Students have submitted correction requests that need review."
                    : "No pending requests - all corrections are up to date."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-3xl font-bold ${
                  stats && stats.pending_manual_requests > 0
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {stats?.pending_manual_requests ?? 0}
              </span>
              {stats && stats.pending_manual_requests > 0 && (
                <button
                  onClick={() =>
                    onTabChange && onTabChange("attendance-requests")
                  }
                  className="text-sm bg-red-600 cursor-pointer text-white px-3 py-1.5 rounded-xl hover:bg-red-700 transition-colors font-medium whitespace-nowrap"
                >
                  Review Now
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 mb-6">
        {/* Chart 1: Weekly Trend */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md flex flex-col">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Weekly Attendance Trend
          </h2>
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={stats?.weeklyTrend || []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="attendance"
                  stroke="#2563eb"
                  strokeWidth={3}
                  fill="#3b82f6"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Department Stats */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md flex flex-col">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Attendance by Department
          </h2>
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats?.departmentStats || []}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  padding={{ left: 30, right: 30 }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip cursor={{ fill: "#f3f4f6" }} />
                <Bar
                  dataKey="attendance"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/*Bottom Grid: Recent Activity + Quick Actions */}
      <div className="grid grid-cols-2 gap-6 mt-6 mb-8">
        {/* Recent Activity Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
            <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing || loadingActivity}
                className="p-1.5 hover:bg-gray-100 cursor-pointer rounded-full transition-colors text-gray-400 hover:text-blue-600 disabled:opacity-50"
                title="Refresh Activity"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </button>
              <span className="px-3 py-1 bg-blue-100 animate-pulse text-blue-700 text-sm font-semibold rounded-full shadow-sm">
                Live
              </span>
            </div>
          </div>

          <div className="px-6 py-4 space-y-4 min-h-[200px] max-h-[320px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300">
            {loadingActivity ? (
              /* Skeleton rows */
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start space-x-4">
                  <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            ) : activityError ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
                <p className="text-sm text-gray-500">
                  Could not load activity.
                </p>
                <button
                  onClick={fetchActivity}
                  className="mt-2 text-xs text-blue-600 underline"
                >
                  Retry
                </button>
              </div>
            ) : activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ClipboardCheck className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-400">
                  No recent activity logged yet.
                </p>
              </div>
            ) : (
              activity.map((item) => (
                <div key={item.id} className="flex items-start space-x-4">
                  <ActivityIcon type={item.action_type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {item.action_type}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 pr-1">
                      {item.description}
                    </p>
                    <div className="flex items-center mt-1.5 text-xs text-gray-400">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{relativeTime(item.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-6 pb-6">
            <button
              onClick={() => onTabChange && onTabChange("audit-logs")}
              className="w-full flex items-center cursor-pointer justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <span>View All Activity</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Actions (unchanged) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => onTabChange && onTabChange("students")}
              className="w-full text-left px-4 py-3  cursor-pointer bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <p className="font-medium text-blue-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Register New Student
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Add a new student to the system
              </p>
            </button>
            <button
              onClick={() => onTabChange && onTabChange("reports")}
              className="w-full text-left px-4 py-3  cursor-pointer bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <p className="font-medium text-green-900 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" /> Generate Report
              </p>
              <p className="text-xs text-green-600 mt-1">
                Create attendance reports
              </p>
            </button>
            <button
              onClick={() => onTabChange && onTabChange("manage-lecturers")}
              className="w-full text-left px-4 py-3  cursor-pointer bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <p className="font-medium text-purple-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4" /> Manage Lecturers
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Add or update lecturer information
              </p>
            </button>

            {/* Action 4: Manage Students */}
            <button
              onClick={() => onTabChange && onTabChange("manage-students")}
              className="w-full text-left px-4 py-3 cursor-pointer bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border-gray-100"
            >
              <p className="font-medium text-gray-900 flex items-center gap-2">
                <Users size={18} className="font-bold" />
                Manage Students
              </p>

              <p className="text-xs text-gray-600 mt-1">
                View, edit, or remove student records
              </p>
            </button>

            {/* Action 5: Start/Stop Camera System */}
            <button
              onClick={() => {
                const newState = !isCameraActive;
                setIsCameraActive(newState);
                if (newState) {
                  toast.success(
                    "Camera System Started: Face recognition is now active.",
                  );
                } else {
                  toast.success("Camera System Stopped.");
                }
              }}
              className={`w-full text-left px-4 py-3 cursor-pointer rounded-lg transition-colors duration-300 ${
                isCameraActive
                  ? "bg-red-50 hover:bg-red-100 border-red-200"
                  : "bg-gray-50 hover:bg-gray-100 border-gray-100"
              }`}
            >
              <div
                className={`flex items-center gap-2 font-medium ${isCameraActive ? "text-red-700" : "text-gray-900"}`}
              >
                <Power
                  size={18}
                  className={
                    isCameraActive ? "text-red-600 animate-pulse" : "text-black"
                  }
                />
                {isCameraActive ? "Stop Camera System" : "Start Camera System"}
              </div>
              <p
                className={`text-xs mt-1 ${isCameraActive ? "text-red-600" : "text-emerald-600"}`}
              >
                {isCameraActive
                  ? "Face recognition is currently running. Click to halt."
                  : "Launch the face recognition module for attendance"}
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
