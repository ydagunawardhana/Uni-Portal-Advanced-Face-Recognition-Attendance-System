import React, { useState, useEffect } from "react";
import {
  User,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  MessageSquare,
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
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<AppointmentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const updateStatus = async (id: number, newStatus: "Approved" | "Rejected") => {
    const token = localStorage.getItem("lecturerToken");
    if (!token) return;

    const toastId = toast.loading(`${newStatus === 'Approved' ? 'Approving' : 'Rejecting'} appointment...`);
    try {
      const res = await fetch(`${API_BASE}/api/appointments/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success(`Appointment ${newStatus.toLowerCase()} successfully!`, { id: toastId });
        // Refresh local state
        setAppointments((prev) =>
          prev.map((app) =>
            app.id === id ? { ...app, status: newStatus } : app
          )
        );
      } else {
        toast.error("Failed to update status.", { id: toastId });
      }
    } catch (error) {
      toast.error("Network error.", { id: toastId });
    }
  };

  const pendingRequests = appointments.filter((app) => app.status === "Pending");
  const approvedAppointments = appointments.filter(
    (app) => app.status === "Approved",
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
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600">
            <Clock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Pending Requests</h2>
          <span className="bg-yellow-100 text-black text-md font-bold px-2.5 py-0.5 rounded-full">
            {pendingRequests.length}
          </span>
        </div>

        {pendingRequests.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 ">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Card Header (Student Info) */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {request.studentName}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {request.indexNumber}
                    </p>
                  </div>
                </div>

                {/* Card Body (Time Details) */}
                <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Calendar className="w-4 h-4" />
                    <p className="text-sm font-medium">
                      Requested Slot: {request.requestedSlot}
                    </p>
                  </div>
                  {request.reason && (
                    <div className="flex items-start gap-2 text-blue-600 mt-2">
                      <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
                      <p className="text-xs italic">"{request.reason}"</p>
                    </div>
                  )}
                </div>

                {/* Card Footer (Action Buttons) */}
                <div className="flex justify-end gap-3 mt-2">
                  <button
                    onClick={() => updateStatus(request.id, "Rejected")}
                    className="flex items-center cursor-pointer gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Decline
                  </button>
                  <button
                    onClick={() => updateStatus(request.id, "Approved")}
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
                className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4 shadow-sm"
              >
                {/* Card Header (Student Info) */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {appointment.studentName}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {appointment.indexNumber}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
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
                  <div className="flex items-center gap-2 text-gray-500 mt-1">
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
    </div>
  );
}
