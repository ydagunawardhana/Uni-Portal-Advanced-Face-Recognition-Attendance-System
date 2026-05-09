import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FileText,
  Upload,
  UploadCloud,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

// Props Interface
interface AttendanceCorrectionRequestProps {
  onLogout: () => void;
  onNavigate: (screen: any) => void;
}

export default function AttendanceCorrectionRequest({
  onLogout,
  onNavigate,
}: AttendanceCorrectionRequestProps) {
  const location = useLocation();
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [reasonType, setReasonType] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [pastRequests, setPastRequests] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  // Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<number | null>(null);

  // Filter state
  const [timeFilter, setTimeFilter] = useState<"week" | "all">("week");

  // Auto-select session when navigated from My Attendance with a prefilledSessionId
  useEffect(() => {
    const prefilled = location.state?.prefilledSessionId;
    if (prefilled) {
      setSessionId(prefilled.toString());
      // Switch to 'all' so the pre-selected session is visible regardless of date
      setTimeFilter("all");
    }
  }, [location.state]);

  // Compute filtered and sorted sessions
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];

    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);
    lastWeek.setHours(0, 0, 0, 0); // Start of 7 days ago

    return sessions
      .filter((session) => {
        // Assume session.date is 'YYYY-MM-DD'
        const sessionDate = new Date(session.date);

        // 1. Exclude future sessions completely
        if (sessionDate > today) return false;

        // 2. Apply time filter
        if (timeFilter === "week") {
          return sessionDate >= lastWeek;
        }

        return true; // 'all' past sessions
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort Newest to Oldest
  }, [sessions, timeFilter]);

  // Fetch student's sessions on mount
  useEffect(() => {
    fetchSessions();
    fetchHistory();
  }, []);

  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const studentToken = localStorage.getItem("studentToken");
      const res = await fetch("http://localhost:8000/api/student/timetable", {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error("Fetch sessions error:", err);
      toast.error("Could not load your class history.");
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const fetchHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const studentToken = localStorage.getItem("studentToken");

      const res = await fetch(
        "http://localhost:8000/api/attendance/student/requests",
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        },
      );
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      setPastRequests(data);
    } catch (err) {
      console.error("Fetch history error:", err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionId || !reasonType || !description.trim() || !evidenceFile) {
      toast.error(
        "Please fill in all required fields and upload the evidence document.",
      );
      return;
    }

    // --- NEW VALIDATION: Check for existing requests ---
    const existingRequests = pastRequests.filter(
      (req) => req.session_id.toString() === sessionId.toString(),
    );

    if (existingRequests.length > 0) {
      // Assuming history is sorted newest first
      const latestRequest = existingRequests[0];

      if (latestRequest.status === "Pending") {
        toast.error(
          "You already have a Pending request for this session. Please wait for the lecturer to review it.",
          {
            duration: 5000,
          },
        );
        return;
      }

      if (latestRequest.status === "Approved") {
        toast.error(
          "Your attendance for this session has already been Approved. You cannot submit another request.",
          {
            duration: 5000,
          },
        );
        return;
      }
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Submitting your request...");

    try {
      const studentToken = localStorage.getItem("studentToken");

      // Construct FormData for file upload
      const formData = new FormData();
      formData.append("session_id", sessionId);
      formData.append("reason_type", reasonType);
      formData.append("description", description);
      if (evidenceFile) {
        formData.append("evidence", evidenceFile);
      }

      const response = await fetch(
        "http://localhost:8000/api/attendance/student/requests",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${studentToken}`,
            // Do NOT set Content-Type; let the browser handle it for FormData
          },
          body: formData,
        },
      );

      if (!response.ok) throw new Error("Failed to submit");

      // ARTIFICIAL DELAY: Wait for 3 seconds to show the loading toast nicely
      await new Promise((resolve) => setTimeout(resolve, 3000));

      toast.success("Correction request submitted successfully!", {
        id: toastId,
        duration: 3000,
      });

      // Reset form
      setReasonType("");
      setDescription("");
      setSessionId("");
      setEvidenceFile(null);

      // Refresh history
      fetchHistory();
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit request.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file format. Only PNG, JPG, and PDF are allowed.");
      e.target.value = ""; // Reset input
      setEvidenceFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      toast.error("File is too large. Maximum size is 5MB.");
      e.target.value = "";
      setEvidenceFile(null);
      return;
    }

    setEvidenceFile(file);
    toast.success("File attached successfully!");
  };

  const handleDeleteClick = (requestId: number) => {
    setRequestToDelete(requestId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!requestToDelete) return;

    const toastId = toast.loading("Deleting request...");
    try {
      const token = localStorage.getItem("studentToken");
      const response = await fetch(
        `http://localhost:8000/api/attendance/student/requests/${requestToDelete}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) throw new Error("Failed to delete request");

      toast.success("Request deleted successfully", { id: toastId });
      fetchHistory();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete request.", {
        id: toastId,
      });
    } finally {
      setDeleteModalOpen(false);
      setRequestToDelete(null);
    }
  };

  return (
    <div className="p-8 bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-8 h-8 text-red-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Request Attendance Correction
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Submit a request to correct your attendance records
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side - Request Form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Submit New Request
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Session Selection */}
              <div>
                <div className="flex justify-between items-end mb-3">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Select Class Session <span className="text-red-600">*</span>
                  </label>

                  <div className="flex bg-red-100 dark:bg-red-900/30 rounded-full p-1 border-2 border-red-100">
                    <button
                      type="button"
                      onClick={() => setTimeFilter("week")}
                      className={`px-4 py-1 text-sm font-bold rounded-xl transition-all cursor-pointer ${
                        timeFilter === "week"
                          ? "bg-white dark:bg-gray-800 shadow-sm text-red-600"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      Last 7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeFilter("all")}
                      className={`px-4 py-1 text-sm font-bold rounded-xl transition-all cursor-pointer ${
                        timeFilter === "all"
                          ? "bg-white dark:bg-gray-800 shadow-sm text-red-600"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      All Past
                    </button>
                  </div>
                </div>
                <select
                  aria-label="Select Session"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 cursor-pointer rounded-xl font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring focus:ring-red-500 focus:border-red-500 transition-all"
                  required
                >
                  <option value="">
                    {isLoadingSessions
                      ? "Loading sessions..."
                      : "Choose a session..."}
                  </option>
                  {filteredSessions.length > 0 ? (
                    filteredSessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.date} - {s.module_name || s.module_code} (
                        {s.start_time}) {s.lecturer ? `- ${s.lecturer}` : ""}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      No past sessions found in this timeframe
                    </option>
                  )}
                </select>
              </div>

              {/* Reason Dropdown */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Reason for Correction <span className="text-red-600">*</span>
                </label>
                <select
                  aria-label="Select Reason"
                  value={reasonType}
                  onChange={(e) => setReasonType(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 cursor-pointer rounded-xl font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring focus:ring-red-500 focus:border-red-500 transition-all"
                  required
                >
                  <option value="">Select a reason...</option>
                  <option value="System technical error">
                    System technical error
                  </option>
                  <option value="Medical / Sick Leave">
                    Medical / Sick Leave
                  </option>
                  <option value="Forgot to scan out">Forgot to scan out</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Description Text Area */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Description <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Please explain the issue in detail..."
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
                  required
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Upload Evidence <span className="text-red-500">*</span>
                </label>

                {evidenceFile ? (
                  /* --- SELECTED FILE STATE (Green Card) --- */
                  <div className="relative w-full rounded-xl border-2 border-dashed border-gray-500 bg-green-50 dark:bg-green-900/20 p-10 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200">
                    <button
                      type="button"
                      onClick={() => setEvidenceFile(null)}
                      className="absolute top-4 right-4 w-8 h-8 font-bold flex items-center justify-center cursor-pointer rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-100 dark:bg-red-900/30 hover:text-red-600 transition-colors shadow-sm cursor-pointer"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center border border-green-200 shadow-sm mb-3">
                      <FileText className="w-8 h-8 text-green-600" />
                    </div>

                    <h4 className="text-gray-900 dark:text-white font-bold text-sm md:text-base mb-2 max-w-[80%] truncate text-center">
                      {evidenceFile.name}
                    </h4>

                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-green-200 bg-white dark:bg-gray-800 text-sm font-bold text-green-700 dark:text-green-400 mb-2 shadow-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Ready to submit
                    </div>

                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {(evidenceFile.size / (1024 * 1024)).toFixed(2)} MB •{" "}
                      {evidenceFile.name.split(".").pop()?.toUpperCase()}{" "}
                      Document
                    </span>
                  </div>
                ) : (
                  /* --- EMPTY UPLOAD STATE (Dropzone) --- */
                  <div className="relative border-2 border-dashed border-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:bg-gray-50 dark:bg-gray-700 transition-colors bg-white dark:bg-gray-800">
                    <input
                      id="evidence-upload"
                      type="file"
                      accept=".png,.jpg,.jpeg,.pdf"
                      onChange={handleFileChange}
                      className="hidden" // Forces display: none
                    />

                    <label
                      htmlFor="evidence-upload"
                      className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
                    >
                      <UploadCloud className="w-12 h-12 text-gray-400 mb-3" />
                      <p className="text-md text-gray-600 dark:text-gray-400 font-medium">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        PNG, JPG, PDF up to 5MB - Required
                      </p>
                    </label>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full px-6 py-3 cursor-pointer text-white rounded-xl font-bold transition-all shadow-md ${
                  isSubmitting
                    ? "bg-red-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700 active:scale-95"
                }`}
              >
                {isSubmitting ? "Submitting Request..." : "Submit Request"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side - Past Requests */}
        <div className="lg:col-span-1">
          <div
            className="bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md p-6 flex flex-col"
            style={{ maxHeight: "calc(105vh - 180px)" }}
          >
            <div className="flex-shrink-0 mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Request History
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Your recent attendance appeals
                </p>
              </div>
              <button
                onClick={() => {
                  toast.loading("Refreshing history...", {
                    id: "refresh-history",
                    duration: 1500,
                  });
                  fetchHistory();
                }}
                disabled={isHistoryLoading}
                className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:bg-gray-700 hover:text-red-600 hover:border-red-200 transition-all shadow-sm text-sm font-semibold active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Refresh History"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isHistoryLoading ? "animate-spin text-red-600" : ""}`}
                />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 pr-4 space-y-4 custom-scrollbar">
              {pastRequests.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-red-200">
                  <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2 animate-pulse" />
                  <p className="text-gray-400 text-md font-bold ">
                    No Requests Yet
                  </p>
                </div>
              ) : (
                pastRequests.map((request) => {
                  const sessionInfo = sessions.find(
                    (s) => s.id === request.session_id,
                  );
                  return (
                    <div
                      key={request.id}
                      className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-md text-gray-900 dark:text-white">
                          {request.module_name || request.subject_name || (sessionInfo ? (sessionInfo.module_name || sessionInfo.module_code) : `Session #${request.session_id}`)}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 text-sm font-bold rounded-full ${
                              request.status === "Pending"
                                ? "bg-yellow-100 text-yellow-600 animate-pulse"
                                : request.status === "Approved"
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-600"
                                  : "bg-red-100 dark:bg-red-900/30 text-red-600"
                            }`}
                          >
                            {request.status}
                          </span>
                          {request.status === "Pending" && (
                            <button
                              onClick={() => handleDeleteClick(request.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                              title="Delete Request"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300 font-semibold">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Session Date :{" "}
                            <span className="font-bold">
                              {request.session_date || sessionInfo?.date || "N/A"}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          <span>
                            Reason :{" "}
                            <span className="font-bold">
                              {request.reason_type}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>
                            Session Time :{" "}
                            <span className="font-bold">
                              {request.session_time || (sessionInfo ? `${sessionInfo.start_time} - ${sessionInfo.end_time}` : "N/A")}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span>
                            Submitted :{" "}
                            <span className="font-bold">
                              {new Date(
                                request.submitted_at,
                              ).toLocaleDateString()}
                            </span>
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-700 dark:text-gray-300 font-semibold mt-2 pt-2 line-clamp-2 italic">
                        "{request.description}"
                      </p>

                      {/* REJECTION REASON BLOCK */}
                      {request.status === "Rejected" &&
                        request.rejection_reason && (
                          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 rounded-xl p-3 flex items-start gap-2 shadow-sm animate-in slide-in-from-top-1 duration-200">
                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-0.5">
                                Reason for Rejection:
                              </p>
                              <p className="text-xs text-red-600 leading-relaxed font-semibold italic">
                                {request.rejection_reason}
                              </p>
                            </div>
                          </div>
                        )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Delete Request?
                </h3>
              </div>

              <p className="text-gray-700 dark:text-gray-300 text-sm mb-5 pl-13">
                Are you sure you want to delete this attendance correction
                request?
              </p>

              <div className="bg-blue-50 border-2 border-blue-200 p-3 mb-6 rounded-xl">
                <p className="text-xs text-blue-800 font- bold leading-relaxed">
                  <strong className="font-bold">Important Note:</strong> This
                  action cannot be undone. If you delete this request, you will
                  need to fill out a completely new form to appeal your
                  attendance.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setRequestToDelete(null);
                  }}
                  className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
