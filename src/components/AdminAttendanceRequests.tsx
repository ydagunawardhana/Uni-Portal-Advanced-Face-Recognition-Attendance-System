import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import {
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  Clock,
  ChevronLeft,
  BookOpen,
  Users,
  Bell,
  Search,
  Filter,
  GraduationCap,
  RefreshCw,
  Calendar,
  AlertTriangle,
  Info,
  Book, 
} from "lucide-react";

interface AdminCorrectionRequest {
  request_id: number;
  student_id: string;
  student_name: string;
  module_code: string;
  session_id: number;
  reason_type: string;
  description: string;
  evidence_url: string | null;
  status: string;
  submitted_at: string;
  rejection_reason: string | null;
  batch: string;
  degree: string;
  department: string;
  faculty: string;
  session_date: string;
  session_time: string;
  lecturer_name: string;
}

const AdminAttendanceRequests = () => {
  const [requests, setRequests] = useState<AdminCorrectionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // New Filters
  const [selectedDegree, setSelectedDegree] = useState<string>("All Degrees");
  const [selectedBatch, setSelectedBatch] = useState<string>("All Batches");
  const [selectedDepartment, setSelectedDepartment] =
    useState<string>("All Departments");
  const [selectedFaculty, setSelectedFaculty] =
    useState<string>("All Faculties");

  // Modal State
  const [modalType, setModalType] = useState<"Approve" | "Reject" | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(
        "http://localhost:8000/api/attendance/admin/attendance-requests",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) throw new Error("Failed to fetch requests");

      const data: AdminCorrectionRequest[] = await response.json();
      setRequests(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load attendance requests.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const openModal = (requestId: number, type: "Approve" | "Reject") => {
    setActiveRequestId(requestId);
    setModalType(type);
    setRejectReason("");
  };

  const closeModal = () => {
    setModalType(null);
    setActiveRequestId(null);
    setRejectReason("");
  };

  const confirmAction = async () => {
    if (!activeRequestId || !modalType) return;

    if (modalType === "Reject" && !rejectReason.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }

    const toastId = toast.loading(`Marking as ${modalType}...`);

    try {
      const token = localStorage.getItem("adminToken");
      const endpoint = modalType === "Approve" ? "approve" : "reject";
      const method = "PUT";

      let body = undefined;
      if (modalType === "Reject") {
        body = JSON.stringify({ reason: rejectReason });
      }

      const response = await fetch(
        `http://localhost:8000/api/attendance/admin/attendance-requests/${activeRequestId}/${endpoint}`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body,
        },
      );

      if (!response.ok) {
        let errorDetail = "Failed to update status";
        try {
          const errData = await response.json();
          errorDetail = errData.detail || errorDetail;
        } catch (e) {}
        throw new Error(errorDetail);
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast.success(
        `Request ${modalType === "Approve" ? "approved" : "rejected"} successfully!`,
        {
          id: toastId,
        },
      );

      closeModal();
      fetchRequests();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update the request.", {
        id: toastId,
      });
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const matchesStudent =
        req.student_id.toLowerCase().includes(studentSearch.toLowerCase()) ||
        req.student_name.toLowerCase().includes(studentSearch.toLowerCase());
      const matchesModule = moduleFilter
        ? req.module_code === moduleFilter
        : true;
      const matchesStatus = statusFilter ? req.status === statusFilter : true;

      const matchesDegree =
        selectedDegree === "All Degrees" || req.degree === selectedDegree;
      const matchesBatch =
        selectedBatch === "All Batches" || req.batch === selectedBatch;
      const matchesDept =
        selectedDepartment === "All Departments" ||
        req.department === selectedDepartment;
      const matchesFaculty =
        selectedFaculty === "All Faculties" || req.faculty === selectedFaculty;

      return (
        matchesStudent &&
        matchesModule &&
        matchesStatus &&
        matchesDegree &&
        matchesBatch &&
        matchesDept &&
        matchesFaculty
      );
    });
  }, [
    requests,
    studentSearch,
    moduleFilter,
    statusFilter,
    selectedDegree,
    selectedBatch,
    selectedDepartment,
    selectedFaculty,
  ]);

  const uniqueModules = useMemo(() => {
    return Array.from(new Set(requests.map((r) => r.module_code))).sort();
  }, [requests]);

  const uniqueDegrees = useMemo(() => {
    return Array.from(new Set(requests.map((r) => r.degree)))
      .filter(Boolean)
      .sort();
  }, [requests]);

  const uniqueBatches = useMemo(() => {
    return Array.from(new Set(requests.map((r) => r.batch)))
      .filter(Boolean)
      .sort();
  }, [requests]);

  const uniqueDepartments = useMemo(() => {
    return Array.from(new Set(requests.map((r) => r.department)))
      .filter(Boolean)
      .sort();
  }, [requests]);

  const uniqueFaculties = useMemo(() => {
    return Array.from(new Set(requests.map((r) => r.faculty)))
      .filter(Boolean)
      .sort();
  }, [requests]);

  return (
    <div className="mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Attendance Correction Requests
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Review and manage attendance appeals from students across all
            modules.
          </p>
        </div>

        <button
          onClick={() => {
            toast.loading("Refreshing requests...", {
              id: "refresh-toast",
              duration: 1000,
            });
            fetchRequests();
          }}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-md text-sm font-semibold disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
        <div className="relative xl:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search student..."
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <select
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold appearance-none cursor-pointer"
          >
            <option value="All Faculties">All Faculties</option>
            {uniqueFaculties.map((f, i) => (
              <option key={i} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold appearance-none cursor-pointer"
          >
            <option value="All Departments">All Departments</option>
            {uniqueDepartments.map((d, i) => (
              <option key={i} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <select
            value={selectedDegree}
            onChange={(e) => setSelectedDegree(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold appearance-none cursor-pointer"
          >
            <option value="All Degrees">All Degrees</option>
            {uniqueDegrees.map((d, i) => (
              <option key={i} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold appearance-none cursor-pointer"
          >
            <option value="All Batches">All Batches</option>
            {uniqueBatches.map((b, i) => (
              <option key={i} value={b}>
                Batch {b}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Book className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold appearance-none cursor-pointer"
          >
            <option value="">All Modules</option>
            {uniqueModules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Info className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold appearance-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200 text-gray-700 text-sm font-bold tracking-wider">
                <th className="p-4">Student</th>
                <th className="p-4">Module/Degree</th>
                <th className="p-4">Session Details</th>
                <th className="p-4">Date Submitted</th>
                <th className="p-4">Reason & Description</th>
                <th className="p-4 text-center">Evidence</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    Loading requests...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No requests found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr
                    key={req.request_id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-sm">
                          {req.student_name}
                        </span>
                        <span className="text-sm text-gray-500 font-medium">
                          {req.student_id}  •  Batch: {req.batch}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col-2 gap-3 items-center">
                        <span className="font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-xl rounded-md text-sm w-max mb-1">
                          {req.module_code}
                        </span>
                        <span
                          className="text-sm text-gray-400 font-bold truncate max-w-[150px]"
                          title={req.degree}
                        >
                          {req.degree}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800 text-sm">
                          {req.session_date}
                        </span>
                        <span className="text-sm text-gray-500 font-medium mb-0.5">
                          {req.session_time}
                        </span>
                        <span className="text-sm text-gray-600 font-bold flex items-center gap-1">
                          Lecturer: {req.lecturer_name}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-bold text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-green-600" />
                        {new Date(req.submitted_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4 max-w-xs">
                      <div className="text-sm font-bold text-red-600 mb-1">
                        {req.reason_type}
                      </div>
                      <p
                        className="text-xs font-semibold text-gray-600 italic line-clamp-2"
                        title={req.description}
                      >
                        {req.description}
                      </p>
                    </td>
                    <td className="p-4 text-center">
                      {req.evidence_url ? (
                        <a
                          href={
                            req.evidence_url.startsWith("http")
                              ? req.evidence_url
                              : `http://localhost:8000${req.evidence_url.startsWith("/") ? "" : "/"}${req.evidence_url}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold border-2 border-blue-200 hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="w-5 h-5" /> View
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-sm font-bold ${
                          req.status === "Pending"
                            ? "bg-yellow-100 text-yellow-700 border-2 border-yellow-200 animate-pulse"
                            : req.status === "Approved"
                              ? "bg-green-100 border-2 border-green-200 text-green-700"
                              : "bg-red-100 border-2 border-red-200 text-red-700"
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {req.status === "Pending" ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openModal(req.request_id, "Approve")}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded-full transition-colors cursor-pointer"
                            title="Approve"
                          >
                            <CheckCircle className="w-6 h-6" />
                          </button>
                          <button
                            onClick={() => openModal(req.request_id, "Reject")}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                            title="Reject"
                          >
                            <XCircle className="w-6 h-6" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-gray-400 italic">
                          Processed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALS --- */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${modalType === "Approve" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
                >
                  {modalType === "Approve" ? (
                    <CheckCircle className="w-7 h-7" />
                  ) : (
                    <AlertTriangle className="w-7 h-7" />
                  )}
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {modalType === "Approve"
                    ? "Approve Correction?"
                    : "Reject Correction?"}
                </h3>
              </div>

              <p className="text-sm text-gray-600 mb-6 font-medium">
                {modalType === "Approve"
                  ? "Are you sure you want to approve this request? The student's attendance record for this session will be marked as 'Present' (or 'Excused' for medical reasons)."
                  : "Are you sure you want to reject this request? You must provide a reason for the student."}
              </p>

              {modalType === "Reject" && (
                <div className="mb-6">
                  <label className="block text-md font-bold text-gray-700 mb-2">
                    Rejection Reason
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Provide details for the student..."
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none h-24 resize-none font-semibold"
                  />
                </div>
              )}

              <div
                className={`p-4 mb-6 rounded-xl border-l-4 border-2 ${modalType === "Approve" ? "bg-blue-50 border-blue-200" : "bg-red-100 border-red-300"}`}
              >
                <p
                  className={`text-xs leading-relaxed font-semibold ${modalType === "Approve" ? "text-blue-800" : "text-red-700"}`}
                >
                  <strong className="font-bold flex items-center gap-1 mb-1 text-sm">
                    <Info className="w-5 h-5" /> Important Note:
                  </strong>
                  {modalType === "Approve"
                    ? "Approving this request will automatically update the student's main attendance record to 'Present/Excused'. This action is final."
                    : "This action cannot be undone. The student will be notified of this rejection along with the reason you provided."}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-md font-bold border-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  className={`px-4 py-2 text-md font-bold text-white rounded-xl transition-colors shadow-lg cursor-pointer ${
                    modalType === "Approve"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  Confirm {modalType}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendanceRequests;
