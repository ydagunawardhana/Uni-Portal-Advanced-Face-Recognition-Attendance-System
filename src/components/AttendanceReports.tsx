import { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  FileText,
  Calendar,
  ArrowLeft,
  RefreshCw,
  User,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface StudentRecord {
  student_id: string;
  name: string;
  status: string;
  attendance_percentage: number;
  academic_year?: string;
  intake?: string;
  batch?: string;
}

interface Subject {
  module_code: string;
  module_name: string;
  students_enrolled: number;
}

interface AttendanceReportsProps {
  subject?: Subject;
  onBack?: () => void;
}

export default function AttendanceReports({
  subject,
  onBack,
}: AttendanceReportsProps) {
  const [fromDate, setFromDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [showAtRiskOnly, setShowAtRiskOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [subjectDetails, setSubjectDetails] = useState({
    total_students: 0,
    total_sessions_held: 0,
  });

  const fetchAttendance = async () => {
    if (!subject?.module_code) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem("lecturerToken");
      const res = await fetch(
        `http://localhost:8000/api/lecturer/attendance/${subject.module_code}?date=${fromDate}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      setStudents(data.students || []);
      setSubjectDetails(data.subject_details || { total_students: 0, total_sessions_held: 0 });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load attendance records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [subject?.module_code, fromDate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAttendance();
    setIsRefreshing(false);
    toast.success("Attendance records synced");
  };

  const totalStudentsCount = students.length;
  const atRiskStudentsCount = students.filter(
    (s) => (s.attendance_percentage || 0) < 80,
  ).length;
  const avgAttendance =
    totalStudentsCount > 0
      ? (
          students.reduce(
            (acc, curr) => acc + (curr.attendance_percentage || 0),
            0,
          ) / totalStudentsCount
        ).toFixed(1)
      : 0;

  const displayedStudents = students.filter((s) => {
    const matchesRisk = showAtRiskOnly
      ? (s.attendance_percentage || 0) < 80
      : true;

    const matchesSearch =
      !searchQuery ||
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBatch =
      !batchFilter ||
      s.academic_year?.toLowerCase().includes(batchFilter.toLowerCase()) ||
      s.intake?.toLowerCase().includes(batchFilter.toLowerCase()) ||
      s.batch?.toLowerCase().includes(batchFilter.toLowerCase());

    return matchesRisk && matchesSearch && matchesBatch;
  });


  const handleExportExcel = () => {
    alert("Exporting to Excel... (Feature will download .xlsx file)");
    console.log("Export to Excel clicked");
  };

  const handleExportCSV = () => {
    alert("Exporting to CSV... (Feature will download .csv file)");
    console.log("Export to CSV clicked");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 cursor-pointer text-gray-500 hover:text-blue-600 transition-colors font-medium group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Subjects
          </button>
        )}
        {!subject && (
          <h2 className="text-2xl font-bold text-gray-900">
            Attendance Reports
          </h2>
        )}
      </div>

      {subject && (
        <div className="bg-blue-600 rounded-xl p-6 text-white shadow-lg shadow-blue-200">
          <div className="flex flex-col-2 md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-tight mb-4">
                {subject.module_name}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-blue-100 font-medium">
                <span className="px-2 py-0.5 bg-blue-500 rounded-lg text-white text-md border-2 border-blue-200">
                  {subject.module_code}
                </span>
                <span className="ml-3">• Attendance Overview</span>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-md rounded-lg px-6 py-2.5 border-2 border-white/20">
              <span className="block text-xs text-white uppercase font-bold tracking-wider mb-2">
                Total Students
              </span>
              <span className="text-xl font-bold">
                {subject.students_enrolled} Enrolled
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Subject-Specific At-Risk Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between hover:border-blue-200 transition-colors">
          <div>
            <p className="text-sm font-bold text-gray-500 mb-1">
              Currently Enrolled
            </p>
            <h4 className="text-2xl font-bold text-gray-900 leading-none">
              {totalStudentsCount}
            </h4>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
            <User className="w-7 h-7" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between hover:border-green-200 transition-colors">
          <div>
            <p className="text-sm font-bold text-gray-500 mb-1">
              Average Attendance
            </p>
            <h4 className="text-2xl font-bold text-gray-900 leading-none">
              {avgAttendance}%
            </h4>
          </div>
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600 shrink-0">
            <CheckCircle className="w-7 h-7" />
          </div>
        </div>
        <div className="bg-red-50 p-5 rounded-xl border border-red-100 shadow-sm flex items-center justify-between hover:border-red-200 transition-colors">
          <div>
            <p className="text-sm font-bold text-red-600 mb-1">
              At-Risk (&lt; 80%)
            </p>
            <h4 className="text-2xl font-bold text-red-700 leading-none">
              {atRiskStudentsCount} Students
            </h4>
          </div>
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 shrink-0">
            <AlertTriangle className="w-7 h-7" />
          </div>
        </div>
      </div>
      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-4">
          {/* 1. Date Filter */}
          <div>
            <label className="block text-sm font-bold text-gray-800 tracking-wider mb-1.5">
              Select Date for Status
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                aria-label="Select Date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm h-[42px]"
              />
            </div>
          </div>

          {/* 2. Search Student */}
          <div>
            <label className="block text-sm font-bold text-gray-800 tracking-wider mb-1.5">
              Search Student
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm h-[42px]"
              />
            </div>
          </div>

          {/* 3. Batch Filter */}
          <div>
            <label className="block text-sm font-bold text-gray-800 tracking-wider mb-1.5">
              Filter by Batch
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Type batch (e.g., Year 1, 26.1)"
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm h-[42px]"
              />
            </div>
          </div>

          {/* 4. Risk Filter */}
          <div>
            <label className="block text-sm font-bold text-gray-800 tracking-wider mb-1.5">
              Risk Filter
            </label>
            <button
              onClick={() => setShowAtRiskOnly(!showAtRiskOnly)}
              className={`w-full h-[42px] px-4 py-2 cursor-pointer text-sm font-bold rounded-lg border-2 transition-colors flex items-center justify-center gap-2 ${showAtRiskOnly ? "bg-red-50 border-red-200 text-red-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
            >
              <AlertTriangle className="w-5 h-5" />
              {showAtRiskOnly ? "At-Risk Only" : "All Students"}
            </button>
          </div>
        </div>

        {/* Action Bar: Refresh & Export */}
        <div className="flex flex-wrap items-center justify-end gap-4 mt-6 pt-6 border-t-2 border-gray-100">
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 text-gray-700 font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-600" : "text-gray-500"}`}
              />
              Refresh
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center space-x-2 px-5 cursor-pointer py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md font-bold"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>Export to Excel</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-2 cursor-pointer px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md font-bold"
            >
              <FileText className="w-5 h-5" />
              <span>Export to CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Report Data Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b-1 border-gray-300">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 tracking-wider">
                  Student Details
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 tracking-wider">
                  Status ({fromDate})
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 tracking-wider">
                  Overall Attendance %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                    Syncing attendance intelligence...
                  </td>
                </tr>
              ) : displayedStudents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                    No matching student records found for this module.
                  </td>
                </tr>
              ) : (
                displayedStudents.map((student, idx) => (
                  <tr
                    key={student.student_id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* Student Details */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className={`w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold mr-3`}
                        >
                          {student.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {student.name}
                          </div>
                          <div className="text-sm text-gray-500 font-mono">
                            {student.student_id}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                          student.status === "Present"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {student.status}
                      </span>
                    </td>

                    {/* Overall Percentage */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-[100px] h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${student.attendance_percentage >= 80 ? "bg-green-500" : "bg-red-500"}`}
                            style={{ width: `${student.attendance_percentage}%` }}
                          ></div>
                        </div>
                        <span
                          className={`text-sm font-bold ${
                            student.attendance_percentage >= 80
                              ? "text-green-700"
                              : "text-red-700"
                          }`}
                        >
                          {student.attendance_percentage}%
                        </span>
                        {student.attendance_percentage < 80 && (
                          <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing{" "}
            <span className="font-medium">1-{displayedStudents.length}</span> of{" "}
            <span className="font-medium">{students.length}</span> students
          </div>
          <div className="flex flex-col items-end">
            <p className="text-xs text-gray-400 italic">
              Longitudinal analysis based on {subjectDetails.total_sessions_held}{" "}
              sessions held.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
