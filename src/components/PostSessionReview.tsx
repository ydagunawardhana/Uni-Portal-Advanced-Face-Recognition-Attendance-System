import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Save,
  User,
  Clock,
  LayoutDashboard,
  Coffee,
  ArrowRight,
  Users,
  BookOpen,
  ClipboardX,
  MapPin,
  Calendar,
  GraduationCap,
  SearchX,
  X,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const API_BASE = "http://localhost:8000";
const MIN_ATTENDANCE_PERCENTAGE = 75;

const getInitials = (name: string) => {
  if (!name) return "??";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const calculateSessionDuration = (timeString: string) => {
  if (!timeString || !timeString.includes("-")) return 120;
  try {
    const [start, end] = timeString.split("-").map((t) => t.trim());
    const parseTime = (timeStr: string) => {
      const match = timeStr.match(/(\d+):(\d+)\s*([AP]M)/i);
      if (!match) return 0;
      let h = parseInt(match[1]);
      let m = parseInt(match[2]);
      const period = match[3].toUpperCase();
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };
    const diff = parseTime(end) - parseTime(start);
    return diff > 0 ? diff : 1; // Minimum 1 minute to prevent division by zero
  } catch (e) {
    return 120;
  }
};

const evaluateStudentStatus = (record: any, totalMinutes: number) => {
  // 1. If there's no valid OUT time (e.g., missing, null, or "--"), flag for manual review
  if (!record.timeOut || record.timeOut === "--") {
    return "Flagged";
  }

  // 2. If they have an OUT time, check duration percentage
  const presencePercentage = (record.duration / totalMinutes) * 100;

  // Using 70% as requested for auto-marking
  if (presencePercentage >= 70) {
    return "Auto-Present";
  } else {
    return "Auto-Absent";
  }
};

const formatTime = (isoString: string | null) => {
  if (!isoString) return "—";
  // The 'Z' ensures JS treats it as UTC and converts to local browser time
  const date = new Date(isoString.endsWith("Z") ? isoString : isoString + "Z");
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

interface AttendanceRecord {
  student_id: number;
  name: string;
  indexNumber: string;
  avatar: string;
  timeIn: string;
  timeOut: string;
  duration: number;
  status: string;
}

export default function PostSessionReview() {
  const location = useLocation();
  const navigate = useNavigate();

  // Persistence Logic: Prefer state (direct navigation), fallback to localStorage (recovery)
  const sessionId =
    location.state?.sessionId || localStorage.getItem("pendingReviewSessionId");

  const [loading, setLoading] = useState(!!sessionId);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionInfo, setSessionInfo] = useState({
    module_name: "--",
    module_code: "--",
    date: "--",
    location: "--",
    time: "--",
    total_session_minutes: 0,
    session_type: "--",
    batch: "--",
    semester: "--",
    enrolled_count: 0,
  });
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceDecisions, setAttendanceDecisions] = useState<
    Record<string, "Present" | "Absent">
  >({});

  type FilterType =
    | "ALL"
    | "PRESENT"
    | "ABSENT"
    | "TIME_INSUFFICIENT"
    | "FLAGGED";
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");

  const handleFilterClick = (filter: FilterType) => {
    setActiveFilter((prev) => (prev === filter ? "ALL" : filter));
  };

  const dynamicTotalMinutes = calculateSessionDuration(sessionInfo.time);

  const summaryStats = useMemo(() => {
    let flagged = 0;
    let timeInsufficient = 0;
    let presentCount = 0;
    let absentCount = 0;

    // Calculate raw system evaluations
    if (records) {
      records.forEach((record) => {
        const status = evaluateStudentStatus(record, dynamicTotalMinutes);
        if (status === "Flagged") flagged++;
        if (status === "Auto-Absent") timeInsufficient++;
      });
    }

    // Calculate final decisions (including manual overrides)
    Object.values(attendanceDecisions).forEach((decision) => {
      if (decision === "Present") presentCount++;
      if (decision === "Absent") absentCount++;
    });

    return { presentCount, timeInsufficient, flagged, absentCount };
  }, [records, dynamicTotalMinutes, attendanceDecisions]);

  const filteredRecords = useMemo(() => {
    if (!records) return [];

    return records.filter((record) => {
      if (activeFilter === "ALL") return true;

      const evalStatus = evaluateStudentStatus(record, dynamicTotalMinutes);
      const finalDecision = attendanceDecisions[record.indexNumber];

      if (activeFilter === "PRESENT") return finalDecision === "Present";
      if (activeFilter === "ABSENT") return finalDecision === "Absent";
      if (activeFilter === "TIME_INSUFFICIENT")
        return evalStatus === "Auto-Absent";
      if (activeFilter === "FLAGGED") return evalStatus === "Flagged";

      return true;
    });
  }, [records, activeFilter, dynamicTotalMinutes, attendanceDecisions]);

  useEffect(() => {
    if (sessionId) {
      fetchRecords();
    }
  }, [sessionId]);

  useEffect(() => {
    if (records && records.length > 0 && dynamicTotalMinutes > 0) {
      const initialDecisions: Record<string, "Present" | "Absent"> = {};

      records.forEach((record) => {
        const status = evaluateStudentStatus(record, dynamicTotalMinutes);
        initialDecisions[record.indexNumber] =
          status === "Auto-Present" ? "Present" : "Absent";
      });

      setAttendanceDecisions(initialDecisions);
    }
  }, [records, dynamicTotalMinutes]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/attendance/review/${sessionId}`);
      if (!res.ok) throw new Error("Failed to fetch records");
      const data = await res.json();
      setSessionInfo({
        module_name: data.module_name,
        module_code: data.module_code,
        date: data.date,
        location: data.location,
        time: data.scheduled_time, // Bind to scheduled_time from backend
        total_session_minutes: data.total_session_minutes,
        session_type: data.session_type,
        batch: data.batch,
        semester: data.semester,
        enrolled_count: data.enrolled_count || data.records.length,
      });
      setRecords(data.records);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load session review data");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (
    indexNumber: string,
    status: "Present" | "Absent",
  ) => {
    setAttendanceDecisions((prev) => ({
      ...prev,
      [indexNumber]: status,
    }));
  };

  const handleFinalize = async () => {
    setIsSaving(true);
    const loadingToast = toast.loading("Saving attendance records...");
    try {
      const payload = {
        session_id: sessionId,
        records: records.map((r) => {
          const finalStatus = attendanceDecisions[r.indexNumber] || "Absent";
          let reason = null;

          if (finalStatus === "Absent") {
            const evalStatus = evaluateStudentStatus(r, dynamicTotalMinutes);
            if (evalStatus === "Flagged") reason = "Flagged: No Exit Log";
            else if (evalStatus === "Auto-Absent")
              reason = "Insufficient Duration";
            else reason = "Manually Marked Absent";
          }

          return {
            student_id: r.student_id,
            status: finalStatus,
            reason: reason,
          };
        }),
      };

      const res = await fetch(`${API_BASE}/api/attendance/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Finalize failed");

      // Success: Clear the persistence token
      localStorage.removeItem("pendingReviewSessionId");

      // Add a slight artificial delay (1.5 seconds) so the loading state is visible to the user
      await new Promise((resolve) => setTimeout(resolve, 2500));

      toast.success("Attendance confirmed and saved successfully!", {
        id: loadingToast,
      });

      // Redirect to the My Subjects page instead of History
      navigate("/lecturer/my-subjects");
    } catch (error) {
      console.error("Finalize error:", error);
      toast.error("Failed to finalize attendance", { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
        <p className="text-gray-600 font-medium tracking-wide">
          Calculating Final Attendance...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      {/* Session Metadata Header */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-700 mb-2">
              Subject / Module
            </span>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-gray-800" />
              </div>
              <span className="font-medium text-gray-800 text-sm leading-tight">
                {sessionInfo.module_name} - ({sessionInfo.module_code})
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-700 mb-2">
              Session
            </span>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gray-800" />
              </div>
              <span className="font-medium text-gray-900 text-sm leading-tight">
                {sessionInfo.session_type} ({sessionInfo.date})
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-700 mb-2">
              Location
            </span>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-gray-800" />
              </div>
              <span className="font-medium text-gray-900 text-sm leading-tight">
                {sessionInfo.location}
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-700 mb-2">Batch</span>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-gray-800" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900 text-sm leading-tight">
                  {sessionInfo.batch} -
                </span>
                {sessionInfo.enrolled_count > 0 && (
                  <span className="bg-yellow-100 text-gray-800 text-sm font-bold px-2.5 py-0.5 rounded-xl border-2 border-yelloq-200">
                    {sessionInfo.enrolled_count} Enrolled Students
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-700 mb-2">
              Semester
            </span>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5 text-gray-800" />
              </div>
              <span className="font-medium text-gray-900 text-sm leading-tight">
                {sessionInfo.semester}
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-700 mb-2">Time</span>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-gray-800" />
              </div>
              <span className="font-medium text-gray-900 text-sm leading-tight">
                {sessionInfo.time}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!sessionId && !loading ? (
        /* Empty State */
        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-16 flex flex-col items-center justify-center bg-gray-100 transition-all">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4 mt-12">
            <ClipboardX className="w-14 h-14 animate-pulse text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            No Session Data Available
          </h2>
          <p className="text-gray-500 text-center max-w-sm font-medium mb-4 mt-2">
            Please ensure a live session has been ended properly to review the
            final attendance list.
          </p>
          <button
            onClick={() => navigate("/lecturer/mark-attendances")}
            className="mt-8 px-6 py-3 mb-10 bg-white border border-gray-300 cursor-pointer text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-all flex items-center space-x-2 shadow-sm"
          >
            <span>Go to Live Monitoring</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div
              onClick={() => handleFilterClick("PRESENT")}
              className={`bg-green-50 border-2 rounded-xl p-5 gap-4 flex items-center shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md ${
                activeFilter === "PRESENT"
                  ? "border-green-500 ring-2 ring-green-200"
                  : "border-green-200"
              }`}
            >
              <div className="bg-green-100 p-3 rounded-xl shrink-0 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <p className="text-md font-bold text-gray-600 mb-0.5">
                  Total Present
                </p>
                <p className="text-2xl font-bold text-gray-900 leading-none">
                  {summaryStats.presentCount}
                </p>
              </div>
            </div>

            <div
              onClick={() => handleFilterClick("TIME_INSUFFICIENT")}
              className={`bg-blue-50 border-2 rounded-xl p-5 gap-4 flex items-center shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md ${
                activeFilter === "TIME_INSUFFICIENT"
                  ? "border-blue-500 ring-2 ring-blue-200"
                  : "border-blue-200"
              }`}
            >
              <div className="bg-blue-100 p-3 rounded-xl shrink-0 flex items-center justify-center">
                <Clock className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <p className="text-md font-bold text-gray-600 mb-0.5">
                  Time Insufficient
                </p>
                <p className="text-2xl font-bold text-gray-900 leading-none">
                  {summaryStats.timeInsufficient}
                </p>
              </div>
            </div>

            <div
              onClick={() => handleFilterClick("FLAGGED")}
              className={`bg-red-50 border-2 rounded-xl gap-4 p-5 flex items-center shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md ${
                activeFilter === "FLAGGED"
                  ? "border-red-500 ring-2 ring-red-100"
                  : "border-red-200"
              }`}
            >
              <div className="bg-red-100 p-3 rounded-xl shrink-0 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-600 animate-pulse" />
              </div>
              <div>
                <p className="text-md font-bold text-gray-600 mb-0.5">
                  Flagged Issues
                </p>
                <p className="text-2xl font-bold text-gray-900 leading-none">
                  {summaryStats.flagged}
                </p>
              </div>
            </div>

            <div
              onClick={() => handleFilterClick("ABSENT")}
              className={`bg-purple-50 border-2 rounded-xl gap-4 p-5 flex items-center shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md ${
                activeFilter === "ABSENT"
                  ? "border-gray-300 ring-2 ring-gray-300"
                  : "border-purple-100"
              }`}
            >
              <div className="bg-purple-100 p-3 rounded-xl shrink-0 flex items-center justify-center">
                <XCircle className="w-7 h-7 text-purple-600" />
              </div>
              <div>
                <p className="text-md font-bold text-gray-600 mb-0.5">
                  Total Absent
                </p>
                <p className="text-2xl font-bold text-gray-900 leading-none">
                  {summaryStats.absentCount}
                </p>
              </div>
            </div>
          </div>

          {/* Warning Note */}
          {records.some(
            (r) => evaluateStudentStatus(r, dynamicTotalMinutes) === "Flagged",
          ) && (
            <div className="mb-6 bg-red-50 border border-orange-300 rounded-xl p-3 flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-orange-800 uppercase tracking-wide">
                  Attention Required
                </h4>
                <p className="text-sm text-orange-700 mt-1">
                  Some students have been <strong>Flagged</strong> because they
                  were detected entering but no exit log was recorded. Please
                  verify their presence and manually set their status before
                  saving.
                </p>
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            {activeFilter !== "ALL" && (
              <div className="flex justify-between items-center bg-gray-50 border-b border-gray-200 px-6 py-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">
                    Filtered by :
                  </span>
                  <span className="text-sm font-bold px-2 py-0.5 rounded-xl bg-white border border-gray-300 text-gray-800 shadow-sm">
                    {activeFilter === "PRESENT" && "Total Present"}
                    {activeFilter === "ABSENT" && "Total Absent"}
                    {activeFilter === "TIME_INSUFFICIENT" &&
                      "Time Insufficient"}
                    {activeFilter === "FLAGGED" && "Flagged Issues"}
                  </span>
                  <span className="text-sm font-bold text-gray-800 bg-yellow-100 px-2 py-0.5 border-2 rounded-full ml-2">
                    {filteredRecords.length} students found
                  </span>
                </div>
                <button
                  onClick={() => setActiveFilter("ALL")}
                  className="text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 px-3 py-1.5 rounded-lg transition-colors flex items-center cursor-pointer border-2 border-blue-200 "
                >
                  Clear Filter
                </button>
              </div>
            )}
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="px-6 py-4 text-sm font-bold text-gray-700  tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700 tracking-wider">
                    Index Number
                  </th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700 tracking-wider">
                    Time IN
                  </th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700 tracking-wider">
                    Time OUT
                  </th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700 tracking-wider">
                    Inside Duration
                  </th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700 tracking-wider">
                    Marking Status
                  </th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700 tracking-wider text-center">
                    Final Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <div className="bg-gray-100 p-4 rounded-full mb-4">
                          <SearchX className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-base font-semibold text-gray-700">
                          No students found
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          There are no students matching the "{activeFilter}"
                          filter.
                        </p>
                        <button
                          onClick={() => setActiveFilter("ALL")}
                          className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-800 border-2 bg-blue-50 px-4 py-2 rounded-lg transition-colors cursor-pointer"
                        >
                          Clear Filter
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record, index) => {
                    const calculatedStatus = evaluateStudentStatus(
                      record,
                      dynamicTotalMinutes,
                    );

                    return (
                      <tr
                        key={record.student_id || index}
                        className={`transition-colors ${
                          calculatedStatus === "Flagged"
                            ? "bg-red-50 hover:bg-red-100"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            {record.avatar ? (
                              <ImageWithFallback
                                src={record.avatar}
                                alt={record.name}
                                className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-sm"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm border border-blue-200">
                                {getInitials(record.name)}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-bold text-gray-900">
                                {record.name}
                              </p>
                              <p className="text-xs text-gray-500 font-medium tracking-tight">
                                Student
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 font-bold">
                          {record.indexNumber}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-700">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span>{formatTime(record.timeIn)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-700">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span>{formatTime(record.timeOut)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <span
                              className={`text-sm font-bold ${
                                (record.duration / dynamicTotalMinutes) * 100 >=
                                MIN_ATTENDANCE_PERCENTAGE
                                  ? "text-green-600"
                                  : "text-red-500"
                              }`}
                            >
                              {record.duration} / {dynamicTotalMinutes} mins
                            </span>
                            <span className="text-sm font-bold text-gray-700">
                              (
                              {Math.round(
                                (record.duration / dynamicTotalMinutes) * 100,
                              )}
                              % Presence)
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {record.status === "Absent" ? (
                            <span className="bg-red-100 text-red-600 px-2.5 py-1 rounded-xl text-sm font-bold border border-red-200 inline-flex items-center">
                              <XCircle className="w-4 h-4 mr-2" /> Absent
                            </span>
                          ) : (
                            <>
                              {calculatedStatus === "Flagged" && (
                                <span className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-xl text-sm font-bold border border-orange-200 inline-flex items-center">
                                  <AlertCircle className="w-4 h-4 mr-2" />{" "}
                                  Flagged
                                </span>
                              )}
                              {calculatedStatus === "Auto-Present" && (
                                <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-xl text-sm font-bold border border-green-200 inline-flex items-center">
                                  <CheckCircle className="w-4 h-4 mr-2" />{" "}
                                  Auto-Marked
                                </span>
                              )}
                              {calculatedStatus === "Auto-Absent" && (
                                <span className="bg-red-100 text-red-600 px-2.5 py-1 rounded-xl text-sm font-bold border border-red-200 inline-flex items-center">
                                  <XCircle className="w-4 h-4 mr-2" /> Time
                                  Insufficient
                                </span>
                              )}
                            </>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() =>
                                handleStatusChange(
                                  record.indexNumber,
                                  "Present",
                                )
                              }
                              className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center transition-colors cursor-pointer border ${
                                attendanceDecisions[record.indexNumber] ===
                                "Present"
                                  ? "bg-green-600 text-white border-green-600"
                                  : "bg-green-50 text-green-600 border-green-200 border-2 hover:bg-green-100"
                              }`}
                            >
                              <CheckCircle className="w-5 h-5 mr-1" /> Present
                            </button>

                            <button
                              onClick={() =>
                                handleStatusChange(record.indexNumber, "Absent")
                              }
                              className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center transition-colors cursor-pointer border ${
                                attendanceDecisions[record.indexNumber] ===
                                "Absent"
                                  ? "bg-red-600 text-white border-red-600"
                                  : "bg-red-50 text-red-600 border-red-200 border-2 hover:bg-red-50"
                              }`}
                            >
                              <XCircle className="w-6 h-6 mr-1" /> Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Sticky Footer */}
      {records.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-8 py-4 shadow-2xl z-20">
          <div className="max-w-8xl mx-auto flex flex-row w-full justify-end items-center">
            <button
              onClick={handleFinalize}
              disabled={isSaving}
              className={`px-6 py-2.5 rounded-lg text-white font-semibold transition-all duration-200 flex items-center justify-center min-w-[250px] cursor-pointer ${
                isSaving
                  ? "bg-blue-600 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg"
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving Records...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Confirm & Save Attendance
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
