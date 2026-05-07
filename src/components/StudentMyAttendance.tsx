import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  ChevronLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  User,
} from "lucide-react";
import toast from "react-hot-toast";

// Interfaces based on the new backend schemas
interface SubjectSummary {
  module_code: string;
  module_name: string;
  total_sessions: number;
  attended_sessions: number;
  attendance_percentage: number;
  level?: string;         
  lecturer_name?: string; 
}

interface SessionDetail {
  session_id: number;
  date: string;
  start_time: string;
  end_time: string;
  session_type: string;
  status: "Present" | "Absent" | "Excused" | "Pending";
  request_status?: string | null;
}

const StudentMyAttendance = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectSummary | null>(
    null,
  );
  const [sessions, setSessions] = useState<SessionDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initial Fetch for Subjects
  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setIsLoading(true);
    try {
      const studentToken = localStorage.getItem("studentToken");
      const response = await fetch(
        "http://localhost:8000/api/attendance/student/my-subjects",
        {
          headers: { Authorization: `Bearer ${studentToken}` },
        },
      );
      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
      }
    } catch (error) {
      console.error("Failed to fetch subjects", error);
      toast.error("Failed to load your subjects.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFixAttendance = (session: SessionDetail) => {
    navigate("/student", {
      state: { prefilledSessionId: session.session_id },
    });
  };

  // Fetch Sessions when a subject is clicked
  const handleSubjectClick = async (subject: SubjectSummary) => {
    setSelectedSubject(subject);
    setIsLoading(true);
    try {
      const token = localStorage.getItem("studentToken");
      const response = await fetch(
        `http://localhost:8000/api/attendance/student/my-subjects/${subject.module_code}/sessions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error("Failed to fetch sessions", error);
      toast.error("Failed to load session details.");
    } finally {
      setIsLoading(false);
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Present":
        return (
          <span className="flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold border border-green-100">
            <CheckCircle className="w-4 h-4" /> Present
          </span>
        );
      case "Absent":
        return (
          <span className="flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold border border-red-100">
            <XCircle className="w-4 h-4" /> Absent
          </span>
        );
      case "Excused":
        return (
          <span className="flex items-center gap-1.5 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-bold border border-yellow-100">
            <AlertCircle className="w-4 h-4" /> Excused
          </span>
        );
      default:
        return (
          <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-sm font-bold animate-pulse">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 mx-auto animate-in fade-in duration-300">
      {!selectedSubject ? (
        /* 
           VIEW 1: SUBJECT GRID  */
        <>
          <div className="mb-8 flex flex-wrap items-end gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Calendar className="w-8 h-8 text-red-600" /> My Subjects
              </h2>
              <p className="text-md text-gray-500 mt-2">
                Select a module to view your detailed attendance records.
              </p>
            </div>
            {subjects.length > 0 && subjects[0].level && (
              <div className="flex items-center bg-red-100 text-red-600 px-3 py-1 rounded-xl text-sm font-bold border-2 border-red-200 mb-1">
                {subjects[0].level}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center p-12 text-gray-500 font-medium">
              Loading your subjects...
            </div>
          ) : subjects.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border-2 border-dashed border-red-200 shadow-sm mt-6">
              <div className="w-20 h-20 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-10 h-10 animate-pulse" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                No Subjects Found
              </h3>
              <p className="text-gray-500 max-w-md mx-auto text-sm font-semibold leading-relaxed">
                You are not currently enrolled in any subjects, or your
                attendance records haven't been generated yet. Please contact
                your administrator if you think this is a mistake.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((sub, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSubjectClick(sub)}
                  className="bg-white border border-gray-200 rounded-2xl p-6 cursor-pointer hover:shadow-lg border-2 transition-all group shadow-sm"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BookOpen className="w-7 h-7" />
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-xl font-bold ${sub.attendance_percentage >= 70 ? "text-green-600" : sub.attendance_percentage >= 50 ? "text-yellow-600" : "text-red-600"}`}
                      >
                        {sub.attendance_percentage}%
                      </span>
                      <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">
                        Overall
                      </p>
                    </div>
                  </div>
                  <h3
                    className="text-xl font-bold text-gray-900 mb-1 group-hover:text-red-700 transition-colors line-clamp-1"
                    title={sub.module_name}
                  >
                    {sub.module_name}
                  </h3>
                  {/* Module code + sessions row */}
                  <div className="flex items-center gap-4 mt-3">
                    <span className="bg-gray-200 px-2.5 py-1 rounded-xl font-bold text-sm text-gray-700">
                      {sub.module_code}
                    </span>
                    <span className="text-sm text-gray-600 font-bold">
                      {sub.attended_sessions} / {sub.total_sessions} Sessions
                    </span>
                  </div>

                  {/* Lecturer name footer */}
                  <div className="pt-3 mt-1 flex items-center gap-2 text-sm text-gray-500 font-bold">
                    <User className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">{sub.lecturer_name || "TBA"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* 
           VIEW 2: SESSION DETAILS  */
        <div className="animate-in slide-in-from-right-4 duration-300">
          <button
            onClick={() => setSelectedSubject(null)}
            className="flex items-center gap-2 text-md font-bold text-gray-500 hover:text-red-600 transition-colors mb-6 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" /> Back to Subjects
          </button>

          <div className="bg-green-600 rounded-2xl p-6 text-white mb-8 shadow-md flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">
                {selectedSubject.module_name}
              </h2>
              <p className="text-white font-medium mt-1 text-md">
                {selectedSubject.module_code} • Detailed Attendance
              </p>
            </div>
            <div className="bg-white/10 px-4 py-3 rounded-xl backdrop-blur-sm text-center ">
              <div className="text-2xl font-semibold">
                {selectedSubject.attendance_percentage}%
              </div>
              <div className="text-sm text-white uppercase tracking-wider font-bold animate-pulse">
                Overall Status
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-gray-600">
                <thead className="bg-gray-100 border-b border-gray-100 text-sm  text-gray-600 font-extrabold tracking-wider">
                  <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Time</th>
                    <th className="p-4">Session Type</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-400">
                        Loading sessions...
                      </td>
                    </tr>
                  ) : sessions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-400">
                        No past sessions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    sessions.map((session, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="p-4 font-bold text-gray-900">
                          {session.date}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-gray-600 font-medium text-sm">
                            <Clock className="w-4 h-4" /> {session.start_time} -{" "}
                            {session.end_time}
                          </div>
                        </td>
                        <td className="p-4 font-medium text-sm">
                          {session.session_type}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-8 flex-wrap">
                            {getStatusBadge(session.status)}
                            {session.status === "Absent" && (
                              session.request_status === "Pending" ? (
                                <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-600 border border-yellow-200 rounded-lg text-sm font-bold whitespace-nowrap animate-pulse">
                                  Pending Appeal
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleFixAttendance(session)}
                                  className="text-sm font-bold bg-green-50 text-green-600 px-2.5 py-1 rounded-lg hover:bg-green-100 transition-colors border border-green-200 shadow-sm flex items-center gap-1 cursor-pointer"
                                >
                                  Request Correction
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentMyAttendance;
