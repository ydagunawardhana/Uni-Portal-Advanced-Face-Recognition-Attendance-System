import { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";
import {
  FileSpreadsheet,
  FileText,
  Calendar,
  CalendarX,
  ArrowLeft,
  RefreshCw,
  User,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "react-hot-toast";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

interface StudentRecord {
  student_id: string;
  index_number?: string;
  name: string;
  status: string;
  attendance_percentage: number;
  academic_year?: string;
  intake?: string;
  total_sessions?: number;
  attended_sessions?: number;
  in_time?: string;
  out_time?: string;
  reason?: string;
}

interface Subject {
  module_code: string;
  module_name: string;
  students_enrolled?: number;
  enrolled_students?: number;
  batch?: string;
  degree?: string;
  semester?: string;
  level?: string;
}

interface AttendanceReportsProps {
  subject?: Subject;
  onBack?: () => void;
}

export default function AttendanceReports({
  subject,
  onBack,
}: AttendanceReportsProps) {
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [fromDate, setFromDate] = useState(getLocalDateString());
  const [toDate, setToDate] = useState(getLocalDateString());
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [riskFilter, setRiskFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("all");
  const [subjectDetails, setSubjectDetails] = useState({
    total_students: 0,
    total_sessions_held: 0,
  });

  const fetchAttendance = async () => {
    if (!subject?.module_code) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem("lecturerToken");
      // Build query params dynamically to prevent date filtering when "Overall" is selected
      const params = new URLSearchParams();
      if (subject.batch) params.append("batch", subject.batch);

      if (selectedSessionId !== "all") {
        params.append("session_id", selectedSessionId);
        if (fromDate) params.append("date", fromDate);
      }

      const res = await fetch(
        `${API_BASE_URL}/api/lecturer/attendance/${
          subject.module_code
        }?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();

      const formattedRecords = (data.students || []).map((record: any) => ({
        ...record,
        total_sessions: parseInt(record.total_sessions, 10) || 0,
        attended_sessions: parseInt(record.attended_sessions, 10) || 0,
      }));

      if (formattedRecords.length > 0) {
        console.log("First Student Record:", formattedRecords[0]);
      }

      setStudents(formattedRecords);
      setSubjectDetails(
        data.subject_details || { total_students: 0, total_sessions_held: 0 }
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to load attendance records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (subject?.module_code) {
      fetchAttendance();
    }
  }, [subject?.module_code, fromDate, selectedSessionId, riskFilter]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const token = localStorage.getItem("lecturerToken");

        // Ensure subject.module_code and subject.batch are properly extracted from location.state
        console.log(
          "Fetching sessions for:",
          subject?.module_code,
          subject?.batch
        );

        const response = await fetch(
          `${API_BASE_URL}/api/attendance/sessions?module_code=${
            subject?.module_code
          }&batch_id=${subject?.batch || ""}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log("Fetched Sessions Data:", data); // Check your browser console!
          setSessions(data.sessions || []);
        } else {
          console.error("Failed to fetch sessions. Status:", response.status);
        }
      } catch (error) {
        console.error("Network error fetching sessions", error);
      }
    };

    if (subject?.module_code && subject?.batch) {
      fetchSessions();
    }
  }, [subject?.module_code, subject?.batch]);

  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sessionId = e.target.value;
    setSelectedSessionId(sessionId);

    if (sessionId !== "all") {
      const selectedSession = sessions.find(
        (s) => s.session_id.toString() === sessionId
      );
      if (selectedSession && selectedSession.date) {
        // Force strict YYYY-MM-DD format for the input field
        const formattedDate = new Date(selectedSession.date)
          .toISOString()
          .split("T")[0];
        setFromDate(formattedDate);
      }
    } else {
      setFromDate("");
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFromDate(e.target.value);
    setSelectedSessionId("all"); // Reset session dropdown when date is manually picked
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAttendance();
    setIsRefreshing(false);
    toast.success("Attendance records synced");
  };

  const totalStudentsCount = students.length;
  const actionNeededStudentsCount = students.filter((s) => {
    const percentage =
      subjectDetails.total_sessions_held === 0
        ? 0
        : s.attendance_percentage || 0;
    return percentage < 70;
  }).length;

  const avgAttendance = (() => {
    if (totalStudentsCount === 0) return "0.0";

    if (selectedSessionId === "all") {
      // Overall view: average of each student's overall attendance_percentage
      // Guard: if backend hasn't set total_sessions_held yet, treat as 0
      const sum = students.reduce(
        (acc, curr) =>
          acc +
          (subjectDetails.total_sessions_held === 0
            ? 0
            : curr.attendance_percentage || 0),
        0
      );
      return (sum / totalStudentsCount).toFixed(1);
    } else {
      // Specific-session view: the backend returns per-student status strings
      const presentStatuses = new Set(["present", "entered", "late", "in"]);
      const presentCount = students.filter((s) =>
        presentStatuses.has((s.status ?? "").toLowerCase())
      ).length;
      return ((presentCount / totalStudentsCount) * 100).toFixed(1);
    }
  })();

  // Label shown under the Average Attendance card
  const selectedSessionLabel = (() => {
    if (selectedSessionId === "all") return "All Sessions (Overall)";
    const s = sessions.find(
      (s) => s.session_id?.toString() === selectedSessionId
    );
    if (!s) return "Selected Session";
    return `${s.session_type ?? "Session"} • ${s.date ?? ""}${
      s.start_time ? ` (${s.start_time})` : ""
    }`;
  })();

  const displayedStudents = students.filter((s) => {
    let matchesRisk = true;
    const attendance =
      subjectDetails.total_sessions_held === 0
        ? 0
        : parseFloat(String(s.attendance_percentage)) || 0;

    if (riskFilter === "safe") {
      matchesRisk = attendance >= 70;
    } else if (riskFilter === "warning") {
      matchesRisk = attendance >= 50 && attendance < 70;
    } else if (riskFilter === "critical") {
      matchesRisk = attendance >= 20 && attendance < 50;
    } else if (riskFilter === "fail") {
      matchesRisk = attendance < 20;
    }

    const matchesSearch =
      !searchQuery ||
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.index_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesRisk && matchesSearch;
  });

  const handleExportExcel = async () => {
    if (!displayedStudents || displayedStudents.length === 0) {
      toast.error("No records to export. Adjust your filters and try again.");
      return;
    }

    const toastId = toast.loading("Preparing your Excel report...");

    try {
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Attendance Report");

      const isOverall = selectedSessionId === "all";
      worksheet.columns = [
        { width: 18 }, // A: Index / Labels
        { width: 35 }, // B: Names / Values
        { width: 15 }, // C: Total Sessions / Date
        { width: 0 }, // D: (Spacer)
        { width: 20 }, // E: Risk Labels / Status / Attended
        { width: 18 }, // F: Risk Counts / Overall % / In Time
        { width: 18 }, // G: Out Time (Only for Session View)
        { width: 30 }, // H: Reason (Only for Session View)
      ];

      const maxCol = isOverall ? "F" : "H"; // Dynamic merging limit

      // Derive stats from displayedStudents (respects active risk + search filters)
      const enrolledCount = displayedStudents.length;
      const presentCount = isOverall
        ? "N/A (Overall View)"
        : displayedStudents.filter((r) => r.status?.toLowerCase() === "present")
            .length;
      const absentCount = isOverall
        ? "N/A (Overall View)"
        : displayedStudents.filter((r) => r.status?.toLowerCase() === "absent")
            .length;

      const safeCount = displayedStudents.filter(
        (r) => (parseFloat(String(r.attendance_percentage)) || 0) >= 70
      ).length;
      const warningCount = displayedStudents.filter((r) => {
        const a = parseFloat(String(r.attendance_percentage)) || 0;
        return a >= 50 && a < 70;
      }).length;
      const criticalCount = displayedStudents.filter((r) => {
        const a = parseFloat(String(r.attendance_percentage)) || 0;
        return a >= 20 && a < 50;
      }).length;
      const failCount = displayedStudents.filter(
        (r) => (parseFloat(String(r.attendance_percentage)) || 0) < 20
      ).length;

      // --- Section 1: Main Titles ---
      worksheet.mergeCells("A1", `${maxCol}1`);
      const titleCell = worksheet.getCell("A1");
      titleCell.value = `Attendance Report: ${
        subject?.module_name || "Module"
      } - Batch ${subject?.batch || ""}`;
      titleCell.font = {
        name: "Arial",
        size: 16,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A8A" },
      };
      titleCell.alignment = { vertical: "middle", horizontal: "center" };

      worksheet.mergeCells("A2", `${maxCol}2`);
      worksheet.getCell(
        "A2"
      ).value = `Generated on: ${new Date().toLocaleDateString()} | View: ${
        isOverall ? "Overall Summary" : `Session on ${fromDate}`
      }`;
      worksheet.getCell("A2").font = { italic: true };
      worksheet.getCell("A2").alignment = { horizontal: "center" };

      const setInfo = (cell: string, value: any, bold = false) => {
        const c = worksheet.getCell(cell);
        c.value = value;
        if (bold) c.font = { bold: true };
      };

      setInfo("A4", "Module Code:", true);
      setInfo("B4", subject?.module_code || "N/A");
      setInfo("A5", "Degree:", true);
      setInfo("B5", subject?.degree || "N/A");
      setInfo("A6", "Semester:", true);
      setInfo("B6", subject?.semester || subject?.level || "N/A");
      setInfo("A7", "Lecturer:", true);
      setInfo("B7", localStorage.getItem("lecturerName") || "N/A");
      setInfo("A8", "Total Enrolled:", true);
      setInfo("B8", enrolledCount);
      setInfo("A9", "Total Present:", true);
      setInfo("B9", presentCount);
      setInfo("A10", "Total Absent:", true);
      setInfo("B10", absentCount);
      setInfo("A11", "Risk Filter:", true);
      setInfo(
        "B11",
        riskFilter === "all"
          ? "All Students"
          : riskFilter.charAt(0).toUpperCase() + riskFilter.slice(1)
      );
      setInfo("A12", "Search Query:", true);
      setInfo("B12", searchQuery || "None");

      // Right Side: Risk Summary Table
      worksheet.getCell("E4").value = "Risk Category";
      worksheet.getCell("F4").value = "Student Count";
      ["E4", "F4"].forEach((col) => {
        const c = worksheet.getCell(col);
        c.font = { bold: true, color: { argb: "FFFFFFFF" } };
        c.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF374151" },
        };
        c.alignment = { horizontal: "center" };
      });

      const addRiskRow = (
        rowNum: number,
        label: string,
        count: number,
        colorHex: string
      ) => {
        worksheet.getCell(`E${rowNum}`).value = label;
        worksheet.getCell(`E${rowNum}`).font = {
          bold: true,
          color: { argb: colorHex },
        };
        worksheet.getCell(`E${rowNum}`).border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };

        worksheet.getCell(`F${rowNum}`).value = count;
        worksheet.getCell(`F${rowNum}`).alignment = { horizontal: "center" };
        worksheet.getCell(`F${rowNum}`).border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      };

      addRiskRow(5, "Safe (≥ 70%)", safeCount, "FF16A34A");
      addRiskRow(6, "Warning (50% - 69%)", warningCount, "FFEAB308");
      addRiskRow(7, "Critical (20% - 49%)", criticalCount, "FFF97316");
      addRiskRow(8, "Fail (< 20%)", failCount, "FFDC2626");

      // --- Section 3: Main Student Table ---
      const headerRowValues = isOverall
        ? [
            "Index Number",
            "Student Name",
            "Total Sessions",
            "",
            "Attended",
            "Overall %",
          ]
        : [
            "Index Number",
            "Student Name",
            "Date",
            "",
            "Status",
            "In Time",
            "Out Time",
            "Reason / Excuse",
          ];

      const headerRow = worksheet.getRow(15);
      headerRow.values = headerRowValues;
      headerRow.eachCell((cell, colNumber) => {
        if (colNumber === 4) return;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF2563EB" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });

      displayedStudents.forEach((record, index) => {
        const rowIndex = 16 + index;
        const row = worksheet.getRow(rowIndex);

        // Helper to get reason safely
        const getReason = () => {
          if (
            record.status?.toLowerCase() === "absent" ||
            record.status?.toLowerCase() === "flagged"
          ) {
            return record.reason || "Manually marked absent";
          }
          return "-";
        };

        row.values = isOverall
          ? [
              record.index_number || record.student_id || "N/A",
              record.name,
              record.total_sessions || 0,
              "",
              record.attended_sessions || 0,
              `${parseFloat(String(record.attendance_percentage || 0)).toFixed(
                1
              )}%`,
            ]
          : [
              record.index_number || record.student_id || "N/A",
              record.name,
              fromDate,
              "",
              record.status || "Absent",
              record.in_time || "--:--",
              record.out_time || "--:--",
              getReason(),
            ];

        row.eachCell((cell, colNumber) => {
          if (colNumber === 4) return; // Skip Spacer
          cell.border = {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          };
          cell.alignment = {
            vertical: "middle",
            horizontal: colNumber > 2 ? "center" : "left",
          };

          if (!isOverall) {
            if (colNumber === 5) {
              const status = cell.value?.toString().toLowerCase();
              if (status === "present")
                cell.font = { color: { argb: "FF16A34A" }, bold: true };
              if (status === "absent" || status === "flagged")
                cell.font = { color: { argb: "FFDC2626" }, bold: true };
            }
            if (colNumber === 8 && cell.value !== "-") {
              cell.font = { color: { argb: "FFDC2626" }, italic: true };
            }
          } else {
            if (colNumber === 6) {
              const percentage = parseFloat(
                cell.value?.toString().replace("%", "") || "0"
              );
              if (percentage >= 70)
                cell.font = { color: { argb: "FF16A34A" }, bold: true };
              else if (percentage >= 50)
                cell.font = { color: { argb: "FFEAB308" }, bold: true };
              else if (percentage >= 20)
                cell.font = { color: { argb: "FFF97316" }, bold: true };
              else cell.font = { color: { argb: "FFDC2626" }, bold: true };
            }
          }
        });
      });

      // Export
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const datePart = new Date().toISOString().split("T")[0];
      saveAs(
        blob,
        `${subject?.module_code}_Batch${subject?.batch}_${
          isOverall ? "Overall" : fromDate
        }_${datePart}.xlsx`
      );

      if (toast.dismiss) toast.dismiss(toastId);
      toast.success(
        `Report downloaded: ${displayedStudents.length} record(s) exported.`
      );
    } catch (error) {
      console.error(error);
      if (toast.dismiss) toast.dismiss(toastId);
      toast.error("Failed to generate Excel report.");
    }
  };

  // Helper function to get dynamic colors for the dropdown
  const getRiskDropdownColor = (filter: string) => {
    switch (filter) {
      case "safe":
        return "bg-green-100  border border-green-300 text-green-800 focus:ring-green-500";
      case "warning":
        return "bg-yellow-100 border border-yellow-300 text-yellow-800 focus:ring-yellow-500";
      case "critical":
        return "bg-orange-100 border border-orange-300 text-orange-800 focus:ring-orange-500";
      case "fail":
        return "bg-red-100 border border-red-300 text-red-800 focus:ring-red-500";
      default:
        return "bg-white border border-gray-300 text-gray-900 focus:ring-blue-500";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
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
                {subject.module_name}{" "}
                {subject.batch ? `- BATCH ${subject.batch}` : ""}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-blue-100 font-medium">
                <span className="px-2 py-0.5 bg-blue-500 rounded-lg text-white text-md border-2 border-blue-200">
                  {subject.module_code}
                </span>
                <span className="ml-3 animate-pulse">
                  • Attendance Overview
                </span>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-md rounded-lg px-6 py-2.5 border-2 border-white/20">
              <span className="block text-md text-white font-bold tracking-wider mb-2">
                Total Students
              </span>
              <span className="text-xl font-bold">
                {subject?.enrolled_students ||
                  subject?.students_enrolled ||
                  students.length ||
                  0}{" "}
                Enrolled
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Subject-Specific At-Risk Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-5 rounded-xl border-2 border-blue-200 shadow-sm flex items-center justify-between hover:border-blue-200 transition-colors">
          <div>
            <p className="text-md font-bold text-gray-600 mb-1">
              Currently Enrolled
            </p>
            <h4 className="text-2xl font-bold text-gray-900 leading-none">
              {totalStudentsCount}
            </h4>
          </div>
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shrink-0">
            <User className="w-8 h-8" />
          </div>
        </div>
        <div className="bg-green-50 p-5 rounded-xl border-2 border-green-200 shadow-sm flex items-center justify-between hover:border-green-200 transition-colors">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-md font-bold text-gray-600 mb-1">
              Average Attendance
            </p>
            <h4 className="text-2xl font-bold text-gray-900 leading-none">
              {isLoading ? (
                <span className="inline-block w-12 h-6 bg-green-200 animate-pulse rounded" />
              ) : (
                <>{avgAttendance}%</>
              )}
            </h4>
            <p className="text-sm font-bold text-green-600 mt-1.5 truncate">
              {selectedSessionLabel}
            </p>
          </div>
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-green-600 shrink-0">
            <CheckCircle className="w-8 h-8" />
          </div>
        </div>
        <div className="bg-red-50 p-5 rounded-xl border-2 border-red-200 shadow-sm flex items-center justify-between hover:border-red-200 transition-colors">
          <div>
            <div className="text-red-600 text-md font-bold mb-1">
              Action Needed (&lt; 70%)
            </div>
            <div className="text-2xl font-bold text-red-600">
              {actionNeededStudentsCount}{" "}
              <span className="text-lg font-semibold">Students</span>
            </div>
          </div>
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-red-500 shrink-0">
            <AlertTriangle className="w-8 h-8 animate-pulse" />
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
                onChange={handleDateChange}
                disabled={selectedSessionId === "all"}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm h-[42px] ${
                  selectedSessionId === "all"
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                    : "bg-white cursor-pointer border-gray-300"
                }`}
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
                className="w-full pl-10 pr-4 py-2 border cursor-pointer border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm h-[42px]"
              />
            </div>
          </div>

          {/* 3. Session Filter */}
          <div>
            <label className="block text-sm font-bold text-gray-800 tracking-wider mb-1.5">
              Select Session
            </label>
            <select
              value={selectedSessionId}
              onChange={handleSessionChange}
              disabled={sessions.length === 0} // Disable if no sessions
              className={`w-full px-3 py-2 border cursor-pointer rounded-lg text-sm outline-none ${
                sessions.length === 0
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                  : "bg-white border-gray-300 focus:ring-2 focus:ring-blue-500"
              }`}
            >
              <option value="all">
                {sessions.length === 0
                  ? "No Sessions Found"
                  : "All Sessions (Overall)"}
              </option>
              {sessions.map((session, idx) => (
                <option key={idx} value={session.session_id}>
                  {session.session_type} - {session.date}
                  {session.start_time
                    ? ` (${session.start_time} - ${session.end_time || "?"})`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Risk Filter */}
          <div>
            <label className="block text-sm font-bold text-gray-800 tracking-wider mb-1.5">
              Risk Filter
            </label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className={`w-full h-[42px] px-3 py-2 border cursor-pointer rounded-lg text-sm font-bold outline-none transition-colors duration-200 ${getRiskDropdownColor(
                riskFilter
              )}`}
            >
              <option value="all">⚠️ All Students</option>
              <option value="safe">🟢 Exam Eligible - (≥ 70%)</option>
              <option value="warning">🟡 Needs Excuse - (50% - 69%)</option>
              <option value="critical">🟠 Contact Parents - (20% - 49%)</option>
              <option value="fail">🔴 Not Eligible - (&lt; 20%)</option>
            </select>
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
                className={`w-4 h-4 ${
                  isRefreshing ? "animate-spin text-blue-600" : "text-gray-500"
                }`}
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
          </div>
        </div>
      </div>

      {/* Report Data Table */}
      {sessions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden p-8 text-center text-gray-500 font-medium">
          No class sessions have been recorded for this module yet.
        </div>
      ) : displayedStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border-4 border-dashed border-gray-400 mt-4 shadow-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <CalendarX className="w-10 h-10 text-gray-400 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            No Records Found
          </h3>
          <p className="text-gray-500 text-sm font-medium text-center">
            There are no attendance records for the selected date or session.{" "}
            <br /> Please select a valid session date.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 border-b-1 border-gray-300">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 tracking-wider">
                    Student Details
                  </th>

                  {selectedSessionId === "all" ? (
                    <>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 tracking-wider">
                        Total Sessions
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 tracking-wider">
                        Attended
                      </th>
                    </>
                  ) : (
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 tracking-wider">
                      Status ({fromDate})
                    </th>
                  )}

                  {selectedSessionId === "all" ? (
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 tracking-wider">
                      Overall Attendance %
                    </th>
                  ) : (
                    <>
                      <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 tracking-wider">
                        In Time
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 tracking-wider">
                        Out Time
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 tracking-wider">
                        Reason / Excuse
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                      Syncing attendance intelligence...
                    </td>
                  </tr>
                ) : (
                  displayedStudents.map((student, idx) => {
                    const statusLower =
                      student.status?.toLowerCase() || "absent";
                    let statusBadge = (
                      <span className="px-3 py-1 rounded-full text-sm font-bold bg-yellow-100 text-yellow-700">
                        {student.status || "No Session"}
                      </span>
                    );

                    if (statusLower === "present") {
                      statusBadge = (
                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-600">
                          Present
                        </span>
                      );
                    } else if (statusLower === "absent") {
                      statusBadge = (
                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-600">
                          Absent
                        </span>
                      );
                    } else if (statusLower === "flagged") {
                      statusBadge = (
                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-yellow-100 text-yellow-600">
                          Flagged
                        </span>
                      );
                    }

                    return (
                      <tr
                        key={student.student_id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        {/* Student Details */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                              {(student.name || "ST")
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .substring(0, 2)
                                .toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-md leading-tight">
                                {student.name}
                              </p>
                              <p className="text-[11px] text-gray-500  font-bold mt-0.5 tracking-wide">
                                {student.index_number ||
                                  student.student_id ||
                                  "N/A"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {selectedSessionId === "all" ? (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-gray-700">
                              {student.total_sessions || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-green-600">
                              {student.attended_sessions || 0}
                            </td>
                          </>
                        ) : (
                          <td className="px-6 py-4 whitespace-nowrap">
                            {statusBadge}
                          </td>
                        )}

                        {/* Overall Percentage OR Session Details */}
                        {selectedSessionId === "all" ? (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 max-w-[100px] h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-500 ${
                                    (subjectDetails.total_sessions_held === 0
                                      ? 0
                                      : student.attendance_percentage) >= 80
                                      ? "bg-green-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{
                                    width: `${
                                      subjectDetails.total_sessions_held === 0
                                        ? 0
                                        : student.attendance_percentage
                                    }%`,
                                  }}
                                ></div>
                              </div>
                              <span
                                className={`text-sm font-bold ${
                                  (subjectDetails.total_sessions_held === 0
                                    ? 0
                                    : student.attendance_percentage) >= 80
                                    ? "text-green-700"
                                    : "text-red-600"
                                }`}
                              >
                                {subjectDetails.total_sessions_held === 0
                                  ? 0
                                  : student.attendance_percentage}
                                %
                              </span>
                              {(subjectDetails.total_sessions_held === 0
                                ? 0
                                : student.attendance_percentage) < 80 && (
                                <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                              )}
                            </div>
                          </td>
                        ) : (
                          <>
                            <td className="px-6 py-4 text-center text-sm text-gray-700 font-medium">
                              {student.in_time ? student.in_time : "----"}
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-gray-700 font-medium">
                              {student.out_time ? student.out_time : "----"}
                            </td>
                            <td className="px-6 py-4 text-sm whitespace-nowrap text-center">
                              {student.reason &&
                              student.reason.trim() !== "" &&
                              student.reason !== "-" ? (
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold shadow-sm ${
                                    student.reason
                                      .toLowerCase()
                                      .includes("manual")
                                      ? "bg-purple-100 text-purple-700 border border-purple-200 rounded-xl"
                                      : student.reason
                                          .toLowerCase()
                                          .includes("insufficient")
                                      ? "bg-orange-100 text-orange-700 border border-orange-200 rounded-xl"
                                      : "bg-red-100 text-red-600 border border-red-200 rounded-xl"
                                  }`}
                                >
                                  {student.reason}
                                </span>
                              ) : (
                                <span className="text-gray-400 font-medium">
                                  -
                                </span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing{" "}
              <span className="font-medium">1-{displayedStudents.length}</span>{" "}
              of <span className="font-medium">{students.length}</span> students
            </div>
            <div className="flex flex-col items-end">
              <p className="text-xs text-gray-400 italic">
                Longitudinal analysis based on{" "}
                {subjectDetails.total_sessions_held} sessions held.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
