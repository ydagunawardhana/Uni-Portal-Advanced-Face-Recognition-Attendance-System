import { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";
import {
  User,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Clock,
  MapPin,
  FileEdit,
  Bell,
  Calendar,
  BookOpen,
  Edit,
  CheckCircle,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import toast from "react-hot-toast";

const API_BASE = API_BASE_URL;

interface DashboardData {
  profile: {
    name: string;
    student_id: string;
    batch: string;
    profile_picture: string | null;
    biometric_registered?: boolean;
  };
  stats: {
    overall_percentage: number;
    present: number;
    absent: number;
  };
  recent_classes: {
    module_name: string;
    date: string;
    time: string;
    status: string;
  }[];
  recent_requests?: {
    module_name: string;
    status: string;
    submitted_at: string;
  }[];
  module_stats?: {
    [key: string]: {
      name: string;
      present: number;
      absent: number;
      total: number;
      percentage: number;
    };
  };
  todays_schedule?: {
    module_name: string;
    start_time: string;
    end_time: string;
    location: string;
    session_type: string;
    lecturer?: string;
  }[];
}

interface DashboardOverviewProps {
  data?: DashboardData | null;
  isLoading?: boolean;
}

export default function DashboardOverview({
  data: propData,
  isLoading: propLoading,
}: DashboardOverviewProps) {
  const [data, setData] = useState<DashboardData | null>(propData || null);
  const [isLoading, setIsLoading] = useState(
    propLoading !== undefined ? propLoading : true
  );
  const [error, setError] = useState<string | null>(null);
  const [animatedChartData, setAnimatedChartData] = useState<any[]>([]);
  const [imageError, setImageError] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string>("All");

  useEffect(() => {
    if (!data) return;

    let pr = 0;
    let ab = 0;

    if (selectedModule === "All") {
      pr = data.stats.present || 0;
      ab = data.stats.absent || 0;
    } else if (data.module_stats && data.module_stats[selectedModule]) {
      pr = data.module_stats[selectedModule].present;
      ab = data.module_stats[selectedModule].absent;
    }

    const total = pr + ab;
    if (total === 0) {
      setAnimatedChartData([{ name: "No Data", value: 1, color: "#42424254" }]);
    } else {
      setAnimatedChartData([
        { name: "Present", value: pr, color: "#10B981" },
        { name: "Absent", value: ab, color: "#EF4444" },
      ]);
    }
  }, [data, selectedModule]);

  useEffect(() => {
    if (propData) {
      setData(propData);
      setIsLoading(propLoading !== undefined ? propLoading : false);
      return;
    }

    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("studentToken");
        if (!token) throw new Error("No session found. Please log in.");

        const res = await fetch(
          `${API_BASE}/api/attendance/student/dashboard-summary`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) throw new Error("Failed to load dashboard data");

        const json = await res.json();
        setData(json);
        console.log("Fetched Dashboard Data:", json);
      } catch (err: any) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [propData, propLoading]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-gray-500 dark:text-gray-400">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
        <p className="font-bold text-lg">Syncing your attendance data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-100 p-10 rounded-2xl text-center max-w-2xl mx-auto mt-10">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">
          Dashboard Unavailable
        </h3>
        <p className="text-red-700 dark:text-red-400 font-medium">
          {error || "Connection to server failed."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-md"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ULTRA-SAFE EXTRACTION: Provide empty objects/arrays as fallbacks
  const profile = data?.profile || ({} as any);
  const stats = data?.stats || ({} as any);
  const recent_classes = data?.recent_classes || [];
  const recent_requests = data?.recent_requests || [];
  const moduleStats = data?.module_stats || {};
  const todays_schedule = data?.todays_schedule || [];

  // Calculate Low Attendance Alerts (< 80%)
  const lowAttendanceModules = Object.entries(moduleStats).filter(
    ([code, stats]: any) => stats.percentage < 80 && stats.total > 0
  );

  // Prepare chart variables safely
  let currentPercentage = 0;
  let currentPresent = 0;
  let currentAbsent = 0;
  let chartCenterText = "Overall";

  if (selectedModule === "All") {
    currentPercentage = stats.overall_percentage || 0;
    currentPresent = stats.present || 0;
    currentAbsent = stats.absent || 0;
  } else if (moduleStats[selectedModule]) {
    currentPercentage = moduleStats[selectedModule].percentage || 0;
    currentPresent = moduleStats[selectedModule].present || 0;
    currentAbsent = moduleStats[selectedModule].absent || 0;
    chartCenterText = selectedModule;
  }
  const COLORS = ["#10b981a9", "#ef4444"];

  return (
    <div className="p-2 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 self-start">
            My Profile
          </h2>
          <div className="w-40 h-40 rounded-full bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-700 flex items-center justify-center mb-4 overflow-hidden">
            {profile.profile_picture && !imageError ? (
              <img
                src={
                  profile.profile_picture.startsWith("https")
                    ? profile.profile_picture
                    : `${API_BASE_URL}${profile.profile_picture}`
                }
                alt="Profile"
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <User className="w-40 h-40 text-gray-300" />
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {profile.name || "Student Name"}
          </h2>
          <p className="text-md font-bold text-red-500 mb-6">
            {profile.student_id || "ID"}
          </p>

          <div className="w-full mt-1 space-y-3">
            <div className="flex justify-between items-center text-md">
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                Batch :
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                {profile.batch || "Unknown"}
              </span>
            </div>

            <div className="flex justify-between items-center text-md">
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                Overall Status :
              </span>
              <span
                className={`font-bold ${
                  (stats.overall_percentage || 0) >= 70
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {stats.overall_percentage || 0}%
              </span>
            </div>

            {/* NEW: Face Recognition Status */}
            <div className="flex justify-between items-center text-md">
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                Face ID Model :
              </span>
              {profile.biometric_registered ? (
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-bold rounded-xl border-2 border-green-200">
                  <span className="relative flex h-2 w-2 animate-pulse">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-bold rounded-md border border-red-100">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  Pending Setup
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Attendance Summary Donut Update */}
        <div className="col-span-1 md:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Attendance Summary
            </h2>
            <select
              className="bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-xl focus:ring-red-500 focus:border-red-500 block py-1.5 -px-2 font-bold cursor-pointer transition-all hover:border-red-500"
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
            >
              <option value="All">All Subjects</option>
              {Object.entries(moduleStats).map(([code, info]: any) => (
                <option key={code} value={code}>
                  {code} - {info.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-48 h-48 relative flex items-center justify-center">
            <PieChart width={192} height={192}>
              <Pie
                data={animatedChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
                isAnimationActive={true}
              >
                {animatedChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-sm text-gray-600 dark:text-gray-400 font-bold uppercase tracking-widest">
                {chartCenterText}
              </span>
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {currentPercentage}%
              </span>
            </div>
          </div>

          {/* Legend Below Chart */}
          <div className="flex gap-6 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-md font-bold text-gray-700 dark:text-gray-300">
                Present ({currentPresent})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-md font-bold text-gray-700 dark:text-gray-300">
                Absent ({currentAbsent})
              </span>
            </div>
          </div>

          {/* NEW: Academic Period Info (Year & Semester) */}
          <div className="mt-8 w-full grid grid-cols-2 gap-4 pt-4">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-3 flex flex-col items-center justify-center border border-gray-200 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:bg-gray-700">
              <span className="text-sm font-bold text-gray-600 dark:text-gray-400 tracking-widest mb-1">
                Academic Year
              </span>
              <span className="text-md font-bold text-gray-800 dark:text-gray-200">
                {/* Fallback to static if not provided by backend yet */}
                {(profile as any).year || "Year 1"}
              </span>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-3 flex flex-col items-center justify-center border border-gray-200 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:bg-gray-700">
              <span className="text-sm font-bold text-gray-600 dark:text-gray-400 tracking-widest mb-1">
                Current Semester
              </span>
              <span className="text-md font-bold text-gray-800 dark:text-gray-200">
                {(profile as any).semester || "Semester 1"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Schedule, Alerts, Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 items-stretch">
        {/* 1. Today's Schedule */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-6 flex flex-col relative">
          <div className="flex items-center justify-between mb-4 pb-2 shrink-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 text-red-600" /> Today's Schedule
            </h2>
            <span className="text-sm font-bold border-2 border-red-200 text-red-600 bg-red-50 dark:bg-red-900/20 px-2.5 py-0.5 rounded-full">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>

          {/* MAGIC TRICK: Absolute wrapper prevents content from expanding the card */}
          <div className="flex-1 relative min-h-[200px]">
            <div className="absolute inset-0 overflow-y-auto pr-2 custom-scrollbar space-y-4">
              {todays_schedule.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400 text-sm border-2 border-dashed border-red-200 rounded-xl font-medium text-center p-4">
                    No classes today. Enjoy your day!
                  </p>
                </div>
              ) : (
                todays_schedule.map((cls: any, idx: number) => (
                  <div
                    key={idx}
                    className="relative pl-4 border-l-2 border-blue-100 last:border-transparent shrink-0"
                  >
                    <div className="absolute top-4 right-4 w-4 h-4 rounded-full bg-green-600 shadow-sm animate-pulse"></div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 border-2 border-gray-200 dark:border-gray-700">
                      <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1.5">
                        {cls.module_name}
                      </h3>
                      <div className="flex flex-col gap-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-red-500" />{" "}
                          {cls.start_time} - {cls.end_time}
                        </span>
                        <span className="flex items-center gap-1.5 text-sm">
                          <MapPin className="w-4 h-4 text-red-500" />{" "}
                          {cls.location}
                        </span>

                        {/* NEW LECTURER ROW */}
                        <span className="flex items-center gap-1.5 text-sm">
                          <User className="w-4 h-4 text-red-500" />{" "}
                          {cls.lecturer || "Lecturer TBA"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 2. Low Attendance Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 p-6 flex flex-col relative">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 pb-2 flex items-center gap-2 shrink-0">
            <AlertTriangle
              className={`w-6 h-6 ${
                lowAttendanceModules.length > 0
                  ? "text-red-500"
                  : "text-green-500"
              }`}
            />
            Attendance Alerts
          </h2>

          {/* MAGIC TRICK: Absolute wrapper */}
          <div className="flex-1 relative min-h-[200px]">
            <div className="absolute inset-0 overflow-y-auto pr-2 custom-scrollbar flex flex-col">
              {lowAttendanceModules.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-4">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">
                    Looking Good!
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-bold">
                    Your attendance is above 70% for all subjects.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {lowAttendanceModules.map(([code, stats]: any) => (
                    <li
                      key={code}
                      className="bg-red-50 dark:bg-red-900/20 border-2 border-red-100 rounded-xl p-3 flex flex-col gap-1 shrink-0"
                    >
                      <span className="text-sm font-bold text-red-800 dark:text-red-300 line-clamp-1">
                        {stats.name}
                      </span>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-red-600 font-bold">
                          {code}
                        </span>
                        <span className="text-sm font-bold text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full animate-pulse">
                          {stats.percentage}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* 3. Quick Actions */}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
          <h2 className="text-xl flex items-center gap-2 font-bold text-gray-900 dark:text-white mb-4 pb-2 shrink-0">
            <Edit className="h-6 w-6 text-red-600" />
            Quick Actions
          </h2>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => (window.location.hash = "request-correction")}
              className="w-full flex items-center gap-3 p-3 text-sm rounded-xl border-2 border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-200 transition-all group text-left cursor-pointer shrink-0"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-600 transition-colors shrink-0">
                <FileEdit className="w-5 h-5 text-blue-600 group-hover:text-white" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                  Request Correction
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Appeal an absence
                </p>
              </div>
            </button>

            <button
              onClick={() => (window.location.hash = "notifications")}
              className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-purple-200 bg-purple-50 hover:border-purple-200 hover:bg-purple-100 transition-all group text-left cursor-pointer shrink-0"
            >
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center group-hover:bg-purple-600 transition-colors shrink-0">
                <Bell className="w-5 h-5 text-purple-600 group-hover:text-white" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                  Notifications
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  View recent alerts
                </p>
              </div>
            </button>

            <button
              onClick={() => (window.location.hash = "timetable")}
              className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-green-200 bg-green-50 dark:bg-green-900/20 hover:border-green-200 hover:bg-green-100 dark:bg-green-900/30 transition-all group text-left cursor-pointer shrink-0"
            >
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:bg-green-600 transition-colors shrink-0">
                <Calendar className="w-5 h-5 text-green-600 group-hover:text-white" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                  Full Timetable
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Check weekly schedule
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Recent Class History
          </h2>
          <span className="text-md font-bold text-gray-500 dark:text-gray-400 tracking-widest">
            Last 5 Sessions
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-md tracking-widest text-gray-600 dark:text-gray-400 font-black bg-gray-100 dark:bg-gray-700">
                <th className="px-8 py-4">Module Name</th>
                <th className="px-8 py-4">Date & Time</th>
                <th className="px-8 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!recent_classes || recent_classes.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-8 py-6 text-center text-gray-500 dark:text-gray-400 text-md"
                  >
                    No recent attendance records found.
                  </td>
                </tr>
              ) : (
                recent_classes.map((record, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:bg-gray-700 transition-colors"
                  >
                    <td className="px-8 py-4 text-sm font-bold text-gray-700 dark:text-gray-300">
                      {record.module_name}
                    </td>
                    <td className="px-8 py-4 text-sm text-gray-500 dark:text-gray-400 font-bold">
                      {record.date} &nbsp; &nbsp; {record.time}
                    </td>
                    <td className="px-8 py-4">
                      <span
                        className={`px-3 py-1 rounded-xl text-sm font-bold ${
                          record.status === "Present" ||
                          record.status === "Excused"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Recent Correction Requests Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Recent Appeals
          </h2>
          <span className="text-md font-bold text-gray-500 dark:text-gray-400 tracking-widest">
            Latest 4 Requests
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-md tracking-widest text-gray-600 dark:text-gray-400 font-black bg-gray-100 dark:bg-gray-700">
                <th className="px-8 py-4">Module</th>
                <th className="px-8 py-4">Date Submitted</th>
                <th className="px-8 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!recent_requests || recent_requests.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-8 py-6 text-center text-gray-500 dark:text-gray-400 text-md"
                  >
                    No recent requests found.
                  </td>
                </tr>
              ) : (
                recent_requests.map((req, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-gray-50 dark:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-700"
                  >
                    <td className="px-8 py-4 text-sm font-bold text-gray-700 dark:text-gray-300">
                      {req.module_name}
                    </td>
                    <td className="px-8 py-4 text-sm text-gray-500 dark:text-gray-400 font-bold">
                      {req.submitted_at}
                    </td>
                    <td className="px-8 py-4">
                      <span
                        className={`px-3 py-1 rounded-xl text-sm font-bold ${
                          req.status === "Approved"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : req.status === "Rejected"
                            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
