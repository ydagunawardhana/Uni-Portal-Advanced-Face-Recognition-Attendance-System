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
  module_code: string;
  module_name: string;
  start_time: string;
  end_time: string;
  location: string;
  batch: string;
  lecturer_name: string;
  is_visiting: boolean;
  faculty?: string;
  department?: string;
  semester?: string;
  status: "Pending" | "Live" | "Completed";
  cover_requested?: boolean;
  cover_reason?: string;
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

  const handleFacultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFacultyFilter(e.target.value);
    setDepartmentFilter(""); // Reset department when faculty changes
  };

  // Determine which departments to show
  const availableDepartments = facultyFilter
    ? FACULTY_DEPARTMENTS[facultyFilter as keyof typeof FACULTY_DEPARTMENTS] ||
      []
    : Object.values(FACULTY_DEPARTMENTS).flat();

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API_BASE}/api/admin/timetable/today`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // 5-second polling for real-time sync
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredSessions =
    data?.sessions.filter((s) => {
      // 1. Search Query
      const matchesSearch =
        s.module_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.module_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.lecturer_name?.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Dropdown Filters
      const matchesFaculty = facultyFilter ? s.faculty === facultyFilter : true;
      const matchesDept = departmentFilter
        ? s.department === departmentFilter
        : true;

      // 3. Lecturer Type
      let matchesType = true;
      if (lecturerTypeFilter === "visiting") {
        matchesType = s.is_visiting === true;
      } else if (lecturerTypeFilter === "internal") {
        matchesType = s.is_visiting === false || !s.is_visiting;
      }

      // 4. Cover Requests Filter
      if (showCoverRequestsOnly && !s.cover_requested) return false;

      return matchesSearch && matchesFaculty && matchesDept && matchesType;
    }) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <GraduationCap className="w-10 h-10 text-blue-600" />
            Daily Lectures Timetable
          </h2>
        

        {/* Quick Filters */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => setShowCoverRequestsOnly(!showCoverRequestsOnly)}
            className={`px-4 py-2 rounded-lg font-bold cursor-pointer text-sm flex items-center gap-2 transition-colors border-2 ${
              showCoverRequestsOnly
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            {showCoverRequestsOnly ? "Showing Cover Requests" : "Show Cover Requests"}
          </button>
        </div>
        </div>

        {/* Filters Section (Grid Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4">
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
                            ? "bg-gray-100 text-gray-600"
                            : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {session.status === "Live" ? "● LIVE NOW" : session.status}
                    </span>

                    {/* NEW: Cover Request Badge */}
                    {session.cover_requested && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-bold rounded-full flex items-center gap-1 animate-pulse uppercase">
                        <AlertCircle className="w-4 h-4" /> Cover Requested
                      </span>
                    )}
                  </div>

                  {session.is_visiting && (
                    <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-sm font-bold rounded-full">
                      Visiting
                    </span>
                  )}
                </div>

                {/* NEW: Display Cover Reason */}
                {session.cover_requested && session.cover_reason && (
                  <div className="mb-3 bg-red-50 border-2 border-red-100 rounded-lg p-2 text-xs text-red-600 font-medium flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Reason: {session.cover_reason}</span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {session.module_name}
                  </h3>
                  <p className="text-sm font-semibold text-gray-700 tracking-tight">
                    {session.module_code} - Batch {session.batch}
                  </p>
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
                      <GraduationCap className="w-4 h-4 text-gray-500 shrink-0" />
                      <span className="truncate font-semibold">
                        Batch:{" "}
                        <span className="font-bold text-gray-700">
                          {session.batch || "N/A"}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <BookOpen className="w-4 h-4 text-gray-500 shrink-0" />
                      <span className="truncate">
                        <span className="font-semibold text-gray-700">
                          {session.semester || "Semester TBA"}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {(() => {
                  const sessionId = String((session as any).batch_id || session.id); 
                  // Dynamically check memory on every render to avoid stale state issues
                  const activeAdminSession = localStorage.getItem("admin_activeSession");
                  const isMyHostedSession = activeAdminSession === sessionId;

                  if (isMyHostedSession) {
                    return (
                      <button
                        onClick={() => navigate(`/admin/live-camera?sessionId=${session.id}`, {
                          // Explicitly pass viewOnly: false so they return as Host
                          state: { sessionData: session, isLive: true, viewOnly: false } 
                        })}
                        className="w-full bg-yellow-100 hover:bg-yellow-50 cursor-pointer text-yellow-600 border-2 border-yellow-700 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-sm"
                      >
                        <Video className="w-6 h-6" />
                        Resume Session
                      </button>
                    );
                  } else if (session.status === "Live" || (session as any).is_live) {
                    return (
                      <button
                        onClick={() => navigate(`/admin/live-camera?sessionId=${session.id}`, {
                          state: {
                            sessionData: {
                              ...session,
                              lecturer_id: (session as any).lecturer_id || (session as any).lecturerId || (session as any).lecturer?.id,
                            },
                            isLive: true,
                            viewOnly: true
                          }
                        })}
                        className="w-full bg-green-100 hover:bg-green-200 cursor-pointer text-green-600 border-2 border-green-200 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-sm"
                      >
                        <Video className="w-6 h-6" />
                        Join Monitoring
                      </button>
                    );
                  } else {
                    return (
                      <button
                        onClick={() => navigate(`/admin/live-camera?sessionId=${session.id}`, {
                          state: {
                            sessionData: {
                              ...session,
                              lecturer_id: (session as any).lecturer_id || (session as any).lecturerId || (session as any).lecturer?.id,
                            },
                            isLive: false,
                            viewOnly: false
                          }
                        })}
                        className="w-full bg-blue-100 hover:bg-blue-200 cursor-pointer text-blue-600 border-2 border-blue-200 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-sm"
                      >
                        <Video className="w-6 h-6" />
                        Start Session
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
