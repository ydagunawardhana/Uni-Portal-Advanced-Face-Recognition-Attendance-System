import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Users,
  TrendingUp,
  PlayCircle,
  Calendar,
  Clock,
  CheckCircle,
  Loader2,
  CalendarClock,
  UserCircle,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  MapPin,
  CircleDot,
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const API_BASE = "http://localhost:8000";

interface DashboardData {
  lecturer_name: string;
  department: string;
  employee_id: string;
  stats: {
    total_classes: number;
    average_attendance: number;
    total_students: number;
  };
  recent_classes: {
    id: number;
    subject_id: string;
    batch_id: string;
    session_type: string;
    location: string;
    date: string | null;
    start_time: string | null;
    end_time: string | null;
    status: string;
    students_present: number;
    attendance_percentage: number;
  }[];
  upcoming_appointments: {
    id: number;
    student_name: string;
    student_index: string;
    date: string;
    time_slot: string;
    reason: string;
    status: string;
  }[];
  pending_actions: {
    count: number;
    items: {
      id: number;
      title: string;
      type: string;
      date: string;
      time_slot: string;
    }[];
  };
  at_risk_students: {
    id: number;
    name: string;
    index_number: string;
    attendance_percentage: number;
    sessions_attended: number;
    total_sessions: number;
  }[];
  todays_schedule: {
    id: number;
    time: string;
    end_time: string | null;
    subject: string;
    session_type: string;
    location: string;
    status: string;
  }[];
  weekly_goal?: {
    completed: number;
    total: number;
  };
}

export default function LecturerDashboardHome() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState({ completed: 0, total: 5 });

  useEffect(() => {
    // Simulate fetching weekly progress
    const fetchWeeklyProgress = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        setWeeklyGoal({ completed: 3, total: 5 }); 
      } catch (error) {
        console.error("Error fetching weekly goal:", error);
      }
    };
    fetchWeeklyProgress();
  }, []);

  const progressPercentage = weeklyGoal.total > 0 
    ? Math.round((weeklyGoal.completed / weeklyGoal.total) * 100) 
    : 0;

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("lecturerToken");
        if (!token) {
          setError("Not authenticated");
          setIsLoading(false);
          return;
        }

        // Step 1: Get lecturer profile to extract ID
        const profileRes = await fetch(`${API_BASE}/api/lecturer/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!profileRes.ok) throw new Error("Failed to fetch profile");
        const profile = await profileRes.json();

        // Step 2: Fetch dashboard summary using lecturer ID
        const dashRes = await fetch(
          `${API_BASE}/api/lecturer/dashboard_summary/${profile.id}`,
        );
        if (!dashRes.ok) throw new Error("Failed to fetch dashboard data");
        const data: DashboardData = await dashRes.json();

        setDashboardData(data);
      } catch (err: any) {
        console.error("Dashboard fetch error:", err);
        setError(err.message || "Failed to load dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-700 font-bold text-lg">
            Unable to Load Dashboard
          </p>
          <p className="text-gray-500 mt-1">{error || "Unknown error"}</p>
        </div>
      </div>
    );
  }

  const {
    stats,
    recent_classes,
    upcoming_appointments,
    pending_actions,
    at_risk_students,
    todays_schedule,
  } = dashboardData;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {/* Top Stats Row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Total Classes Conducted */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
            <span className="text-3xl font-bold text-gray-900">
              {stats.total_classes}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">
            Total Classes Conducted
          </h3>
          <p className="text-sm text-gray-500 mt-1">This semester</p>
        </div>

        {/* Average Attendance */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
            <span className="text-3xl font-bold text-gray-900">
              {stats.average_attendance}%
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">
            Average Attendance
          </h3>
          <p className="text-sm text-gray-500 mt-1">Across all classes</p>
        </div>

        {/* Total Students Assigned */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <span className="text-3xl font-bold text-gray-900">
              {stats.total_students}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">
            Total Students Assigned
          </h3>
          <p className="text-sm text-gray-500 mt-1">Active enrollment</p>
        </div>
      </div>

      {/* Smart Widget Row (3 columns) */}
      <style>{`
        .widget-scroll::-webkit-scrollbar { width: 4px; }
        .widget-scroll::-webkit-scrollbar-track { background: transparent; }
        .widget-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 9999px; }
        .widget-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Pending Actions (Amber/Warning Theme) */}
        <div className="bg-white rounded-xl shadow-md border-2 border-yellow-600 w-full">
          <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-yellow-500 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    Pending Actions
                  </h3>
                  <p className="text-xs text-gray-500">
                    Requires your attention
                  </p>
                </div>
              </div>
              {pending_actions.count > 0 && (
                <span className="bg-amber-500 text-white text-xs font-black px-2.5 py-1 rounded-full min-w-[28px] text-center shadow-sm">
                  {pending_actions.count}
                </span>
              )}
            </div>
          </div>
          {/* SCROLLABLE LIST — max-h-60 caps at ~2.5 items */}
          <div className="max-h-60 overflow-y-auto widget-scroll">
            {pending_actions.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <CheckCircle className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-gray-400 font-medium text-sm">
                  All caught up!
                </p>
                <p className="text-gray-400 text-xs mt-0.5">
                  No pending actions
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pending_actions.items.map((item) => (
                  <div
                    key={item.id}
                    className="px-5 py-3 hover:bg-amber-50/50 transition-colors"
                  >
                    <p className="text-sm font-semibold text-gray-800 mb-1 leading-snug">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        {item.type}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {item.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.time_slot}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. At-Risk Students (Red/Danger Theme) */}
        <div className="bg-white rounded-xl shadow-md border-2 border-red-200 w-full">
          <div className="px-5 py-4 bg-gradient-to-r from-red-50 to-pink-50 border-b border-red-100 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <ShieldAlert className="w-6 h-6 text-red-600 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  At-Risk Students
                </h3>
                <p className="text-xs text-gray-500">Attendance below 80%</p>
              </div>
            </div>
          </div>
          {/* SCROLLABLE LIST */}
          <div className="max-h-60 overflow-y-auto widget-scroll">
            {at_risk_students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <CheckCircle className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-gray-400 font-medium text-sm">
                  No at-risk students
                </p>
                <p className="text-gray-400 text-xs mt-0.5">
                  Everyone is above 80%
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {at_risk_students.map((stu) => (
                  <div
                    key={stu.id}
                    className="px-5 py-3 hover:bg-red-50/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {stu.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {stu.index_number}
                        </p>
                      </div>
                      <span
                        className={`text-lg font-black ${
                          stu.attendance_percentage < 50
                            ? "text-red-600"
                            : "text-orange-500"
                        }`}
                      >
                        {stu.attendance_percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          stu.attendance_percentage < 50
                            ? "bg-red-500"
                            : "bg-orange-400"
                        }`}
                        style={{ width: `${stu.attendance_percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {stu.sessions_attended} of {stu.total_sessions} sessions
                      attended
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. Today's Timetable (Blue/Schedule Theme) */}
        <div className="bg-white rounded-xl shadow-md border-2 border-blue-200 w-full">
          <div className="px-5 py-4 bg-blue-50 border-b border-blue-100 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarClock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  Today&apos;s Schedule
                </h3>
                <p className="text-xs text-gray-500">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
          {/* SCROLLABLE LIST */}
          <div className="max-h-60 overflow-y-auto widget-scroll">
            {todays_schedule.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Calendar className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-gray-400 font-medium text-sm">
                  No classes today
                </p>
                <p className="text-gray-400 text-xs mt-0.5">
                  Enjoy your free day!
                </p>
              </div>
            ) : (
              <div className="px-5 py-4 space-y-1">
                {todays_schedule.map((slot, idx) => (
                  <div key={slot.id} className="flex gap-4">
                    {/* Timeline dot + line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3 h-3 rounded-full border-2 mt-1 ${
                          slot.status === "Active"
                            ? "bg-green-500 border-green-300 animate-pulse"
                            : slot.status === "Closed"
                              ? "bg-gray-400 border-gray-300"
                              : "bg-blue-500 border-blue-300"
                        }`}
                      />
                      {idx < todays_schedule.length - 1 && (
                        <div className="w-0.5 flex-1 bg-gray-200 min-h-[32px]" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="pb-4 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-900">
                          {slot.subject}
                        </p>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            slot.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : slot.status === "Closed"
                                ? "bg-gray-100 text-gray-500"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {slot.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {slot.time}
                          {slot.end_time ? ` – ${slot.end_time}` : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {slot.location}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {slot.session_type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Action Section - Welcome Banner */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="inline-flex items-center space-x-2 bg-blue-500 bg-opacity-50 px-3 py-1 rounded-full mb-4">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Quick Actions</span>
            </div>
            <h2 className="text-3xl font-bold mb-2">
              Welcome, {dashboardData.lecturer_name}
            </h2>
            <p className="text-blue-100 mb-4 font-semibold">
              {dashboardData.department} - {dashboardData.employee_id}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center space-x-2">
                <Clock className="w-6 h-6 text-blue-200" />
                <span className="text-sm text-blue-100">
                  {stats.total_classes} sessions conducted
                </span>
              </div>
            </div>

            {/* Action Row */}
            <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-8">
              {/* Main Action Button */}
              <button
                onClick={() => navigate("/lecturer/mark-attendances")}
                className="flex items-center gap-2 bg-white text-blue-600 px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-[0_4px_14px_0_rgba(255,255,255,0.39)] hover:shadow-[0_6px_20px_rgba(255,255,255,0.23)] hover:-translate-y-0.5 z-10 shrink-0 cursor-pointer"
              >
                <PlayCircle className="w-6 h-6" />
                <span className="text-lg font-bold">Start Live Class</span>
              </button>

              {/* Separator (Visible only on larger screens) */}
              <div className="hidden sm:block h-12 w-px bg-blue-400/40 rounded-full shrink-0"></div>

              {/* Status & Progress Container (Now Horizontal) */}
              <div className="flex flex-row items-center gap-6 sm:gap-6 ml-2 sm:ml-4 shrink-0 overflow-x-auto">
                {/* Face Recognition Status */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="relative flex h-4 w-4 animate-pulse">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                  </span>
                  <span className="text-md font-medium text-white">
                    Face Recognition System : <span className="font-bold">Online</span>
                  </span>
                </div>

                {/* Subtle Vertical Divider */}
                <div className=" w-0.5 h-12 bg-white rounded-full"></div>

                {/* Progress Bar Component (Dynamic) */}
                <div className="flex flex-col justify-center gap-2 shrink-0 mt-2">
                  <span className="text-sm text-white font-medium">
                    Weekly Goal Progress:{" "}
                    <span className="text-white font-bold">{weeklyGoal.completed}/{weeklyGoal.total} Classes</span>
                  </span>
                  <div className="w-30 sm:w-40 h-2 bg-blue-500 rounded-full overflow-hidden block">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-2000 ease-out"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden lg:block ml-8">
            <div className="w-48 h-48 bg-white bg-opacity-20 rounded-full overflow-hidden flex items-center justify-center backdrop-blur-sm">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1646579886135-068c73800308?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwcHJvZmVzc29yJTIwdGVhY2hpbmclMjBzbWFydCUyMGNsYXNzcm9vbSUyMHByZXNlbnRhdGlvbnxlbnwxfHx8fDE3NzA0NjczNTJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Professor teaching in smart classroom"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Recent Classes + Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Class History — takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              Recent Class History
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Your latest conducted classes
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Subject
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Time
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Attendance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recent_classes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-400 font-medium">
                        No classes conducted yet
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        Start your first session to see history here
                      </p>
                    </td>
                  </tr>
                ) : (
                  recent_classes.map((classItem) => (
                    <tr
                      key={classItem.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="bg-blue-100 p-2 rounded-lg">
                            <Calendar className="w-5 h-5 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {classItem.date || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {classItem.subject_id}
                          </span>
                          <p className="text-xs text-gray-500">
                            {classItem.session_type} · {classItem.location}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{classItem.start_time || "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {classItem.attendance_percentage}%
                              </span>
                              <span className="text-xs text-gray-500">
                                {classItem.students_present} present
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${
                                  classItem.attendance_percentage >= 90
                                    ? "bg-green-500"
                                    : classItem.attendance_percentage >= 75
                                      ? "bg-blue-500"
                                      : "bg-orange-500"
                                }`}
                                style={{
                                  width: `${classItem.attendance_percentage}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                          {classItem.attendance_percentage >= 85 && (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {recent_classes.length} recent classes
            </p>
          </div>
        </div>

        {/* Upcoming Appointments — takes 1 column */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-yellow-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-xl">
                <CalendarClock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Upcoming Appointments
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Student consultation requests
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {upcoming_appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 px-6">
                <CalendarClock className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-400 font-medium text-center">
                  No upcoming appointments
                </p>
                <p className="text-gray-400 text-sm mt-1 text-center">
                  Student requests will appear here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {upcoming_appointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-2 bg-blue-100 rounded-full shrink-0">
                        <UserCircle className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {appt.student_name}
                          </p>
                          <span
                            className={`text-sm font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              appt.status === "Approved"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {appt.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-1.5">
                          {appt.student_index}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {appt.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {appt.time_slot}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5 italic line-clamp-2">
                          {appt.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {upcoming_appointments.length > 0 && (
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                {upcoming_appointments.length} pending consultation
                {upcoming_appointments.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
