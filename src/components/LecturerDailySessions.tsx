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
  AlertCircle,
  Square,
  X,
  Info,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";

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
  is_completed?: boolean;
  status?: string;
  date: string;
  degree?: string;
  semester?: string;
  level?: string;
  cover_requested?: boolean;
  cover_reason?: string;
}

export default function LecturerDailySessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [degreeFilter, setDegreeFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [startingSessionId, setStartingSessionId] = useState<number | null>(
    null,
  );
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [selectedCoverSession, setSelectedCoverSession] =
    useState<Session | null>(null);
  const [coverReason, setCoverReason] = useState("");
  const [isSubmittingCover, setIsSubmittingCover] = useState(false);
  const [timeFilter, setTimeFilter] = useState<
    "prev_week" | "today" | "next_week"
  >("today");

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const getNextWeekStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const getPrevWeekStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const fetchTodayTimetable = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const token = localStorage.getItem("lecturerToken");
      if (!token) return;

      const res = await fetch(`${API_BASE}/api/lecturer/timetable`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch timetable", err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    // 1. Initial fetch with loading state
    fetchTodayTimetable(true);

    // 2. Setup background polling (silent) every 5 seconds
    const intervalId = setInterval(() => {
      fetchTodayTimetable(false);
    }, 5000);

    // 3. Cleanup on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Extract unique values for the dropdowns dynamically based on today's sessions
  const uniqueDegrees = Array.from(
    new Set(sessions.map((s) => s.degree).filter(Boolean)),
  ) as string[];
  const uniqueSemesters = Array.from(
    new Set(sessions.map((s) => s.semester || s.level).filter(Boolean)),
  ) as string[];
  const uniqueBatches = Array.from(
    new Set(sessions.map((s) => s.batch).filter(Boolean)),
  ) as string[];

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.module_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.module_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.location?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDegree = degreeFilter ? s.degree === degreeFilter : true;
    const sessionSem = s.semester || s.level;
    const matchesSemester = semesterFilter
      ? sessionSem === semesterFilter
      : true;
    const matchesBatch = batchFilter ? s.batch === batchFilter : true;

    // Time Filtering logic
    const today = getTodayStr();
    const nextWeek = getNextWeekStr();
    const prevWeek = getPrevWeekStr();
    const sessionDate = s.date;

    let matchesTime = false;
    if (timeFilter === "today") {
      matchesTime = sessionDate === today;
    } else if (timeFilter === "next_week") {
      matchesTime = sessionDate >= today && sessionDate <= nextWeek;
    } else if (timeFilter === "prev_week") {
      matchesTime = sessionDate >= prevWeek && sessionDate < today;
    }

    return (
      matchesSearch &&
      matchesDegree &&
      matchesSemester &&
      matchesBatch &&
      matchesTime
    );
  });

  const todayStr = getTodayStr();
  const todaySessionsCount = sessions.filter((s) => s.date === todayStr).length;
  const activeCoverRequestsCount = sessions.filter(
    (s) =>
      s.cover_requested &&
      !(s.status?.toLowerCase() === "completed" || s.is_completed),
  ).length;

  const liveCount = sessions.filter(
    (s) => s.date === todayStr && (s.is_live || s.status?.toLowerCase() === "live"),
  ).length;
  const completedCount = sessions.filter(
    (s) =>
      s.date === todayStr &&
      (s.status?.toLowerCase() === "completed" || s.is_completed),
  ).length;

  const activeSessionStr =
    typeof window !== "undefined"
      ? localStorage.getItem("activeAttendanceSession")
      : null;
  let activeSessionId: string | null = null;
  try {
    if (activeSessionStr) {
      activeSessionId = String(JSON.parse(activeSessionStr).selectedSession);
    }
  } catch (e) {}

  const handleStartSession = (session: Session) => {
    // Prevent starting future sessions
    const today = getTodayStr();
    if (session.date > today) {
      toast.error(
        "This session is scheduled for a future date. You cannot start it yet.",
        {
          style: { borderRadius: "10px", background: "#fff", color: "#333" },
        },
      );
      return;
    }

    if (String(session.id) === activeSessionId) {
      navigate(`/lecturer/live-class-monitoring?sessionId=${session.id}`, {
        state: { sessionStarted: true, moduleName: session.module_name },
      });
      return;
    }

    setStartingSessionId(session.id);

    // Simulate a brief loading delay for UX
    setTimeout(() => {
      navigate(`/lecturer/live-class-monitoring?sessionId=${session.id}`, {
        state: {
          sessionStarted: true,
          moduleName: session.module_name,
        },
      });
    }, 3000);
  };

  const handleRequestCover = async () => {
    if (!selectedCoverSession || !coverReason.trim()) return;

    setIsSubmittingCover(true);

    const requestPromise = (async () => {
      // Artificial delay for UX
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const token = localStorage.getItem("lecturerToken");
      const res = await fetch(
        `${API_BASE}/api/lecturer/request_cover/${selectedCoverSession.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: coverReason }),
        },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to submit request");
      }

      return res.json();
    })();

    toast.promise(requestPromise, {
      loading: "Submitting cover request...",
      success: "Cover request submitted successfully!",
      error: (err) => `Error: ${err.message}`,
    });

    try {
      await requestPromise;
      // Refresh local state
      setSessions((prev) =>
        prev.map((s) =>
          s.id === selectedCoverSession.id
            ? { ...s, cover_requested: true, cover_reason: coverReason }
            : s,
        ),
      );
      setShowCoverModal(false);
      setCoverReason("");
    } catch (err) {
      console.error("Cover request error:", err);
    } finally {
      setIsSubmittingCover(false);
    }
  };
  const handleCancelCover = async (sessionId: number) => {
    const cancelPromise = (async () => {
      // Artificial delay for UX
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const token = localStorage.getItem("lecturerToken");
      const res = await fetch(
        `${API_BASE}/api/lecturer/cancel_cover/${sessionId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to cancel request");
      }

      return res.json();
    })();

    toast.promise(cancelPromise, {
      loading: "Cancelling cover request...",
      success: "Cover request cancelled successfully!",
      error: (err) => `Error: ${err.message}`,
    });

    try {
      await cancelPromise;
      // Refresh local state
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, cover_requested: false, cover_reason: "" }
            : s,
        ),
      );
    } catch (err) {
      console.error("Cancel cover error:", err);
    }
  };

  return (
    <div className="flex-1">
      {/* 2. Content Wrapper with Padding removed as parent handles it */}
      <div>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 flex items-center gap-5 shadow-sm">
            <div className="bg-blue-100 p-4 rounded-xl text-blue-600">
              <Calendar className="w-8 h-8" />
            </div>
            <div>
              <p className="text-md font-bold text-gray-600 mb-1 tracking-wider">
                My Sessions Today
              </p>
              <h3 className="text-3xl font-bold text-gray-900 uppercase">
                {todaySessionsCount}
              </h3>
            </div>
          </div>

          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 flex items-center gap-5 shadow-sm">
            <div className="bg-green-100 p-4 rounded-xl text-green-600">
              <Video className="w-10 h-10 animate-pulse" />
            </div>
            <div>
              <p className="text-md font-bold text-gray-600 mb-1 tracking-wider">
                Currently Live
              </p>
              <h3 className="text-3xl font-bold text-gray-900 uppercase">
                {activeSessionStr ? 1 : liveCount}
              </h3>
            </div>
          </div>

          <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-6 flex items-center gap-5 shadow-sm">
            <div className="bg-purple-100 p-4 rounded-xl text-purple-600">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <p className="text-md font-bold text-gray-600 mb-1 tracking-wider">
                Completed Sessions
              </p>
              <h3 className="text-3xl font-bold text-gray-900 uppercase">
                {completedCount}
              </h3>
            </div>
          </div>

          {/* NEW: Cover Requests Stat Card */}
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 flex items-center gap-5 shadow-sm">
            <div className="bg-red-100 p-4 rounded-xl text-red-600">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <p className="text-md font-bold text-gray-600 mb-1 tracking-wider">
                Cover Requests
              </p>
              <h3 className="text-3xl font-bold text-gray-900 uppercase">
                {activeCoverRequestsCount}
              </h3>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <GraduationCap className="w-10 h-10 text-blue-600" /> Lectures
              Timetable
            </h2>

            {/* Time Filter Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-inner w-max">
              <button
                onClick={() => setTimeFilter("prev_week")}
                className={`px-5 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                  timeFilter === "prev_week"
                    ? "bg-white shadow text-blue-600"
                    : "text-gray-500 hover:text-gray-700 font-medium"
                }`}
              >
                Previous 7 Days
              </button>
              <button
                onClick={() => setTimeFilter("today")}
                className={`px-5 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                  timeFilter === "today"
                    ? "bg-white shadow text-blue-600"
                    : "text-gray-500 hover:text-gray-700 font-medium"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setTimeFilter("next_week")}
                className={`px-5 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                  timeFilter === "next_week"
                    ? "bg-white shadow text-blue-600"
                    : "text-gray-500 hover:text-gray-700 font-medium"
                }`}
              >
                Next 7 Days
              </button>
            </div>
          </div>

          {/* Filters Section (Grid Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {/* 1. Search Bar */}
            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search module, code or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              />
            </div>

            {/* 2. Degree Filter */}
            <div>
              <select
                value={degreeFilter}
                onChange={(e) => setDegreeFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm text-gray-700 cursor-pointer"
              >
                <option value="">All Degrees / Programs</option>
                {uniqueDegrees.map((deg) => (
                  <option key={deg} value={deg}>
                    {deg}
                  </option>
                ))}
                {/* Fallback hardcoded options just in case backend doesn't send degree yet */}
                {uniqueDegrees.length === 0 && (
                  <>
                    <option value="BSc (Hons) in Computer Science">
                      BSc (Hons) in Computer Science
                    </option>
                    <option value="BSc (Hons) in Software Engineering">
                      BSc (Hons) in Software Engineering
                    </option>
                  </>
                )}
              </select>
            </div>

            {/* 3. Semester Filter */}
            <div>
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm text-gray-700 cursor-pointer"
              >
                <option value="">All Semesters</option>
                {uniqueSemesters.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
                {/* Fallback */}
                {uniqueSemesters.length === 0 && (
                  <>
                    <option value="Year 1 - Semester 1">
                      Year 1 - Semester 1
                    </option>
                    <option value="Year 1 - Semester 2">
                      Year 1 - Semester 2
                    </option>
                    <option value="Year 2 - Semester 1">
                      Year 2 - Semester 1
                    </option>
                  </>
                )}
              </select>
            </div>

            {/* 4. Batch Filter */}
            <div>
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm text-gray-700 cursor-pointer"
              >
                <option value="">All Batches</option>
                {uniqueBatches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sessions Grid */}
          {isLoading ? (
            <div className="text-center py-10 text-gray-500 font-medium">
              Loading today's schedule...
            </div>
          ) : filteredSessions.length === 0 ? (
            /* NEW: Large Dashed Empty State */
            <div className="flex flex-col items-center justify-center py-12 bg-white border-2 border-dashed border-gray-300 rounded-2xl mx-2 my-4">
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
                  className={`border-2 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col ${
                    String(session.id) === activeSessionId
                      ? "border-green-200 bg-green-50/30"
                      : session.is_live && session.cover_requested
                        ? "border-orange-200 bg-orange-50/20"
                        : session.status?.toLowerCase() === "completed" ||
                            session.is_completed
                          ? "border-gray-200 bg-gray-50/50"
                          : "bg-white border-gray-200"
                  }`}
                >
                  {/* Badge */}
                  <div className="flex justify-between items-start mb-4">
                    {String(session.id) === activeSessionId ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 animate-pulse rounded-full text-sm font-bold bg-green-100 text-green-700 uppercase shadow-sm border-2 border-green-200">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                        LIVE NOW
                      </span>
                    ) : session.status?.toLowerCase() === "completed" ||
                      session.is_completed === true ? (
                      <span className="inline-flex px-2.5 py-1 rounded-full text-sm font-bold bg-green-100 text-green-600 uppercase">
                        Completed
                      </span>
                    ) : session.status?.toLowerCase() === "missed" ? (
                      <span className="inline-flex px-2.5 py-1 rounded-full text-sm font-bold bg-red-100 text-red-600 uppercase">
                        Missed
                      </span>
                    ) : (
                      <span className="inline-flex px-2.5 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-700 uppercase">
                        {session.status || "Pending"}
                      </span>
                    )}

                    {/* Cover Request Badge */}
                    {session.cover_requested && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 mt-0.5 uppercase rounded-full text-sm font-bold ${
                        session.status?.toLowerCase() === "completed" || session.is_completed
                          ? "bg-gray-100 text-gray-500 border border-gray-200"
                          : "bg-red-100 text-red-700 animate-pulse"
                      }`}>
                        {session.status?.toLowerCase() === "completed" || session.is_completed ? (
                          <>Covered</>
                        ) : (
                          <><AlertCircle className="w-3.5 h-3.5" /> Cover Requested</>
                        )}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">
                    {session.module_name}
                  </h3>
                  <p className="text-sm font-bold text-gray-700 mb-2">
                    {session.module_code} - Batch {session.batch}
                  </p>

                  {/* Session Date Indicator */}
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 w-max mb-3 mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(session.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>

                  {/* Display Cover Reason — hidden once session is completed */}
                  {session.cover_requested &&
                    !(session.status?.toLowerCase() === "completed" || session.is_completed) && (
                    <div className="mb-4 bg-red-50 border-2 border-red-100 rounded-lg p-2 text-xs text-red-600 font-medium flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>Reason: {session.cover_reason}</span>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-y-4 gap-x-3 mb-6 mt-2">
                    {/* Time */}
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-500">
                          Time
                        </p>
                        <p className="text-sm font-bold text-gray-800">
                          {session.start_time} - {session.end_time}
                        </p>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-500">
                          Location
                        </p>
                        <p className="text-sm font-bold text-gray-800">
                          {session.location}
                        </p>
                      </div>
                    </div>

                    {/* Degree (col-span-2 to handle long degree names nicely) */}
                    <div className="flex items-start gap-2 col-span-1 mt-2">
                      <GraduationCap className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-500">
                          Degree Program
                        </p>
                        <p className="text-sm font-bold text-gray-800">
                          {session.degree || "Not specified"}
                        </p>
                      </div>
                    </div>

                    {/* Semester */}
                    <div className="flex items-start gap-2 col-span-1 mt-2">
                      <BookOpen className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-500">
                          Semester
                        </p>
                        <p className="text-sm font-bold text-gray-800">
                          {session.semester || session.level || "Not specified"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-auto border-gray-100 flex flex-col gap-2">
                    {(() => {
                      const isSessionCompleted =
                        session.status?.toLowerCase() === "completed" ||
                        session.is_completed === true;
                      const isSessionMissed =
                        session.status?.toLowerCase() === "missed";
                      const isSessionLive =
                        !isSessionCompleted &&
                        !isSessionMissed &&
                        (session.is_live ||
                          String(session.id) === activeSessionId ||
                          session.status?.toLowerCase() === "live");

                      if (isSessionCompleted) {
                        /* STATE 1: COMPLETED */
                        return session.cover_requested ? (
                          <button
                            disabled
                            className="w-full py-2.5 bg-green-50 text-green-600 font-bold rounded-xl border-2 border-green-200 cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                          >
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            Covered by Admin
                          </button>
                        ) : (
                          <button
                            disabled
                            className="w-full py-2.5 bg-green-50 text-green-600 font-bold rounded-xl border-2 border-green-200 cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                          >
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            Session Completed
                          </button>
                        );
                      } else if (isSessionMissed) {
                        /* STATE: MISSED */
                        return (
                          <button
                            disabled
                            className="w-full py-2.5 bg-red-50 text-red-500 font-bold rounded-xl border-2 border-red-200 cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                          >
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            Session Missed
                          </button>
                        );
                      } else if (isSessionLive) {
                        /* STATE 2: LIVE */
                        return session.cover_requested ? (
                          /* 2a. Covered live — read-only */
                          <button
                            disabled
                            className="w-full py-2.5 bg-green-50 text-green-700 border-2 border-green-200 font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                          >
                            <Video className="w-5 h-5 animate-pulse" />
                            Live (Covered by Admin)
                          </button>
                        ) : (
                          /* 2b. Own live session — allow resume */
                          <button
                            onClick={() => handleStartSession(session)}
                            className="w-full py-2.5 bg-green-100 hover:bg-green-200 text-green-700 border-2 border-green-300 font-bold rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all text-sm"
                          >
                            <Video className="w-6 h-6 animate-pulse" /> Resume
                            Session
                          </button>
                        );
                      } else if (session.cover_requested) {
                        /* STATE 3: PENDING COVER REQUEST */
                        return (
                          <button
                            onClick={() => handleCancelCover(session.id)}
                            className="w-full py-2.5 bg-white hover:bg-red-50 text-red-600 border-2 border-red-200 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
                          >
                            Cancel Cover Request
                          </button>
                        );
                      } else {
                        /* STATE 4: DEFAULT / UPCOMING */
                        const isFutureSession = session.date > todayStr;
                        return (
                          <>
                            <button
                              onClick={() => handleStartSession(session)}
                              disabled={startingSessionId === session.id}
                              className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                startingSessionId === session.id
                                  ? "bg-blue-600 text-white cursor-wait"
                                  : isFutureSession
                                  ? "bg-gray-50 text-gray-400 border-2 border-gray-200 cursor-not-allowed hover:bg-gray-100"
                                  : "bg-blue-100 text-blue-700 hover:bg-blue-200 border-2 border-blue-200 cursor-pointer"
                              }`}
                            >
                              {startingSessionId === session.id ? (
                                <>
                                  <span className="w-4 h-4 border-2 border-white rounded-xl animate-spin"></span>
                                  Starting...
                                </>
                              ) : isFutureSession ? (
                                <>
                                  <Lock className="w-5 h-5 opacity-70" /> Start
                                  Session
                                </>
                              ) : (
                                <>
                                  <Video className="w-5 h-5" /> Start Session
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => {
                                setSelectedCoverSession(session);
                                setShowCoverModal(true);
                              }}
                              className="w-full py-2.5 rounded-xl font-bold text-sm cursor-pointer flex items-center justify-center gap-2 transition-all bg-white text-red-600 hover:bg-red-50 border-2 border-red-200"
                            >
                              <AlertCircle className="w-5 h-5" /> Request Admin
                              Cover
                            </button>
                          </>
                        );
                      }
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cover Request Modal */}
      {showCoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 rounded-2xl text-red-600">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Request Cover
                  </h3>
                  <p className="text-sm text-gray-600 font-medium">
                    For {selectedCoverSession?.module_name}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-md font-bold text-gray-700 mb-2">
                    Reason for Request
                  </label>
                  <textarea
                    value={coverReason}
                    onChange={(e) => setCoverReason(e.target.value)}
                    placeholder="e.g., Medical emergency, Technical issue..."
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm resize-none font-medium"
                  />
                </div>
              </div>

              {/* Informational Note */}
              <div className="mt-2 p-3.5 py-2 px-3 font-medium bg-blue-50 border border-blue-100 rounded-lg flex gap-3 text-xs italic text-blue-800">
                <div>
                  <strong className="font-bold">Important Note:</strong>{" "}
                  Submitting this request grants the Admin access to cover and
                  start this session. You will not be able to start or manage it
                  once covered. However, you can cancel this request at any time
                  before the session begins.
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowCoverModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-600 hover:bg-gray-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestCover}
                  disabled={isSubmittingCover || !coverReason.trim()}
                  className="flex-2 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmittingCover ? (
                    <span>Submitting...</span>
                  ) : (
                    "Submit Request"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
