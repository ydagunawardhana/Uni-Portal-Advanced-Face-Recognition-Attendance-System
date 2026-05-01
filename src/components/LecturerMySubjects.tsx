import { useState, useEffect } from "react";
import {
  Search,
  Calendar,
  Users,
  BarChart3,
  Loader2,
  RefreshCw,
  Filter,
  GraduationCap,
  Layers,
  Award,
} from "lucide-react";
import { toast } from "react-hot-toast";
import AttendanceReports from "./AttendanceReports";

const API_BASE = "http://localhost:8000";

interface Subject {
  id: string | number;
  module_name: string;
  module_code: string;
  schedule: string;
  enrolled_students: number;
  batch?: string;
  intake?: string;
  semester?: string;
  degree?: string;
}

const topBorderColors = [
  "border-t-blue-500",
  "border-t-purple-500",
  "border-t-green-500",
  "border-t-orange-500",
  "border-t-pink-500",
  "border-t-indigo-500",
];

export default function LecturerMySubjects() {
  const [searchQuery, setSearchQuery] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [batchFilter, setBatchFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem("lecturerToken");
      if (!token) {
        toast.error("Session expired. Please login again.");
        return;
      }

      const response = await fetch(`${API_BASE}/api/lecturer/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
      } else {
        toast.error("Failed to load your assigned subjects.");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Network error. Could not connect to server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSubjects();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleViewAttendance = (subject: Subject) => {
    setSelectedSubject({
      ...subject,
      id: subject.module_code as any,
      name: subject.module_name,
      code: subject.module_code,
      studentCount: subject.enrolled_students,
    } as any);
  };

  if (selectedSubject) {
    return (
      <AttendanceReports
        subject={selectedSubject as any}
        onBack={() => setSelectedSubject(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-gray-500 font-medium animate-pulse">
          Loading assigned subjects...
        </p>
      </div>
    );
  }

  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch =
      s.module_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.module_code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBatch =
      !batchFilter ||
      s.batch?.toLowerCase().includes(batchFilter.toLowerCase()) ||
      s.intake?.toLowerCase().includes(batchFilter.toLowerCase());

    const matchesSemester =
      !semesterFilter ||
      s.semester?.toLowerCase().includes(semesterFilter.toLowerCase());

    return matchesSearch && matchesBatch && matchesSemester;
  });

  return (
    <div className="w-full space-y-6">
      {/* 1. Header Section */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            My Assigned Subjects
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Manage your assigned courses and attendance
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-md hover:bg-gray-100 text-gray-700 font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-600" : "text-gray-500"}`}
          />
          Refresh
        </button>
      </div>

      {/* 2. Search and Filter Controls - Fixed Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 w-full">
        {/* 1. Search Box */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search subjects by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
          />
        </div>

        {/* 2. Batch Filter Box */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Filter by Batch (e.g. 26.1)"
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
          />
        </div>

        {/* 3. Semester Filter Box */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Layers className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Filter by Semester (e.g. Semester 1)"
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
          />
        </div>
      </div>

      {/* 3. Subject Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-6">
        {filteredSubjects.length > 0 ? (
          filteredSubjects.map((subject, index) => (
            <div
              key={`${subject.module_code}-${subject.batch}`}
              className="bg-white rounded-xl shadow-md border border-gray-200 p-6 flex flex-col h-full hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900 leading-tight">
                  {subject.module_name}
                </h3>
                <span className="bg-purple-100 text-purple-700 text-sm font-bold px-3 py-1 rounded-full whitespace-nowrap border border-purple-200">
                  Batch {subject.batch}
                </span>
              </div>

              <div className="mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-xl text-md font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {subject.module_code}
                </span>
              </div>

              <div className="space-y-2 mb-6 flex-grow">
                <div className="flex items-center text-sm text-gray-600 font-medium">
                  <GraduationCap className="w-5 h-5 mr-2 text-blue-500" />
                  {subject.semester}
                </div>
                <div className="flex items-center text-sm text-gray-600 rounnde font-medium">
                  <Award className="w-5 h-5 mr-2 text-blue-500" />
                  <span className="line-clamp-1">
                    {subject.degree || "Degree Program TBA"}
                  </span>
                </div>
                <div className="flex items-center text-sm font-bold text-green-600">
                  <Users className="w-5 h-5 mr-2 text-green-600" />
                  {subject.enrolled_students || 0} Students Enrolled
                </div>
              </div>

              <button
                onClick={() => handleViewAttendance(subject)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg flex justify-center items-center transition-colors shadow-sm cursor-pointer"
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                View Attendance
              </button>
            </div>
          ))
        ) : (
          /* Empty Search State */
          <div className="col-span-full bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <Search className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {searchQuery ? "No matching subjects" : "No Subjects found"}
              </h3>
              <p className="text-gray-500 mb-6 font-medium">
                {searchQuery
                  ? "Try searching for a different module code or name."
                  : "You haven't been assigned to any subjects yet."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
