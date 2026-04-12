import React, { useState, useEffect } from "react";
import {
  Search,
  User,
  Clock,
  MapPin,
  Send,
  HelpCircle,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = "http://localhost:8000";

interface OfficeHour {
  id: number | string;
  day: string;
  startTime: string;
  endTime: string;
  location: string;
}

interface Lecturer {
  id: number;
  name: string;
  department: string;
  email: string;
  profile_picture?: string;
  office_hours: OfficeHour[];
}

export default function BookConsultations() {
  const [searchQuery, setSearchQuery] = useState("");
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [selectedLecturer, setSelectedLecturer] = useState<Lecturer | null>(
    null,
  );
  const [selectedSlot, setSelectedSlot] = useState<OfficeHour | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [studentId, setStudentId] = useState<number | null>(null);

  // Mocks removed to use real DB data

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("studentToken");
      if (!token) return;

      try {
        // Fetch Lecturer List
        const lectRes = await fetch(`${API_BASE}/api/lecturer/list`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (lectRes.ok) {
          const data = await lectRes.json();
          const mappedLecturers = data.map((l: any) => {
            let parsedHours = [];
            try {
              if (l.office_hours) {
                parsedHours =
                  typeof l.office_hours === "string"
                    ? JSON.parse(l.office_hours)
                    : l.office_hours;
              }
            } catch (e) {
              console.error("Parse error for", l.name, e);
              parsedHours = [];
            }
            return {
              ...l,
              office_hours: Array.isArray(parsedHours) ? parsedHours : [],
            };
          });
          setLecturers(mappedLecturers);
        }

        // Fetch Student Profile to get ID
        const profileRes = await fetch(`${API_BASE}/api/student/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (profileRes.ok) {
          const data = await profileRes.json();
          setStudentId(data.id);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("Failed to load lecturer directory.");
      }
    };

    fetchData();
  }, []);

  const filteredLecturers = lecturers.filter(
    (l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.department.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSendRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // 1. Validation
    if (!selectedSlot) {
      toast.error("Please select an available time slot.");
      return;
    }
    if (!reason || reason.trim() === "") {
      toast.error("Please enter a reason for the consultation.");
      return;
    }
    if (!studentId || !selectedLecturer) {
      toast.error("System error: Missing student or lecturer context.");
      return;
    }

    // 2. Loading State
    setIsSubmitting(true);
    const toastId = toast.loading("Sending request...");
    const token = localStorage.getItem("studentToken");

    try {
      // Optional: keep a slight delay for better UX as requested
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response = await fetch(`${API_BASE}/api/appointments/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          student_id: studentId,
          lecturer_id: selectedLecturer.id,
          appointment_date: selectedSlot.day,
          time_slot: `${selectedSlot.startTime} - ${selectedSlot.endTime}`,
          reason: reason,
        }),
      });

      if (response.ok) {
        toast.success("Appointment request sent successfully!", { id: toastId });
        setReason(""); // Clear form
        setSelectedSlot(null); // Clear selection
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 3000);
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || "Failed to book appointment.", { id: toastId });
      }
    } catch (error) {
      console.error("Booking failed:", error);
      toast.error("Failed to send request. Please try again.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col mx-4 pb-12">
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Lecturer Directory */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm lg:col-span-1 flex flex-col h-[600px]">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Lecturer Directory
          </h2>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search lecturers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-gray-200">
            {filteredLecturers.length > 0 ? (
              filteredLecturers.map((lecturer) => (
                <button
                  key={lecturer.id}
                  onClick={() => {
                    setSelectedLecturer(lecturer);
                    setSelectedSlot(null);
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                    selectedLecturer?.id === lecturer.id
                      ? "bg-red-50 border-red-300 ring-1 ring-red-300 shadow-sm"
                      : "border-gray-100 hover:bg-gray-50 hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedLecturer?.id === lecturer.id
                          ? "bg-red-600 text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 leading-tight">
                        {lecturer.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {lecturer.department}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-10">
                <p className="text-sm text-gray-500">No lecturers found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Booking Form */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm lg:col-span-2 h-[670px] flex flex-col">
            {!selectedLecturer ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600 mb-4 animate-pulse">
                  <HelpCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Select a Lecturer
                </h3>
                <p className="text-gray-500 mt-2 max-w-xs">
                  Please select a lecturer from the directory on the left to view
                  their availability and book a session.
                </p>
              </div>
            ) : (
              <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Lecturer Info Header */}
                <div className="flex justify-between items-start border-b border-gray-100 pb-6 mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {selectedLecturer.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <span>{selectedLecturer.department}</span>
                      <span>•</span>
                      <span className="text-red-600 font-medium">
                        {selectedLecturer.email}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Office Hours Selection */}
                <div className="mb-8 overflow-y-auto max-h-[300px] pr-2 scrollbar-thin scrollbar-thumb-gray-100">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-600" />
                    Select Available Time Slot
                  </h4>

                  {!selectedLecturer.office_hours ||
                  selectedLecturer.office_hours.length === 0 ? (
                    <div className="p-8 bg-gray-50 border border-gray-200 border-dashed rounded-xl">
                      <p className="text-sm text-gray-500 italic text-center">
                        No consultation hours have been set by this lecturer yet.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedLecturer.office_hours.map((slot, index) => (
                        <button
                          key={slot.id || index}
                          onClick={() => setSelectedSlot(slot)}
                          className={`flex flex-col p-4 rounded-xl border-2 transition-all text-left ${
                            selectedSlot === slot
                              ? "bg-red-50 border-red-500 ring-1 ring-red-500/10 shadow-sm"
                              : "bg-white border-gray-100 hover:border-red-200"
                          }`}
                        >
                          <span
                            className={`text-sm font-bold ${
                              selectedSlot === slot
                                ? "text-red-700"
                                : "text-gray-900"
                            }`}
                          >
                            {slot.day}
                          </span>
                          <span className="text-sm text-gray-600 mt-0.5">
                            {slot.startTime} - {slot.endTime}
                          </span>
                          <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <span className="truncate">{slot.location}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reason Form */}
                <div className="flex-1 flex flex-col">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                    Reason for Consultation
                  </h4>
                  <textarea
                    placeholder="Tell the lecturer what you'd like to discuss (e.g., Module CS301 coursework, Final Project guidance...)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={10}
                    className="w-full flex-1 min-h-[200px] px-4 py-3 text-sm border-2 border-gray-300 rounded-xl focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all resize-none shadow-inner"
                  />
                </div>

                {/* Footer Actions */}
                <div className="mt-8 flex items-center justify-between">
                  <p className="text-xs text-gray-500 max-w-sm italic">
                    Note: Appointment requests are subject to lecturer approval.
                  </p>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); handleSendRequest(); }}
                    disabled={
                      !selectedSlot || !reason.trim() || isSubmitting || isSuccess
                    }
                    className={`flex items-center gap-2 px-8 py-3 cursor-pointer rounded-xl font-bold transition-all shadow-lg ${
                      isSuccess
                        ? "bg-green-600 text-white cursor-default"
                        : "bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white shadow-red-600/20 active:scale-95"
                    }`}
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : isSuccess ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Request Sent
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Send Request
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
      </div>
    </div>
  );
}
