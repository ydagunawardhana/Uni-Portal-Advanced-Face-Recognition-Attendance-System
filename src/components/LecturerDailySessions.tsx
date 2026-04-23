import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Video,
  CheckCircle,
  Search,
  Clock,
  MapPin,
  BookOpen,
  GraduationCap,
  Users,
  User,
  LogOut,
} from "lucide-react";
import LecturerHeader from "./LecturerHeader";

const API_BASE = "http://localhost:8000";

interface Session {
  id: number;
  module_name: string;
  module_code: string;
  batch: string;
  location: string;
  start_time: string;
  end_time: string;
  is_live: boolean;
  status?: string;
  date: string;
}

export default function LecturerDailySessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTodayTimetable = async () => {
      try {
        const token = localStorage.getItem("lecturerToken");
        const res = await fetch(`${API_BASE}/api/lecturer/timetable`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const today = new Date().toISOString().split("T")[0];
          const todaySessions = Array.isArray(data)
            ? data.filter((s: Session) => s.date === today)
            : [];
          setSessions(todaySessions);
        }
      } catch (err) {
        console.error("Failed to fetch timetable", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTodayTimetable();
  }, []);

  const filteredSessions = sessions.filter(
    (s) =>
      s.module_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.module_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.location.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalSessions = sessions.length;
  const liveSessions = sessions.filter((s) => s.is_live).length;
  const completedSessions = sessions.filter(
    (s) => s.status === "completed",
  ).length;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-gray-50 text-gray-900">
      {/* 1. Global Header Component */}
      <LecturerHeader />

      {/* 2. Content Wrapper with Padding */}
      <div className="p-8">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6 flex items-center gap-5 shadow-sm">
            <div className="bg-blue-100 p-4 rounded-xl text-blue-600">
              <Calendar className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-600 mb-1">
                My Sessions Today
              </p>
              <h3 className="text-3xl font-black text-gray-900 uppercase">
                {totalSessions}
              </h3>
            </div>
          </div>

          <div className="bg-green-50/50 border border-green-100 rounded-xl p-6 flex items-center gap-5 shadow-sm">
            <div className="bg-green-100 p-4 rounded-xl text-green-600">
              <Video className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-600 mb-1">
                Currently Live
              </p>
              <h3 className="text-3xl font-black text-gray-900 uppercase">
                {liveSessions}
              </h3>
            </div>
          </div>

          <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-6 flex items-center gap-5 shadow-sm">
            <div className="bg-purple-100 p-4 rounded-xl text-purple-600">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-600 mb-1">
                Completed Sessions
              </p>
              <h3 className="text-3xl font-black text-gray-900 uppercase">
                {completedSessions}
              </h3>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-600" /> Daily Lectures
            Timetable
          </h2>

          {/* Search Bar */}
          <div className="relative mb-8">
            <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search module, code or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Sessions Grid */}
          {isLoading ? (
            <div className="text-center py-10 text-gray-500 font-medium">
              Loading today's schedule...
            </div>
          ) : filteredSessions.length === 0 ? (
            /* NEW: Large Dashed Empty State */
            <div className="flex flex-col items-center justify-center py-24 bg-white border-2 border-dashed border-gray-300 rounded-2xl shadow-sm mx-2 my-4">
              <Calendar className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                No Sessions Scheduled
              </h3>
              <p className="text-gray-500 text-center max-w-md">
                You don't have any active classes or lectures scheduled for
                today. You can relax or check your full timetable for upcoming
                sessions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col"
                >
                  {/* Badge */}
                  <div className="mb-4">
                    {session.is_live ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-green-100 text-green-700 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse"></span>
                        Live Now
                      </span>
                    ) : session.status === "completed" ? (
                      <span className="inline-flex px-3 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-600 uppercase tracking-wider">
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex px-3 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">
                        Pending
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">
                    {session.module_name}
                  </h3>
                  <p className="text-sm font-medium text-gray-500 mb-5">
                    {session.module_code} • Batch {session.batch}
                  </p>

                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-6">
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gray-500">
                          Time
                        </p>
                        <p className="text-sm font-semibold text-gray-800">
                          {session.start_time} - {session.end_time}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gray-500">
                          Location
                        </p>
                        <p className="text-sm font-semibold text-gray-800">
                          {session.location}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-100">
                    <button
                      onClick={() =>
                        navigate(
                          `/lecturer/live-class-monitoring?sessionId=${session.id}`,
                        )
                      }
                      className={`w-full py-2.5 rounded-lg cursor-pointer font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                        session.is_live
                          ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                          : "bg-gray-50 text-gray-800 hover:bg-gray-200 border border-gray-300"
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      {session.is_live ? "Resume Session" : "Start Session"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
