import { useState, useEffect } from "react";
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
  const [saving, setSaving] = useState(false);
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
  });
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    if (sessionId) {
      fetchRecords();
    }
  }, [sessionId]);

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
      });
      setRecords(data.records);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load session review data");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = (studentId: number, newStatus: string) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.student_id === studentId ? { ...r, status: newStatus } : r,
      ),
    );
  };

  const handleFinalize = async () => {
    setSaving(true);
    try {
      const payload = {
        session_id: sessionId,
        records: records.map((r) => ({
          student_id: r.student_id,
          status: r.status,
        })),
      };

      const res = await fetch(`${API_BASE}/api/attendance/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Finalize failed");

      // Success: Clear the persistence token
      localStorage.removeItem("pendingReviewSessionId");

      toast.success("Attendance Finalized & Saved Successfully!");
      navigate("/lecturer/history");
    } catch (error) {
      console.error("Finalize error:", error);
      toast.error("Failed to finalize attendance");
    } finally {
      setSaving(false);
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
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-700 mb-2">
              Subject / Module
            </span>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
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
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
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
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <span className="font-medium text-gray-900 text-sm leading-tight">
                {sessionInfo.location}
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-700 mb-2">Batch</span>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-yellow-600" />
              </div>
              <span className="font-medium text-gray-900 text-sm leading-tight">
                {sessionInfo.batch}
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-700 mb-2">
              Semester
            </span>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5 text-red-600" />
              </div>
              <span className="font-medium text-gray-900 text-sm leading-tight">
                {sessionInfo.semester}
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-700 mb-2">Time</span>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
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
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 mt-12">
            <ClipboardX className="w-12 h-12 text-gray-400" />
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
          {/* Warning Note */}
          {records.some((r) => r.status === "Flagged") && (
            <div className="mb-6 bg-red-50 border border-orange-300 rounded-xl p-3 flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-orange-800 uppercase tracking-wide">
                  Attention Required
                </h4>
                <p className="text-sm text-orange-700 mt-1">
                  Some students have been <strong>Flagged</strong> because they were
                  detected entering but no exit log was recorded. Please verify
                  their presence and manually set their status before saving.
                </p>
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
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
              {records.map((record) => (
                <tr
                  key={record.student_id}
                  className={`transition-colors ${
                    record.status === "Flagged"
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
                      <Clock className="w-4 h-4 text-green-500" />
                      <span>{formatTime(record.timeIn)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-700">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-red-500" />
                      <span>{formatTime(record.timeOut)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <span className={`text-sm font-bold ${
                        (record.duration / (sessionInfo.total_session_minutes || 1)) * 100 >= MIN_ATTENDANCE_PERCENTAGE 
                        ? 'text-green-600' 
                        : 'text-red-500'
                      }`}>
                        {record.duration} / {sessionInfo.total_session_minutes} mins
                      </span>
                      <span className="text-sm font-bold text-gray-700">
                        ({Math.round((record.duration / (sessionInfo.total_session_minutes || 1)) * 100)}% Presence)
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-sm font-bold border ${
                        record.status === "Present"
                          ? "bg-green-100 text-green-700 border-green-200"
                          : record.status === "Absent"
                            ? "bg-red-100 text-red-700 border-red-200"
                            : record.status === "Flagged"
                              ? "bg-orange-100 text-orange-700 border-orange-200"
                              : "bg-orange-100 text-orange-700 border-orange-200"
                      }`}
                    >
                      {record.status === "Flagged" && (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      <span>{record.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() =>
                          handleStatusToggle(record.student_id, "Present")
                        }
                        className={`flex items-center space-x-2 cursor-pointer px-4 py-1.5 rounded-xl text-sm font-bold transition-all border-2 ${
                          record.status === "Present"
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-white text-green-600 border-green-500 hover:bg-green-50"
                        }`}
                      >
                        <CheckCircle className="w-5 h-5" />
                        <span>Present</span>
                      </button>
                      <button
                        onClick={() =>
                          handleStatusToggle(record.student_id, "Absent")
                        }
                        className={`flex items-center cursor-pointer space-x-2 px-4 py-1.5 rounded-xl text-sm font-bold transition-all border-2 ${
                          record.status === "Absent"
                            ? "bg-red-600 text-white border-red-600"
                            : "bg-white text-red-600 border-red-600 hover:bg-red-50"
                        }`}
                      >
                        <XCircle className="w-5 h-5" />
                        <span>Absent</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
              disabled={saving}
              className="px-8 py-3 cursor-pointer bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 flex items-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
              ) : (
                <Save className="w-5 h-5" />
              )}
              <span>
                {saving
                  ? "Finalizing Attendance..."
                  : "Confirm & Save Attendance"}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
