import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../config";
import {
  Users,
  Check,
  X,
  Search,
  Loader2,
  Calendar,
  BookOpen,
  Save,
  RefreshCw,
  User,
  ArrowLeft,
  LogOut,
} from "lucide-react";
import toast from "react-hot-toast";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const API_BASE = API_BASE_URL;

interface Student {
  id: number;
  name: string;
  indexNumber: string;
  avatar: string;
  status: string;
  reason?: string;
  in_time?: string;
  out_time?: string;
}

interface CompletedSession {
  id: number;
  module_name: string;
  module_code: string;
  batch: string;
  date: string;
  time: string;
  start_time?: string;
  end_time?: string;
  status: string;
  degree: string;
  semester: string;
  level?: string;
}

const formatTime = (timeString: string | undefined) => {
  if (!timeString) return "";
  // If already formatted like "01:00 PM", return as is
  if (timeString.includes("AM") || timeString.includes("PM")) return timeString;

  try {
    // Try parsing as full date string first
    const dateObj = new Date(timeString);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }
    // Fallback for strict "HH:MM:SS" strings
    const [hour, minute] = timeString.split(":");
    const h = parseInt(hour, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const formattedHour = h % 12 || 12;
    return `${formattedHour.toString().padStart(2, "0")}:${minute} ${ampm}`;
  } catch (e) {
    return timeString; // Fallback to raw string
  }
};

export default function ManualAttendanceMarking() {
  const [completedSessions, setCompletedSessions] = useState<
    CompletedSession[]
  >([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [edits, setEdits] = useState<
    Record<number, { status: string; reason: string }>
  >({});

  // Helper function to get initials from a name (e.g., "Yashan dinusha" -> "YD")
  const getInitials = (name?: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // 1. Fetch recently completed sessions
  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const lecturerToken = localStorage.getItem("lecturerToken");
      const res = await fetch(`${API_BASE}/api/lecturer/recent-sessions`, {
        headers: { Authorization: `Bearer ${lecturerToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const data = await res.json();
      setCompletedSessions(data);
    } catch (error) {
      console.error("Fetch sessions error:", error);
      toast.error("Failed to load completed sessions.");
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // 2. Load student list for a specific session
  useEffect(() => {
    if (!selectedSessionId) {
      setStudents([]);
      setIsLoaded(false);
      return;
    }

    const loadStudents = async () => {
      setIsLoadingStudents(true);
      setEdits({}); // Clear previous edits

      const session = completedSessions.find((s) => s.id === selectedSessionId);
      if (!session) {
        setIsLoadingStudents(false);
        return;
      }

      try {
        const lecturerToken = localStorage.getItem("lecturerToken");
        // Use the specialized subject attendance endpoint
        const apiUrl = `${API_BASE}/api/lecturer/attendance/${encodeURIComponent(
          session.module_code
        )}?date=${encodeURIComponent(session.date)}&batch=${encodeURIComponent(
          session.batch
        )}&session_id=${selectedSessionId}`;

        const res = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${lecturerToken}` },
        });

        if (!res.ok) throw new Error("Failed to load students");
        const data = await res.json();

        const studentList = data.students || [];

        const transformedStudents = studentList.map((s: any) => ({
          id: s.id,
          name: s.name,
          indexNumber: s.index_number,
          avatar: s.avatar || "https://via.placeholder.com/150",
          status: s.status,
          reason: s.reason,
          in_time: s.in_time,
          out_time: s.out_time,
        }));

        setStudents(transformedStudents);
        setIsLoaded(true);
      } catch (error) {
        console.error("Load students error:", error);
        toast.error("Failed to load student list.");
      } finally {
        setIsLoadingStudents(false);
      }
    };

    loadStudents();
  }, [selectedSessionId]);

  const handleLoadStudentList = (sessionId: number) => {
    setSelectedSessionId(sessionId);
    setSearchQuery("");
  };

  // 3. Handle Status and Reason changes
  const handleStatusChange = (studentId: number, newStatus: string) => {
    setEdits((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId], // Keep existing reason if any
        status: newStatus,
        // Auto-clear reason if marked present
        reason:
          newStatus.toLowerCase() === "present"
            ? ""
            : prev[studentId]?.reason || "",
      },
    }));
  };

  const handleReasonChange = (studentId: number, newReason: string) => {
    setEdits((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        reason: newReason,
      },
    }));
  };

  // 4. Save Logic
  const handleSave = async () => {
    if (Object.keys(edits).length === 0) {
      toast.error("No changes to save.");
      return;
    }

    setIsSaving(true);
    const loadingToast = toast.loading("Saving manual overrides...");

    try {
      // 1. Construct the payload safely
      const payload = Object.keys(edits)
        .filter((key) => key !== "undefined" && key !== "NaN")
        .map((studentIdStr) => {
          const studentId = parseInt(studentIdStr, 10);
          const edit = edits[studentId];
          const originalRecord = students.find((r) => r.id === studentId);

          const finalStatus =
            edit?.status || originalRecord?.status || "Absent";
          let finalReason =
            edit?.reason !== undefined
              ? edit.reason
              : originalRecord?.reason || "";

          // If explicitly marked present manually, set a standard note
          if (finalStatus.toLowerCase() === "present") {
            finalReason = "Manual Override (Present)";
          } else if (!finalReason) {
            finalReason = "Manual Override (Absent)";
          }

          return {
            student_id: studentId,
            session_id: parseInt(String(selectedSessionId), 10),
            status: finalStatus,
            reason: finalReason,
          };
        });

      if (payload.length === 0) {
        toast.error("No valid changes to save.");
        return;
      }

      const token = localStorage.getItem("lecturerToken");
      const res = await fetch(`${API_BASE}/api/attendance/manual-override`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ records: payload }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error(
          "FastAPI Validation Error Details:",
          JSON.stringify(errorData, null, 2)
        );
        throw new Error("Failed to save overrides");
      }

      toast.success("Manual overrides saved successfully!", {
        id: loadingToast,
      });

      // Clear edits and refresh the list to reflect saved state
      setEdits({});
      if (selectedSessionId) {
        // We need a small delay or just wait for the effect to re-run
        // Actually, re-calling handleLoadStudentList is safer
        const currentId = selectedSessionId;
        setSelectedSessionId(null); // Force reset
        setTimeout(() => setSelectedSessionId(currentId), 10);
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save changes.", { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const query = searchQuery.toLowerCase();
    return (
      student.name.toLowerCase().includes(query) ||
      student.indexNumber.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex-1 px-8 py-8 space-y-8 pb-20">
      {selectedSessionId ? (
        /* Detail View (Student List) */
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-5000">
          <button
            onClick={() => {
              setSelectedSessionId(null);
              setIsLoaded(false);
            }}
            className="flex items-center mt-6 cursor-pointer text-md font-semibold text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sessions
          </button>

          <div className="bg-blue-600 rounded-xl p-8 text-white shadow-xl flex justify-between items-center relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-4">
                {completedSessions.find((s) => s.id === selectedSessionId)
                  ?.module_name || "Selected Module"}
              </h2>
              <div className="flex items-center text-blue-100 text-sm font-bold space-x-8">
                <span className="bg-blue-700 px-3 py-0.5 rounded-xl border-2 border-white">
                  {
                    completedSessions.find((s) => s.id === selectedSessionId)
                      ?.module_code
                  }
                </span>
                <span className="flex items-center">
                  <Users className="w-5 h-5 mr-2" /> Batch{" "}
                  {
                    completedSessions.find((s) => s.id === selectedSessionId)
                      ?.batch
                  }
                </span>
                <span className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />{" "}
                  {
                    completedSessions.find((s) => s.id === selectedSessionId)
                      ?.date
                  }
                </span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-1 rounded-xl border-2 border-white animate-pulse relative z-10">
              <span className="text-sm font-semibold uppercase tracking-widest">
                Manual Override Mode
              </span>
            </div>
            {/* Decorative Circle */}
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-50" />
          </div>

          <section>
            <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
              {/* Student List Toolbar and Table would be here, but we are wrapping the existing logic */}
              {/* Toolbar */}
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Filter students..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm w-64"
                    />
                  </div>
                  <div className="text-sm font-bold text-gray-500">
                    Showing{" "}
                    <span className="text-blue-700">
                      {filteredStudents.length}
                    </span>{" "}
                    students
                  </div>

                  <div className="flex items-center gap-2 pl-4 ml-2 border-gray-200">
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                      Global Action :
                    </span>
                    <button
                      onClick={() => {
                        filteredStudents.forEach((s) =>
                          handleStatusChange(s.id, "Present")
                        );
                      }}
                      className="px-2 py-1 bg-green-100 cursor-pointer text-green-700 rounded-lg text-sm font-bold border-2 border-green-100 hover:bg-green-200 transition-colors"
                    >
                      Mark All Present
                    </button>
                  </div>
                </div>

                <div>
                  {Object.keys(edits).length > 0 && (
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-end justify-end px-5 py-2 bg-blue-600 cursor-pointer hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-all shadow-md animate-in fade-in zoom-in-95 duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-5 h-5 mr-2" />
                      )}
                      Save {Object.keys(edits).length} Changes
                    </button>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-100">
                      <th className="px-6 py-4 text-sm font-black text-gray-500  tracking-widest">
                        Student
                      </th>
                      <th className="px-6 py-4 text-sm font-black text-gray-500  tracking-widest">
                        Current Logs
                      </th>
                      <th className="px-6 py-4 text-sm font-black text-gray-500  tracking-widest text-center">
                        Original Status
                      </th>
                      <th className="px-6 py-4 text-sm font-black text-gray-500  tracking-widest text-center">
                        Status Override
                      </th>
                      <th className="px-2 py-4 text-sm font-black text-gray-500  tracking-widest">
                        Reason / Justification
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {isLoadingStudents ? (
                      <tr>
                        <td colSpan={5} className="py-20 text-center">
                          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
                          <p className="mt-4 text-gray-500 font-bold">
                            Loading student records...
                          </p>
                        </td>
                      </tr>
                    ) : filteredStudents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-20 text-center text-gray-400 font-bold"
                        >
                          No students found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((record) => {
                        const currentStatus = (
                          edits[record.id]?.status || record.status
                        )?.toLowerCase();
                        const currentReason =
                          edits[record.id]?.reason ?? (record.reason || "");

                        return (
                          <tr
                            key={record.id}
                            className="hover:bg-gray-50/50 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex flex-shrink-0 items-center justify-center text-sm font-bold shadow-sm">
                                  {getInitials(record.name)}
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-gray-900">
                                    {record.name}
                                  </div>
                                  <div className="text-sm font-bold text-gray-400 uppercase">
                                    {record.indexNumber}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-6">
                                <div className="text-sm font-bold text-gray-500 flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-green-500" />
                                  IN:{" "}
                                  <span className="text-gray-900">
                                    {record.in_time || "--:--"}
                                  </span>
                                </div>
                                <div className="text-sm font-bold text-gray-500 flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-red-500" />
                                  OUT:{" "}
                                  <span className="text-gray-900">
                                    {record.out_time || "--:--"}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-xl text-sm font-bold tracking-widest ${
                                  record.status?.toLowerCase() === "present"
                                    ? "bg-green-100 text-green-600 border border-green-200"
                                    : "bg-red-100 text-red-600 border border-red-200"
                                }`}
                              >
                                {record.status || "Absent"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() =>
                                    handleStatusChange(record.id, "Present")
                                  }
                                  className={`px-3 py-0.5 rounded-xl text-sm cursor-pointer font-bold transition-all transform active:scale-95 ${
                                    currentStatus === "present"
                                      ? "bg-green-600 text-white border-2 border-green-600"
                                      : "bg-green-100 text-green-600 border-2 border-green-200 hover:border-green-400 hover:bg-green-200"
                                  }`}
                                >
                                  Present
                                </button>
                                <button
                                  onClick={() =>
                                    handleStatusChange(record.id, "Absent")
                                  }
                                  className={`px-3 py-0.5 rounded-xl text-sm cursor-pointer font-bold transition-all transform active:scale-95 ${
                                    currentStatus === "absent"
                                      ? "bg-red-600 text-white border-2 border-red-600"
                                      : "bg-red-100 text-red-600 border-2 border-red-200 hover:border-red-400 hover:text-red-600"
                                  }`}
                                >
                                  Absent
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              {currentStatus === "present" ? (
                                <span className="text-gray-400 font-semibold text-sm italic">
                                  N/A - No Override Needed
                                </span>
                              ) : (
                                <span className="inline-block bg-red-100 text-red-600 text-sm font-bold px-2.5 py-1 rounded-xl border border-red-100">
                                  {edits[record.id] &&
                                  record.status?.toLowerCase() === "present"
                                    ? "Manual Override (Absent)"
                                    : record.reason ||
                                      "Absent - No Reason Provided"}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Info */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <div className="text-sm font-bold text-gray-400 tracking-widest flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      Object.keys(edits).length > 0
                        ? "bg-red-500 animate-pulse"
                        : "bg-gray-400"
                    }`}
                  />
                  {Object.keys(edits).length} pending changes to be saved
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : (
        /* MASTER VIEW (Session Cards) */
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-8 mt-8">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-blue-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-800">
                Recent Completed Sessions
              </h2>
            </div>

            <button
              onClick={fetchSessions}
              className="flex items-center px-4 py-2 cursor-pointer text-sm font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:bg-gray-100 hover:border-blue-400 transition-all shadow-sm active:scale-95"
            >
              <RefreshCw className="w-4 h-4 mr-2 text-gray-500" />
              Refresh
            </button>
          </div>

          {isLoadingSessions ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            </div>
          ) : completedSessions.length === 0 ? (
            <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-10 text-center">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                No sessions found
              </h3>
              <p className="text-gray-500 font-medium">
                There are no completed attendance sessions available for your
                modules.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {completedSessions.map((session, index) => (
                <div
                  key={`${session.id}-${index}`}
                  onClick={() => handleLoadStudentList(session.id)}
                  className="p-6 rounded-3xl border-2 border-gray-200 bg-white rounded-xl shadow-md transition-all duration-300 transform cursor-pointer hover:border-blue-400 hover:shadow-lg hover:-translate-y-1 group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="px-3 py-0.5 bg-green-100 text-green-600 text-sm font-bold rounded-lg uppercase ">
                      {session.status}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {/* Render standardized date */}
                        {session.date && session.date !== "N/A"
                          ? new Date(session.date)
                              .toLocaleDateString("en-GB", {
                                year: "numeric",
                                month: "short",
                                day: "2-digit",
                              })
                              .replace(/ /g, "-")
                          : "Date N/A"}
                      </div>
                      <div className="text-xs font-semibold text-gray-500 mt-1">
                        {/* Strictly render start_time and end_time sent from the backend */}
                        {session.start_time && session.end_time
                          ? `${session.start_time} - ${session.end_time}`
                          : session.start_time || "Time N/A"}
                      </div>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 leading-tight mb-4">
                    {session.module_name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-400">
                    <span className="px-2.5 py-0.5 bg-blue-600 text-white rounded-xl">
                      {session.module_code}
                    </span>

                    <span>
                      Batch{" "}
                      <span className="text-gray-800 text">
                        {session.batch}
                      </span>
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 font-bold mt-2">
                    {session.degree} <span className="text-gray-400">|</span>{" "}
                    {session.semester || session.level}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
