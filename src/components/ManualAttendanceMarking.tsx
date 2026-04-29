import { useState, useEffect, useCallback } from "react";
import { Users, Check, X, Clock, Search, Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { ImageWithFallback } from './figma/ImageWithFallback';

const API_BASE = "http://localhost:8000";

interface Student {
  id: number;
  name: string;
  indexNumber: string;
  avatar: string;
  attendance: "present" | "absent" | "late";
}

export default function ManualAttendanceMarking() {
  const location = useLocation();
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<Student[]>([]);

  const subjects = [
    { value: "cs301", label: "Database Management Systems" },
    { value: "cs302", label: "Software Engineering" },
    { value: "cs303", label: "Web Development" },
    { value: "cs304", label: "Data Structures" },
  ];

  const sessions = [
    { value: "today-09", label: "Today - 09:00 AM" },
    { value: "today-11", label: "Today - 11:00 AM" },
    { value: "today-14", label: "Today - 02:00 PM" },
    { value: "yesterday-09", label: "Yesterday - 09:00 AM" },
  ];

  const handleLoadStudentList = useCallback(async (sessionId?: string) => {
    const idToLoad = sessionId || selectedSession;
    if (!idToLoad) {
      toast.error("Please select a session");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/attendance/session_summary/${idToLoad}`);
      if (!res.ok) throw new Error("Failed to load students");
      const data = await res.json();
      setStudents(data);
      setIsLoaded(true);
      toast.success(`Loaded ${data.length} students from AI logs`);
    } catch (error) {
      console.error("Load error:", error);
      toast.error("Failed to load student list for this session.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedSession]);

  useEffect(() => {
    if (location.state?.sessionId) {
      const { sessionId, subjectId } = location.state;
      setSelectedSession(String(sessionId));
      setSelectedSubject(subjectId || "");
      
      // Auto-load if we have a sessionId
      handleLoadStudentList(String(sessionId));
    }
  }, [location.state, handleLoadStudentList]);

  const handleAttendanceChange = (
    studentId: number,
    status: "present" | "absent" | "late",
  ) => {
    setStudents(
      students.map((student) =>
        student.id === studentId
          ? { ...student, attendance: status }
          : student,
      ),
    );
  };

  const handleMarkAllPresent = () => {
    setStudents(
      students.map((student) => ({
        ...student,
        attendance: "present",
      })),
    );
  };

  const handleSave = async () => {
    if (!selectedSession && !location.state?.sessionId) {
      toast.error("Session ID missing");
      return;
    }

    setIsSaving(true);
    const sessionId = selectedSession || location.state?.sessionId;
    
    try {
      const payload = {
        session_id: parseInt(String(sessionId)),
        overrides: students.map(s => ({
          student_id: s.id,
          status: s.attendance
        }))
      };

      const res = await fetch(`${API_BASE}/api/attendance/bulk_save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save");
      
      toast.success("Attendance Record Finalized Successfully!");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save attendance record.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel? All unsaved overrides will be lost.")) {
      setIsLoaded(false);
      if (!location.state?.sessionId) {
        setSelectedSubject("");
        setSelectedSession("");
      }
    }
  };

  const filteredStudents = students.filter((student) => {
    const query = searchQuery.toLowerCase();
    return (
      student.name.toLowerCase().includes(query) ||
      student.indexNumber.toLowerCase().includes(query)
    );
  });

  const totalStudents = students.length;
  const presentCount = students.filter((s) => s.attendance === "present").length;
  const absentCount = students.filter((s) => s.attendance === "absent").length;
  const lateCount = students.filter((s) => s.attendance === "late").length;

  return (
    <div className="flex-1 flex flex-col bg-gray-50 relative">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Mark Manual Attendance
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Manually record or edit class attendance
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto px-8 py-6 pb-24">
        {/* Selection Bar */}
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 mb-6">
          <div className="flex items-end gap-4">
            {/* Dropdown 1: Select Subject */}
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Subject
              </label>
              <select
                title="Select Subject"
                value={selectedSubject}
                onChange={(e) =>
                  setSelectedSubject(e.target.value)
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              >
                <option value="">-- Choose a subject --</option>
                {subjects.map((subject) => (
                  <option
                    key={subject.value}
                    value={subject.value}
                  >
                    {subject.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dropdown 2: Select Session */}
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Session
              </label>
              <select
                title="Select Session"
                value={selectedSession}
                onChange={(e) =>
                  setSelectedSession(e.target.value)
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              >
                <option value="">-- Choose a session --</option>
                {sessions.map((session) => (
                  <option
                    key={session.value}
                    value={session.value}
                  >
                    {session.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Load Button */}
            <button
              onClick={() => handleLoadStudentList()}
              disabled={isLoading || isLoaded}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {isLoading ? "Loading List..." : "Load Student List"}
            </button>
          </div>
        </div>

        {/* Toolbar and Student List (Only show when loaded) */}
        {isLoaded && (
          <>
            {/* Toolbar */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  <span className="font-semibold text-gray-900">
                    Total Students:{" "}
                    <span className="text-blue-600">
                      {totalStudents}
                    </span>
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="text-green-600 font-medium">
                    Present: {presentCount}
                  </span>
                  <span className="mx-2">|</span>
                  <span className="text-red-600 font-medium">
                    Absent: {absentCount}
                  </span>
                  <span className="mx-2">|</span>
                  <span className="text-yellow-600 font-medium">
                    Late: {lateCount}
                  </span>
                </div>
              </div>

              <button
                onClick={handleMarkAllPresent}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm hover:underline"
              >
                Mark All as Present
              </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search student by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
            </div>

            {/* Student List */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 grid grid-cols-12 gap-4 font-semibold text-sm text-gray-700">
                <div className="col-span-1">Avatar</div>
                <div className="col-span-3">Student Name</div>
                <div className="col-span-3">Index Number</div>
                <div className="col-span-5">
                  Attendance Status
                </div>
              </div>

              {/* Student Rows */}
              <div className="divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-gray-50 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="col-span-1">
                      <div className="w-10 h-10 rounded-full overflow-hidden">
                        <ImageWithFallback
                          src={student.avatar}
                          alt={student.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* Student Name */}
                    <div className="col-span-3">
                      <p className="font-semibold text-gray-900">
                        {student.name}
                      </p>
                    </div>

                    {/* Index Number */}
                    <div className="col-span-3">
                      <p className="text-gray-600">
                        {student.indexNumber}
                      </p>
                    </div>

                    {/* Attendance Toggles */}
                    <div className="col-span-5">
                      <div className="inline-flex rounded-lg border-2 border-gray-300 overflow-hidden">
                        {/* Present Button */}
                        <button
                          onClick={() =>
                            handleAttendanceChange(
                              student.id,
                              "present",
                            )
                          }
                          className={`flex items-center space-x-2 px-6 py-2 font-medium transition-all ${
                            student.attendance === "present"
                              ? "bg-green-600 text-white border-r-2 border-green-700"
                              : "bg-white text-gray-700 hover:bg-gray-50 border-r-2 border-gray-300"
                          }`}
                        >
                          <Check className="w-4 h-4" />
                          <span>Present</span>
                        </button>

                        {/* Absent Button */}
                        <button
                          onClick={() =>
                            handleAttendanceChange(
                              student.id,
                              "absent",
                            )
                          }
                          className={`flex items-center space-x-2 px-6 py-2 font-medium transition-all ${
                            student.attendance === "absent"
                              ? "bg-red-600 text-white border-r-2 border-red-700"
                              : "bg-white text-gray-700 hover:bg-gray-50 border-r-2 border-gray-300"
                          }`}
                        >
                          <X className="w-4 h-4" />
                          <span>Absent</span>
                        </button>

                        {/* Late Button */}
                        <button
                          onClick={() =>
                            handleAttendanceChange(
                              student.id,
                              "late",
                            )
                          }
                          className={`flex items-center space-x-2 px-6 py-2 font-medium transition-all ${
                            student.attendance === "late"
                              ? "bg-yellow-500 text-white"
                              : "bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <Clock className="w-4 h-4" />
                          <span>Late</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!isLoaded && (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Student List Loaded
            </h3>
            <p className="text-gray-600">
              Please select a subject and session, then click
              "Load Student List" to begin marking attendance.
            </p>
          </div>
        )}
      </div>

      {/* Sticky Footer (Only show when loaded) */}
      {isLoaded && (
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 px-8 py-4 shadow-lg">
          <div className="flex items-center justify-end space-x-4">
            <button
              onClick={handleCancel}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              <span>{isSaving ? "Finalizing..." : "Save Attendance Record"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}