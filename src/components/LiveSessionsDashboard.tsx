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
  const [searchTerm, setSearchTerm] = useState("");

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
    data?.sessions.filter(
      (s) =>
        s.module_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.module_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.lecturer_name.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-6 rounded-2xl shadow-md border-2 border-blue-200 flex items-center gap-5 translate-y-0 hover:-translate-y-1 transition-all">
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

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <GraduationCap className="w-10 h-10 text-blue-600" />
          Daily Lectures Timetable
        </h2>

        <div className="relative md:w-200">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search module, code or lecturer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Sessions Grid */}
      {filteredSessions.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-300">
          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No sessions found</h3>
          <p className="text-gray-500">
            Check back later or adjust your search term.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-6">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className={`flex flex-col bg-white rounded-2xl shadow-md transition-all group ${
                session.status === "Live"
                  ? "border-2 border-green-500 shadow-md"
                  : "border-2 border-gray-200 hover:shadow-lg"
              }`}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-bold uppercase tracking-widest ${
                      session.status === "Live"
                        ? "bg-red-100 text-red-600 animate-pulse border border-red-200"
                        : session.status === "Completed"
                          ? "bg-gray-100 text-gray-600"
                          : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {session.status === "Live" ? "● LIVE NOW" : session.status}
                  </span>

                  {session.is_visiting && (
                    <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-sm font-bold rounded-full">
                      Visiting
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {session.module_name}
                  </h3>
                  <p className="text-sm font-semibold text-gray-700 uppercase tracking-tight">
                    {session.module_code} • {session.batch}
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

                <button
                  onClick={() =>
                    navigate(`/admin/live-camera?sessionId=${session.id}`)
                  }
                  className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl border-2 border-gray-200 font-bold transition-all cursor-pointer ${
                    session.status === "Live"
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/30"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <Video className="w-6 h-6" />
                  {session.status === "Live"
                    ? "Join Monitoring"
                    : "Start Monitoring"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
