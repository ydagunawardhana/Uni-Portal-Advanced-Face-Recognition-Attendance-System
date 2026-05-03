import { useState, useEffect, useRef } from "react";
import {
  Users,
  Search,
  RefreshCw,
  UserPlus,
  Calendar,
  Mail,
  Phone,
  ArrowRight,
  Clock,
  AlertTriangle,
  GraduationCap,
  XCircle,
  Loader2,
} from "lucide-react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";

const API_BASE = "http://localhost:8000";

interface PreRegistration {
  id: number;
  name: string;
  personal_email: string;
  mobile: string;
  nic_number: string;
  gender: string;
  faculty: string;
  department: string;
  degree_program: string;
  intake: string;
  created_at: string;
}

interface PendingRegistrationsProps {
  onProcess: (data: PreRegistration) => void;
}

// Reject Modal 
interface RejectModalProps {
  student: PreRegistration | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

function RejectModal({ student, onClose, onConfirm }: RejectModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (student) {
      setReason("");
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [student]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isSubmitting, onClose]);

  if (!student) return null;

  const handleConfirm = async () => {
    if (!reason.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = reason.trim().length >= 5 && !isSubmitting;

  return createPortal(
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) onClose(); }}
    >
      {/* Modal Box */}
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-modal-title"
      >
        {/* Header */}
        <div className="bg-red-50 border-b border-red-100 px-6 py-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2
              id="reject-modal-title"
              className="text-lg font-bold text-gray-900"
            >
              Reject Student Registration
            </h2>
            <p className="text-sm text-red-600 font-medium mt-0.5">
              This action is permanent and cannot be reversed.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Student summary pill */}
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-300 rounded-xl px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm shrink-0">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">
                {student.name}
              </p>
              <p className="text-gray-500 text-sm truncate">
                {student.personal_email}
              </p>
            </div>
          </div>

          {/* Warning message */}
          <p className="text-gray-600 text-sm">
            Are you sure you want to reject this registration? The applicant
            will be notified and their application will be permanently removed
            from the queue.
          </p>

          {/* Reason textarea */}
          <div>
            <label
              htmlFor="rejection-reason"
              className="block text-sm font-bold text-gray-700 mb-1.5"
            >
              Reason for Rejection{" "}
              <span className="text-red-500">*</span>
            </label>
            <textarea
              id="rejection-reason"
              ref={textareaRef}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. Incomplete documentation, duplicate application, incorrect programme selected…"
              rows={4}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 resize-none transition-all disabled:opacity-60 disabled:bg-gray-50"
            />
            <p
              className={`text-xs mt-1.5 font-bold transition-colors ${
                reason.trim().length === 0
                  ? "text-gray-400"
                  : reason.trim().length < 5
                  ? "text-amber-500"
                  : "text-green-600"
              }`}
            >
              {reason.trim().length === 0
                ? "A reason is required to proceed."
                : reason.trim().length < 5
                ? "Please provide a more descriptive reason."
                : `${reason.trim().length} characters — looks good.`}
            </p>
          </div>
        </div>

        {/* Footer — Action Buttons */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-100 transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="px-6 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 shadow-lg shadow-red-200 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Rejecting…
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5" />
                Confirm Rejection
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Main Component 
export default function PendingRegistrations({
  onProcess,
}: PendingRegistrationsProps) {
  const [data, setData] = useState<PreRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Rejection modal state
  const [rejectTarget, setRejectTarget] = useState<PreRegistration | null>(null);

  const getToken = () => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      toast.error("Authentication required. Please log in as Admin.");
      return null;
    }
    return token;
  };

  const fetchData = async () => {
    setLoading(true);
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/pre-registrations`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else if (res.status === 401) {
        toast.error("Session expired. Please log in again.");
      } else if (res.status === 403) {
        toast.error("Not authorized to view pre-registrations.");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || "Failed to load the registration queue.");
      }
    } catch {
      toast.error("Network error. Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  // Called by RejectModal when admin confirms
  const handleConfirmReject = async (reason: string) => {
    if (!rejectTarget) return;
    const { id, name } = rejectTarget;
    const token = getToken();
    if (!token) return;

    // Show loading toast immediately
    const loadingToast = toast.loading("Rejecting application and sending email...");

    try {
      const res = await fetch(`${API_BASE}/api/admin/pre-registrations/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Rejection-Reason": reason,
        },
      });

      const result = await res.json().catch(() => ({}));

      if (res.ok) {
        toast.success("Student rejected and email sent successfully!", { id: loadingToast });
        setData((prev) => prev.filter((item) => item.id !== id));
        setRejectTarget(null);
      } else {
        toast.error(result.detail || "Failed to reject application.", { id: loadingToast });
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error. Could not complete the action.", { id: loadingToast });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = data.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.personal_email.toLowerCase().includes(search.toLowerCase()) ||
      item.nic_number.toLowerCase().includes(search.toLowerCase()),
  );

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Rejection Modal (portal) */}
      <RejectModal
        student={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleConfirmReject}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-blue-600" />
            Pre-Registration Queue
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Review and process student applications submitted via the public
            portal.
          </p>
        </div>

        {/* Search Bar + Refresh grouped together */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={17}
            />
            <input
              type="text"
              placeholder="Search name, email or NIC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm text-sm w-72"
            />
          </div>
          <button
            onClick={fetchData}
            className="p-2.5 text-gray-400 cursor-pointer hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-gray-200 bg-white shadow-sm"
            title="Refresh Queue"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-300 overflow-hidden">
        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-24 text-center">
              <RefreshCw className="w-10 h-10 text-blue-200 animate-spin mx-auto mb-4" />
              <p className="text-gray-400 font-medium tracking-wide text-sm">
                Gathering applications...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center mb-5">
              <div className="w-20 h-20 bg-gray-100 animate-pulse text-gray-500 border rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertTriangle size={38} />
              </div>
              <p className="text-gray-600 font-bold text-lg">Queue is Empty</p>
              <p className="text-gray-500 text-sm max-w-xs mx-auto mt-2 font-semibold">
                {search
                  ? "No results match your search."
                  : "No pending applications found."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left table-fixed">
              <colgroup>
                <col className="w-[34%]" />
                <col className="w-[30%]" />
                <col className="w-[18%]" />
                <col className="w-[18%]" />
              </colgroup>
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm font-bold tracking-wider border-b border-gray-100">
                  <th className="px-6 py-4">Student Information</th>
                  <th className="px-6 py-4">Academic Details</th>
                  <th className="px-6 py-4">
                    <span className="flex items-center px-10 gap-2">
                      <Calendar size={13} />
                      Applied Date
                    </span>
                  </th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-blue-50/20 transition-colors group"
                  >
                    {/* Student Info */}
                    <td className="px-6 py-5 align-top">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 capitalize text-base">
                          {item.name}
                        </span>
                        <div className="flex flex-col gap-1 mt-1.5">
                          <span className="text-sm font-medium text-blue-700 flex items-center gap-1.5 truncate">
                            <Mail
                              size={12}
                              className="text-gray-500 shrink-0"
                            />
                            {item.personal_email}
                          </span>
                          {item.mobile && (
                            <span className="text-sm text-gray-500 flex items-center gap-1.5">
                              <Phone
                                size={12}
                                className="text-gray-500 shrink-0"
                              />
                              {item.mobile}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Academic Details */}
                    <td className="px-6 py-5 align-top">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-medium text-gray-800 text-sm flex items-center gap-1.5">
                          <GraduationCap
                            size={15}
                            className="text-indigo-500 shrink-0"
                          />
                          <span className="truncate">{item.faculty}</span>
                        </span>
                        <span className="text-gray-500 font-semibold text-xs leading-tight line-clamp-2">
                          {item.degree_program}
                        </span>
                        {item.intake && (
                          <span className="flex items-left py-0.5 rounded-full text-sm font-bold text-blue-700 mt-0.5">
                            Batch: {item.intake}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-5 align-top">
                      <div className="flex items-center gap-2 font-semibold text-sm text-gray-500 pt-0.5">
                        <Clock size={15} className="text-gray-500 shrink-0" />
                        {formatDate(item.created_at)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-5 align-top">
                      <div className="flex items-center gap-6 justify-center">
                        {/* Reject — opens professional modal */}
                        <button
                          onClick={() => setRejectTarget(item)}
                          className="flex items-center cursor-pointer gap-1.5 px-3 py-2 text-red-600 bg-white border-2 border-red-200 hover:bg-red-50 rounded-xl font-medium text-sm transition-colors"
                          title="Reject Application"
                        >
                          <XCircle size={15} />
                          Reject
                        </button>

                        {/* Enroll */}
                        <button
                          onClick={() => onProcess(item)}
                          className="inline-flex cursor-pointer items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl border-2 hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20 active:scale-95"
                        >
                          <UserPlus size={14} />
                          Enroll
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {!loading && data.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
              {filtered.length} Application{filtered.length !== 1 ? "s" : ""}
              {search &&
                data.length !== filtered.length &&
                ` (filtered from ${data.length})`}
            </span>
            <span className="text-xs text-gray-400">
              Last refreshed just now
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
