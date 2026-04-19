import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  User,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = "http://localhost:8000";

interface AppointmentRequest {
  id: number;
  studentName: string;
  indexNumber: string;
  requestedSlot: string;
  location: string;
  status: "Pending" | "Approved" | "Rejected";
  reason?: string;
  studentFaculty?: string;
  studentDepartment?: string;
  studentDegree?: string;
  declineReason?: string;
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<AppointmentRequest[]>([]);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [requestToDecline, setRequestToDecline] = useState<number | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem("lecturerToken");
    if (!token) return;

    try {
      setIsLoading(true);
      // 1. Get Lecturer Profile
      const profRes = await fetch(`${API_BASE}/api/lecturer/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!profRes.ok) throw new Error("Failed to fetch profile");
      const profile = await profRes.json();

      // 2. Get Appointments for this lecturer
      const appRes = await fetch(
        `${API_BASE}/api/appointments/lecturer/${profile.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (appRes.ok) {
        const data = await appRes.json();
        const mapped = data.map((app: any) => ({
          id: app.id,
          studentName: app.student_name,
          indexNumber: app.student_index,
          requestedSlot: `${app.appointment_date}, ${app.time_slot}`,
          location: "Consultation Area", // Placeholder as location isn't in appointment model yet
          status: app.status,
          reason: app.reason,
          studentFaculty: app.student_faculty,
          studentDepartment: app.student_department,
          studentDegree: app.student_degree,
          declineReason: app.decline_reason,
        }));
        setAppointments(mapped);
      }
    } catch (error) {
      console.error("App fetch error:", error);
      toast.error("Failed to load appointments.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (
    id: number,
    newStatus: "Approved" | "Rejected",
    reason?: string,
  ) => {
    const token = localStorage.getItem("lecturerToken");
    if (!token) return;

    const toastId = toast.loading(
      `${newStatus === "Approved" ? "Approving" : "Rejecting"} appointment...`,
    );
    try {
      // 2. Simulate API/Network delay (1.5 seconds)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const res = await fetch(`${API_BASE}/api/appointments/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          decline_reason: reason,
        }),
      });

      if (res.ok) {
        toast.success(`Appointment ${newStatus.toLowerCase()} successfully!`, {
          id: toastId,
        });
        // Refresh local state
        setAppointments((prev) =>
          prev.map((app) =>
            app.id === id ? { ...app, status: newStatus } : app,
          ),
        );
        return true;
      } else {
        toast.error("Failed to update status.", { id: toastId });
        return false;
      }
    } catch (error) {
      toast.error("Network error.", { id: toastId });
      return false;
    }
  };

  const confirmDecline = async () => {
    if (!requestToDecline) return;
    if (!declineReason.trim()) {
      toast.error("Please provide a reason for declining.");
      return;
    }

    const success = await updateStatus(
      requestToDecline,
      "Rejected",
      declineReason,
    );
    if (success) {
      setIsDeclineModalOpen(false);
      setDeclineReason("");
      setRequestToDecline(null);
    }
  };

  const handleApproveRequest = async (requestId: number) => {
    await updateStatus(requestId, "Approved");
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Show immediate feedback
      const refreshToast = toast.loading("Refreshing appointments...");

      // Add a small artificial delay to show the spin effect (0.8s)
      await new Promise((resolve) => setTimeout(resolve, 800));

      await fetchData();
      toast.success("List updated", { id: refreshToast });
    } catch (error) {
      toast.error("Failed to refresh list");
    } finally {
      setIsRefreshing(false);
    }
  };

  const pendingRequests = appointments.filter(
    (app) => app.status === "Pending",
  );
  const approvedAppointments = appointments.filter(
    (app) => app.status === "Approved",
  );
  const declinedRequests = appointments.filter(
    (app) => app.status === "Rejected",
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Pending Requests Section */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg shadow-sm">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              Pending Requests
              <span className="bg-yellow-100 text-yellow-800 text-sm font-bold px-3 py-1 rounded-full border border-yellow-200">
                {pendingRequests.length}
              </span>
            </h2>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-2 px-4 py-2 cursor-pointer text-sm font-bold text-gray-600 bg-white border-2 border-gray-100 rounded-xl hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <RefreshCw
              className={`w-4 h-4 transition-transform duration-500 ${
                isRefreshing ? "animate-spin" : "group-hover:rotate-180"
              }`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh List"}
          </button>
        </div>

        {pendingRequests.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 ">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Card Header (Student Info) */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                    <User className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 text-md">
                      {request.studentName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {request.indexNumber}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                      <span>{request.studentFaculty || "Faculty"}</span>
                      <span className="text-gray-300">•</span>
                      <span>{request.studentDepartment || "Department"}</span>
                      <span className="text-gray-300">•</span>
                      <span>{request.studentDegree || "Degree"}</span>
                    </div>
                  </div>
                </div>

                {/* Card Body (Time Details) */}
                <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Calendar className="w-4 h-4" />
                    <p className="text-md font-medium">
                      Requested Slot: {request.requestedSlot}
                    </p>
                  </div>
                  {request.reason && (
                    <div className="flex items-start gap-2 text-blue-600 mt-2">
                      <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
                      <p className="text-sm italic">"{request.reason}"</p>
                    </div>
                  )}
                </div>

                {/* Card Footer (Action Buttons) */}
                <div className="flex justify-end gap-3 mt-2">
                  <button
                    onClick={() => {
                      setRequestToDecline(request.id);
                      setIsDeclineModalOpen(true);
                    }}
                    className="flex items-center cursor-pointer gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-100 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Decline
                  </button>
                  <button
                    onClick={() => handleApproveRequest(request.id)}
                    className="flex items-center cursor-pointer gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 border-dashed rounded-xl p-12 text-center shadow-md">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No pending consultation requests</p>
          </div>
        )}
      </section>

      {/* Upcoming / Approved Appointments Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 rounded-lg text-green-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            Upcoming Appointments
          </h2>
        </div>

        {approvedAppointments.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {approvedAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4 shadow-md"
              >
                {/* Card Header (Student Info) */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                      <User className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {appointment.studentName}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {appointment.indexNumber}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                        <span>{appointment.studentFaculty}</span>
                        <span className="text-gray-300">•</span>
                        <span>{appointment.studentDepartment}</span>
                        <span className="text-gray-300">•</span>
                        <span>{appointment.studentDegree}</span>
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Confirmed
                  </span>
                </div>

                {/* Card Body (Time Details) */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4" />
                    <p className="text-sm font-medium">
                      {appointment.requestedSlot}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 mt-2">
                    <MapPin className="w-4 h-4" />
                    <p className="text-xs">Location: {appointment.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 border-dashed rounded-xl p-12 text-center shadow-md">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No upcoming appointments scheduled</p>
          </div>
        )}
      </section>

      {/* Declined Requests Section (History) */}
      {declinedRequests.length > 0 && (
        <div className="mt-2 border-t border-gray-100 pt-2 mb-6 ">
          <div className="flex items-center gap-4 mb-6 opacity-70">
            <div className="p-2 bg-red-100 rounded-lg text-red-600">
              <XCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-600 tracking-wide">
              Declined Requests (History)
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {declinedRequests.map((req) => (
              <div
                key={req.id}
                className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex flex-col gap-3 opacity-80 grayscale-[50%] hover:grayscale-0 hover:opacity-100 transition-all duration-300 shadow-md"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-700">{req.studentName}</p>
                    <p className="text-xs text-gray-500">{req.indexNumber}</p>

                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                      <span>{req.studentFaculty}</span>
                      <span className="text-gray-300">•</span>
                      <span>{req.studentDepartment}</span>
                      <span className="text-gray-300">•</span>
                      <span>{req.studentDegree}</span>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-600 border border-red-300">
                    <XCircle className="w-4 h-4" /> Declined
                  </span>
                </div>

                <div className="text-xs text-gray-600 space-y-1.5 pt-2 border-t border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-semibold">Slot:</span>{" "}
                    {req.requestedSlot}
                  </div>
                  {req.declineReason && (
                    <div className="mt-3 p-3 bg-red-50 border-2 border-red-200 rounded-lg text-red-800/70 italic relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-200"></div>
                      "Reason: {req.declineReason}"
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isDeclineModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{ zIndex: 2147483640 }}
            className="fixed inset-0 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm w-screen h-screen"
          >
            <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-md p-6 transform transition-all animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Decline Request
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Please provide a reason for declining this consultation.
              </p>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g., I have a faculty meeting at this time..."
                className="w-full px-4 py-3 mb-4 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none min-h-[100px] resize-none"
              />
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeclineModalOpen(false);
                    setDeclineReason("");
                  }}
                  className="px-4 py-2 cursor-pointer text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDecline}
                  className="px-4 py-2 cursor-pointer text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors shadow-sm"
                >
                  Confirm Decline
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
