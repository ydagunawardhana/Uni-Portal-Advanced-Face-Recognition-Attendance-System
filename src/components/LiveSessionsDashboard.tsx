import { useState, useEffect } from "react";
import {
  Users,
  Video,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  ExternalLink,
  Search,
  Building2,
  GraduationCap,
  BookOpen,
  MapPin,
  User,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8000";

const FACULTY_DEPARTMENTS: Record<string, string[]> = {
  "Faculty of Computing": [
    "Department of Software Engineering & Computer Security",
    "Department of Computer and Data Science",
  ],
  "Faculty of Business": [
    "Department of Accounting & Finance",
    "Department of Management",
    "Department of Marketing and Tourism",
    "Department of Operations and Logistics",
    "Department of Legal Studies",
  ],
  "Faculty of Engineering": [
    "Department of Mechatronic and Industrial Engineering",
    "Department of Design Studies",
    "Department of Electrical, Electronic & Systems Engineering",
  ],
  "Faculty of Health and Life Science": [
    "Department of Health Sciences",
    "Department of Life Sciences",
  ],
};

interface Session {
  id: number;
  date?: string;
  module_code: string;
  module_name: string;
  start_time: string;
  end_time: string;
  location: string;
  batch: string;
  lecturer_name: string;
  is_visiting: boolean;
  is_live?: boolean;
  is_completed?: boolean;
  faculty?: string;
  department?: string;
  semester?: string;
  status?: string;
  cover_requested?: boolean;
  cover_reason?: string;
  enrolled_count?: number;
}

interface DashboardData {
  stats: {
    total_sessions: number;
    live_now: number;
    visiting_lecturers: number;
  };
  sessions: Session[];
}

export default function LiveSessionsDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [lecturerTypeFilter, setLecturerTypeFilter] = useState("");
  const [showCoverRequestsOnly, setShowCoverRequestsOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [viewMode, setViewMode] = useState<"daily" | "upcoming_covers">(
    "daily",
  );
  const [upcomingCovers, setUpcomingCovers] = useState<Session[]>([]);

  const handleFacultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFacultyFilter(e.target.value);
    setDepartmentFilter("");
  };

  // Determine which departments to show
  const availableDepartments = facultyFilter
    ? FACULTY_DEPARTMENTS[facultyFilter as keyof typeof FACULTY_DEPARTMENTS] ||
      []
    : Object.values(FACULTY_DEPARTMENTS).flat();

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(
        `${API_BASE}/api/admin/timetable/today?date=${selectedDate}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingCovers = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API_BASE}/api/admin/cover_requests/upcoming`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setUpcomingCovers(json);
      }
    } catch (err) {
      console.error("Upcoming covers fetch error:", err);
    }
  };

  const [hostedSessionId, setHostedSessionId] = useState<
    number | string | null
  >(null);

  useEffect(() => {
    try {
      // Evaluate if the Admin structurally owns an active broadcast
      const savedHostId = localStorage.getItem("admin_activeSession");
      if (savedHostId) {
        setHostedSessionId(String(savedHostId));
      }
    } catch (e) {}

    // Initial background fetch for upcoming covers count
    fetchUpcomingCovers();
  }, []);

  useEffect(() => {
    setLoading(true);
    if (viewMode === "upcoming_covers") {
      fetchUpcomingCovers().finally(() => setLoading(false));
    } else {
      fetchData().finally(() => setLoading(false));
    }
  }, [selectedDate, viewMode]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (viewMode === "upcoming_covers") {
        fetchUpcomingCovers();
      } else {
        fetchData();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedDate, viewMode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Total Upcoming Requests (all future requests fetched via fetchUpcomingCovers)
  const totalUpcomingRequestsCount = upcomingCovers.length;

  // 1. Select the correct data source based on the view mode
  const baseSessions =
    viewMode === "upcoming_covers" ? upcomingCovers : data?.sessions || [];

  // 2. Apply filters
  const filteredSessions = baseSessions.filter((s) => {
    // Search logic
    const searchStr = searchQuery ? searchQuery.toLowerCase() : "";
    const matchesSearch =
      searchStr === "" ||
      s.module_name?.toLowerCase().includes(searchStr) ||
      s.module_code?.toLowerCase().includes(searchStr) ||
      s.lecturer_name?.toLowerCase().includes(searchStr);

    // Faculty and Department logic
    const matchesFaculty = facultyFilter ? s.faculty === facultyFilter : true;
    const matchesDept = departmentFilter
      ? s.department === departmentFilter
      : true;

    // Lecturer Type
    let matchesType = true;
    if (lecturerTypeFilter === "visiting") {
      matchesType = s.is_visiting === true;
    } else if (lecturerTypeFilter === "internal") {
      matchesType = s.is_visiting === false || !s.is_visiting;
    }

    // View Mode Specific Logic
    if (viewMode === "daily") {
      // If we are in daily mode AND the user clicked "Today's Cover Requests", hide non-requested sessions
      if (showCoverRequestsOnly && !s.cover_requested) {
        return false;
      }
    }
    // If viewMode === "upcoming_covers", we WANT to show all items in the `upcomingCovers` list,
    // so we don't apply any date or cover_requested constraints here.

    return matchesSearch && matchesFaculty && matchesDept && matchesType;
  });

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out pb-12">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-6">
        <div className="bg-blue-50 p-6 rounded-2xl shadow-sm border-2 border-blue-200 flex items-center gap-5 translate-y-0 hover:-translate-y-1 transition-all">
          <div className="p-4 bg-blue-100 rounded-xl text-blue-600">
            <Calendar className="w-8 h-8" />
          </div>
          <div>
            <p className="text-md font-bold text-gray-600  tracking-wider">
              Total Sessions Today
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {data?.stats.total_sessions || 0}
            </p>
          </div>
        </div>

        <div className="bg-green-50 p-6 rounded-2xl shadow-sm border-2 border-green-200 flex items-center gap-5 translate-y-0 hover:-translate-y-1 transition-all">
          <div className="p-4 bg-green-100 rounded-xl text-green-600">
            <Video className="w-10 h-10 animate-pulse" />
          </div>
          <div>
            <p className="text-md font-bold text-gray-600 tracking-wider">
              Today Live Now
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {data?.stats.live_now || 0}
            </p>
          </div>
        </div>

        <div className="bg-purple-50 p-6 rounded-2xl shadow-sm border-2 border-purple-200 flex items-center gap-5 translate-y-0 hover:-translate-y-1 transition-all">
          <div className="p-4 bg-purple-100 rounded-xl text-purple-600">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-md font-bold text-gray-600 tracking-wider">
              Today Visiting Lecturers Session
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {data?.stats.visiting_lecturers || 0}
            </p>
          </div>
        </div>

        {/* NEW: Total Upcoming Requests Card */}
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 flex items-center gap-5 translate-y-0 hover:-translate-y-1 transition-all">
          <div className="p-4 bg-red-100 rounded-xl text-red-600">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-md font-bold text-gray-600 tracking-wider">
              Upcoming Covers Requests
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {totalUpcomingRequestsCount}
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <GraduationCap className="w-10 h-10 text-blue-600" />
            Daily Lectures Timetable
          </h2>

          {/* Quick Filters */}
          <div className="mt-2 flex gap-3">
            {viewMode === "daily" && (
              <button
                onClick={() => setShowCoverRequestsOnly(!showCoverRequestsOnly)}
                className={`px-4 py-2 rounded-lg font-bold cursor-pointer text-sm flex items-center gap-2 transition-colors border-2 ${
                  showCoverRequestsOnly
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                {showCoverRequestsOnly
                  ? "Showing Cover Requests"
                  : "Show Daily Cover Requests"}
              </button>
            )}

            <button
              onClick={() =>
                setViewMode(viewMode === "daily" ? "upcoming_covers" : "daily")
              }
              className={`px-4 py-2 rounded-lg font-bold cursor-pointer text-sm flex items-center gap-2 transition-colors border-2 ${
                viewMode === "upcoming_covers"
                  ? "bg-purple-100 text-purple-700 border-purple-200 shadow-inner"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
              }`}
            >
              <Calendar className="w-4 h-4" />
              {viewMode === "upcoming_covers"
                ? "Back to Daily Timetable"
                : "View All Upcoming Requests"}
            </button>
          </div>
        </div>

        {/* Filters Section (Grid Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {/* NEW: Date Picker Filter */}
          <div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold text-gray-700 cursor-pointer h-full"
            />
          </div>
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search module, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
          </div>

          {/* Faculty Filter */}
          <div>
            <select
              value={facultyFilter}
              onChange={handleFacultyChange}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm text-gray-700 cursor-pointer font-semibold"
            >
              <option value="">All Faculties</option>
              {Object.keys(FACULTY_DEPARTMENTS).map((fac) => (
                <option key={fac} value={fac}>
                  {fac}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter (Cascading) */}
          <div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              disabled={!facultyFilter}
              className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-semibold text-gray-700 ${!facultyFilter ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <option value="">
                {facultyFilter ? "All Departments" : "Select Faculty First"}
              </option>
              {availableDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Lecturer Type Filter */}
          <div>
            <select
              value={lecturerTypeFilter}
              onChange={(e) => setLecturerTypeFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm text-gray-700 cursor-pointer font-semibold"
            >
              <option value="">All Lecturers</option>
              <option value="internal">Internal Lecturers</option>
              <option value="visiting">Visiting Lecturers</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sessions Grid */}
      {filteredSessions.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-300">
          <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <Calendar className="w-12 h-12" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No sessions found</h3>
          <p className="text-gray-500">
            Check back later or adjust your search term.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-6 mb-5">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className={`flex flex-col rounded-2xl shadow-md transition-all group ${
                String(session.id) === hostedSessionId
                  ? "bg-yellow-50/30 border-2 border-yellow-400"
                  : session.status === "Live"
                    ? "bg-white border-2 border-green-200 shadow-md"
                    : "bg-white border-2 border-gray-200 hover:shadow-lg"
              }`}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-bold uppercase tracking-widest ${
                        session.status === "Live"
                          ? "bg-green-100 text-green-600 animate-pulse border-2 border-green-200"
                          : session.status === "Completed"
                            ? "bg-green-100 text-green-600"
                            : session.status === "Missed"
                              ? "bg-red-100 text-red-600 font-bold border border-red-200 shadow-sm"
                              : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {session.status === "Live"
                        ? "● LIVE NOW"
                        : session.status}
                    </span>

                    {/* Cover Request Badge */}
                    {session.cover_requested && (
                      <span
                        className={`px-3 py-1 text-sm font-bold rounded-full flex items-center gap-1 uppercase ${
                          session.status?.toLowerCase() === "completed" ||
                          session.is_completed
                            ? "bg-gray-100 text-gray-500 border border-gray-200"
                            : "bg-red-100 text-red-700 animate-pulse"
                        }`}
                      >
                        {session.status?.toLowerCase() === "completed" ||
                        session.is_completed ? (
                          <>Covered</>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4" /> Cover Requested
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  {session.is_visiting && (
                    <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-sm font-bold rounded-full">
                      Visiting
                    </span>
                  )}
                </div>

                {/* Display Cover Reason — hidden once session is completed */}
                {session.cover_requested &&
                  session.cover_reason &&
                  !(
                    session.status?.toLowerCase() === "completed" ||
                    session.is_completed
                  ) && (
                    <div className="mb-3 bg-red-50 border-2 border-red-100 rounded-lg p-2 text-xs text-red-600 font-medium flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>Reason: {session.cover_reason}</span>
                    </div>
                  )}

                <div className="mb-4">
                  <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {session.module_name}
                  </h3>
                  <p className="text-sm font-medium text-gray-500 mb-3 flex items-center flex-wrap gap-1.5 mt-1">
                    <span>{session.module_code}</span>
                    <span className="text-gray-400">•</span>
                    <span>Batch {session.batch}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-blue-600 font-bold bg-blue-100 px-2 py-0.5 rounded-xl text-sm">
                      {session.enrolled_count !== undefined
                        ? session.enrolled_count
                        : 0}{" "}
                      Enrolled Students
                    </span>
                  </p>
                  {/* Date Display (Forced Render with Fallback) */}
                  <div className="flex items-center mt-2 px-2.5 py-1.5 gap-2 text-sm text-blue-700 font-bold bg-blue-50 mr-2 border rounded-lg">
                    <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                    {new Date(session.date || new Date()).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      },
                    )}
                  </div>
                </div>

                {/* 2-Column Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 mb-5">
                  {/* Left Column: Basic Session Details */}
                  <div className="space-y-2">
                    <p className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="w-4 h-4 text-gray-500 shrink-0" />
                      <span className="truncate font-bold">
                        {session.lecturer_name}
                      </span>
                    </p>

                    <p className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                      <span className="font-bold">
                        {session.start_time} - {session.end_time}
                      </span>
                    </p>
                    <p className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-500 shrink-0" />
                      <span className="truncate">{session.location}</span>
                    </p>
                  </div>

                  {/* Right Column: Academic Metadata */}
                  <div className="space-y-2 md:pt-0 border-t md:border-t-0 md:border-l border-gray-100 md:pl-4">
                    <div className="flex items-start gap-2 text-sm text-gray-500">
                      <Building2 className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-700">
                          {session.faculty || "Faculty TBA"}
                        </span>
                        <span className="text-xs leading-tight mt-0.5">
                          {session.department || "Department TBA"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <BookOpen className="w-4 h-4 text-gray-500 shrink-0" />
                      <span className="truncate">
                        <span className="font-bold text-gray-700">
                          {session.semester || "Semester TBA"}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {(() => {
                  const sessionId = String(
                    (session as any).batch_id || session.id,
                  );
                  const activeAdminSession = localStorage.getItem(
                    "admin_activeSession",
                  );
                  const isMyHostedSession = activeAdminSession === sessionId;

                  if (
                    session.status?.toLowerCase() === "completed" ||
                    session.is_completed
                  ) {
                    return (
                      <button
                        disabled
                        className="w-full bg-green-50 text-sm text-green-600 border-2 border-green-200 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-3 cursor-not-allowed"
                      >
                        <CheckCircle className="w-5 h-5 text-green-500 font-bold" />
                        {session.cover_requested
                          ? "Covered & Completed"
                          : "Session Completed"}
                      </button>
                    );
                  } else if (session.status?.toLowerCase() === "missed") {
                    return (
                      <button
                        disabled
                        className="w-full bg-red-50 text-sm text-red-500 border-2 border-red-200 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-3 cursor-not-allowed"
                      >
                        <AlertCircle className="w-5 h-5 text-red-500" /> Session
                        Missed
                      </button>
                    );
                  } else if (isMyHostedSession) {
                    return (
                      <button
                        onClick={() =>
                          navigate(
                            `/admin/live-camera?sessionId=${session.id}`,
                            {
                              state: {
                                sessionData: session,
                                isLive: true,
                                viewOnly: false,
                              },
                            },
                          )
                        }
                        className="w-full bg-yellow-100 hover:bg-yellow-50 cursor-pointer text-yellow-600 border-2 border-yellow-700 font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-sm"
                      >
                        <Video className="w-6 h-6 animate-pulse" />
                        Resume Session
                      </button>
                    );
                  } else if (
                    session.status?.toLowerCase() === "live" ||
                    session.is_live
                  ) {
                    return (
                      <button
                        onClick={() =>
                          navigate(
                            `/admin/live-camera?sessionId=${session.id}`,
                            {
                              state: {
                                sessionData: {
                                  ...session,
                                  lecturer_id:
                                    (session as any).lecturer_id ||
                                    (session as any).lecturerId ||
                                    (session as any).lecturer?.id,
                                },
                                isLive: true,
                                viewOnly: true,
                              },
                            },
                          )
                        }
                        className="w-full bg-green-100 text-sm hover:bg-green-200 cursor-pointer text-green-600 border-2 border-green-200 font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-sm"
                      >
                        <Video className="w-6 h-6" />
                        Join Monitoring
                      </button>
                    );
                  } else if (session.cover_requested || session.is_visiting) {
                    return (
                      <button
                        onClick={() =>
                          navigate(
                            `/admin/live-camera?sessionId=${session.id}`,
                            {
                              state: {
                                sessionData: {
                                  ...session,
                                  lecturer_id:
                                    (session as any).lecturer_id ||
                                    (session as any).lecturerId ||
                                    (session as any).lecturer?.id,
                                },
                                isLive: false,
                                viewOnly: false,
                              },
                            },
                          )
                        }
                        className="w-full bg-blue-100 hover:bg-blue-200 cursor-pointer text-blue-700 border-2 border-blue-200 font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-sm"
                      >
                        <Video className="w-5 h-5" />
                        {session.cover_requested
                          ? "Cover Session"
                          : "Start Session"}
                      </button>
                    );
                  } else {
                    return (
                      <button
                        disabled
                        className="w-full bg-gray-100 text-sm text-gray-500 border-2 border-gray-200 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-3 cursor-not-allowed"
                      >
                        <Clock className="w-5 h-5 text-gray-500 animate-pulse " />
                        Waiting for Lecturer...
                      </button>
                    );
                  }
                })()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
