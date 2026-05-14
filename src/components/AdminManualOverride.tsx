import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = "http://localhost:8000";

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

export default function AdminManualOverride() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [edits, setEdits] = useState<
    Record<number, { status: string; reason: string }>
  >({});

  // Helper function to get initials from a name
  const getInitials = (name?: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const loadData = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    setEdits({});

    try {
      const adminToken = localStorage.getItem("adminToken");
      if (!adminToken) {
        toast.error("You must be logged in as an admin");
        navigate("/admin-login");
        return;
      }

      // 1. Fetch Session List to find the specific session details
      const sessionsRes = await fetch(
        `${API_BASE}/api/lecturer/recent-sessions`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        },
      );

      if (!sessionsRes.ok) throw new Error("Failed to load session details");
      const sessions = await sessionsRes.json();
      const session = sessions.find((s: any) => s.id === parseInt(sessionId));

      if (!session) {
        setSessionDetails({
          module_name: "Session Details Unavailable",
          module_code: "N/A",
          batch: "N/A",
          date: "N/A",
          lecturer: "N/A",
        });
        toast.error("Could not retrieve full session metadata.");
      } else {
        setSessionDetails(session);
      }

      // 2. Load Student List for this session
      if (session) {
        const apiUrl = `${API_BASE}/api/lecturer/attendance/${encodeURIComponent(session.module_code)}?date=${encodeURIComponent(session.date)}&batch=${encodeURIComponent(session.batch)}&session_id=${sessionId}`;

        const res = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${adminToken}` },
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
      } else {
        toast.error("Insufficient session data to load attendance list.");
      }
    } catch (error) {
      console.error("Load data error:", error);
      toast.error("Failed to load session data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sessionId]);

  const handleStatusChange = (studentId: number, newStatus: string) => {
    setEdits((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status: newStatus,
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

  const handleSave = async () => {
    if (Object.keys(edits).length === 0) {
      toast.error("No changes to save.");
      return;
    }

    setIsSaving(true);
    const loadingToast = toast.loading("Saving manual overrides...");

    try {
      const payload = Object.keys(edits).map((studentIdStr) => {
        const studentId = parseInt(studentIdStr, 10);
        const edit = edits[studentId];
        const originalRecord = students.find((r) => r.id === studentId);

        const finalStatus = edit?.status || originalRecord?.status || "Absent";
        let finalReason =
          edit?.reason !== undefined
            ? edit.reason
            : originalRecord?.reason || "";

        if (finalStatus.toLowerCase() === "present") {
          finalReason = "Admin Override (Present)";
        } else if (!finalReason) {
          finalReason = "Admin Override (Absent)";
        }

        return {
          student_id: studentId,
          session_id: parseInt(sessionId!, 10),
          status: finalStatus,
          reason: finalReason,
        };
      });

      const adminToken = localStorage.getItem("adminToken");
      const res = await fetch(`${API_BASE}/api/attendance/manual-override`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ records: payload }),
      });

      if (!res.ok) throw new Error("Failed to save overrides");

      toast.success("Manual overrides saved successfully!", {
        id: loadingToast,
      });
      setEdits({});
      loadData(); // Refresh list
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save changes.", { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.indexNumber.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [students, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-bold">
            Initialising manual override environment...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 py-8 space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Back Button */}
      <button
        onClick={() => navigate("/admin/manual-attendances")}
        className="flex items-center cursor-pointer text-md font-semibold text-gray-600 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Sessions
      </button>

      {/* LARGE BLUE HEADER REPLICATION */}
      <div className="bg-blue-600 rounded-xl p-8 text-white shadow-xl flex justify-between items-center relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-4">
            {sessionDetails?.module_name || "Module Name"}
          </h2>
          <div className="flex items-center text-blue-100 text-sm font-bold space-x-8">
            <span className="bg-blue-700 px-3 py-0.5 rounded-xl border-2 border-white">
              {sessionDetails?.module_code}
            </span>
            <span className="flex items-center">
              <Users className="w-5 h-5 mr-2" /> Batch {sessionDetails?.batch}
            </span>
            <span className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" /> {sessionDetails?.date}
            </span>
            <span className="flex items-center">
              <User className="w-5 h-5 mr-2" />{" "}
              {sessionDetails?.lecturer ||
                sessionDetails?.lecturer_name ||
                "Unknown Lecturer"}
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

      {/* TOOLBAR & TABLE REPLICATION */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
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
              <span className="text-blue-700">{filteredStudents.length}</span>{" "}
              students
            </div>

            <div className="flex items-center gap-2 pl-4 ml-2">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                Global Action :
              </span>
              <button
                onClick={() => {
                  filteredStudents.forEach((s) =>
                    handleStatusChange(s.id, "Present"),
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
                className="flex items-center px-5 py-2 bg-blue-600 cursor-pointer hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50"
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
                <th className="px-6 py-4 text-sm font-black text-gray-500 tracking-widest">
                  Student
                </th>
                <th className="px-6 py-4 text-sm font-black text-gray-500 tracking-widest">
                  Current Logs
                </th>
                <th className="px-6 py-4 text-sm font-black text-gray-500 tracking-widest text-center">
                  Original Status
                </th>
                <th className="px-6 py-4 text-sm font-black text-gray-500 tracking-widest text-center">
                  Status Override
                </th>
                <th className="px-6 py-4 text-sm font-black text-gray-500 tracking-widest">
                  Reason / Justification
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredStudents.length === 0 ? (
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
                                ? "bg-green-600 text-white border-2 border-green-600 shadow-md"
                                : "bg-green-100 text-green-600 border-2 border-green-200 hover:border-green-400"
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
                                ? "bg-red-600 text-white border-2 border-red-600 shadow-md"
                                : "bg-red-100 text-red-600 border-2 border-red-200 hover:border-red-400"
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {currentStatus === "present" ? (
                          <span className="text-gray-400 font-semibold text-sm italic">
                            N/A - No Override Needed
                          </span>
                        ) : (
                          <span className="inline-block bg-red-100 text-red-600 text-sm font-bold px-2.5 py-1 rounded-xl border border-red-100">
                            {edits[record.id] &&
                            record.status?.toLowerCase() === "present"
                              ? "Manual Override (Absent)"
                              : record.reason || "Absent - No Reason Provided"}
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
              className={`w-3 h-3 rounded-full ${Object.keys(edits).length > 0 ? "bg-red-500 animate-pulse" : "bg-gray-400"}`}
            />
            {Object.keys(edits).length} pending changes to be saved
          </div>
        </div>
      </div>
    </div>
  );
}
