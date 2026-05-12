import { useState, useEffect, useMemo } from "react";
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
  RotateCcw,
} from "lucide-react";
import { toast } from "react-hot-toast";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const universityData: Record<string, string[]> = {
  "Faculty of Computing": [
    "Department of Software Engineering & Computer Security",
    "Department of Computer and Data Science",
  ],
  "Faculty of Business": [
    "Department of Accounting & Finance",
    "Department of Management",
    "Department of Marketing and Tourism",
    "Department of Operations and Logistics",
    "Department of Legal Studies",
  ],
  "Faculty of Engineering": [
    "Department of Mechatronic and Industrial Engineering",
    "Department of Design Studies",
    "Department of Electrical, Electronic & Systems Engineering",
  ],
  "Faculty of Health and Life Science": [
    "Department of Health Sciences",
    "Department of Life Sciences",
  ],
};

const degreeMapping: Record<string, string[]> = {
  "Department of Software Engineering & Computer Security": [
    "BSc (Hons) in Software Engineering",
    "BSc (Hons) in Computer Networks",
    "BSc (Hons) Computer Security",
    "BSc (Hons) Technology Management",
    "Bachelor of Information Technology (Major in Cyber Security)",
    "Foundation Programme for Bachelor's Degree",
  ],
  "Department of Computer and Data Science": [
    "BSc (Hons) in Computer Science",
    "BSc (Hons) in Data Science",
    "BSc (Hons) Artificial Intelligence",
    "BSc in Management Information Systems (Special)",
  ],
  "Department of Management": [
    "BM (Honors) in Business Analytics",
    "BM (Honors) in Applied Economics",
    "BSc in Business Management (Industrial Management) (Special)",
    "BSc in Business Management (Project Management) (Special)",
    "BSc in Business Management (Human Resource Management) (Special)",
    "BSc (Hons) International Management and Business",
    "BSc (Hons) Business Communication",
    "BA in Business Communication",
    "BSc in Multimedia",
    "Bachelor of Business",
    "Bachelor of Science in Business Administration (BSBA)",
    "Foundation Programme for Bachelor's Degree",
  ],
  "Department of Accounting & Finance": [
    "BM (Hons) in Accounting and Finance",
    "BSc (Hons) Accounting and Finance",
  ],
  "Department of Marketing and Tourism": [
    "BM (Hons) in Marketing Management",
    "BBM (Hons) Tourism, Hospitality & Events",
    "BSc (Hons) Marketing Management",
    "BSc (Hons) Events, Tourism and Hospitality Management",
  ],
  "Department of Operations and Logistics": [
    "BSc in Business Management (Logistics Management) (Special)",
    "BSc (Hons) Operations and Logistics Management",
    "Bachelor of Business: Management and Innovation & Supply Chain and Logistics Management",
  ],
  "Department of Legal Studies": [
    "Bachelor of Laws (Honours)",
    "BM (Hons) in Law and Business Studies",
    "BM (Hons.) in Law and International Trade",
    "BM (Hons) in Law and E-Commerce",
    "LLB (Hons) Law",
  ],
  "Department of Electrical, Electronic & Systems Engineering": [
    "Bachelor of Science of Engineering Honours in Electrical and Electronic Engineering",
    "Bachelor of Science of Engineering Honours in Computer Engineering",
    "BEng (Hons) Electrical, Electronics, and Communication Engineering",
    "Foundation Programme for Bachelor's Degree",
  ],
  "Department of Mechatronic and Industrial Engineering": [
    "Bachelor of Science of Engineering Honours in Mechatronic Engineering",
    "BEng (Hons) Mechanical and Mechatronics",
    "BEng (Hons) Robotics and Automation Engineering",
    "BEng (Hons) Civil and Structural Engineering",
    "BSc (Hons) Quantity Surveying",
  ],
  "Department of Design Studies": [
    "Bachelor of Interior Design",
    "BA (Hons) in Interior Design",
  ],
  "Department of Health Sciences": [
    "BSc (Hons) in Biomedical Science",
    "BSc (Hons) Biomedical Science",
    "BSc (Honours) in Pharmaceutical Science",
    "BSc (Hons) Nutrition and Health",
    "BSc (Hons) Nursing",
    "Foundation Programme for Bachelor's Degree",
  ],
  "Department of Life Sciences": ["BSc (Hons) Psychology"],
};

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

export default function AdminReports({
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [lecturerType, setLecturerType] = useState("all");
  const [filterFaculty, setFilterFaculty] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterDegree, setFilterDegree] = useState("all");
  const [filterLecturerName, setFilterLecturerName] = useState("all");
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [selectedModule, setSelectedModule] = useState("all");
  const [availableModules, setAvailableModules] = useState<any[]>([]);
  const [allLecturers, setAllLecturers] = useState<any[]>([]);
  const [allBatches, setAllBatches] = useState<any[]>([]);
  const availableBatches = useMemo(() => {
    return allBatches.filter(
      (batch) => filterDegree === "all" || batch.degree === filterDegree,
    );
  }, [allBatches, filterDegree]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<StudentRecord[]>(
    [],
  );
  const [subjectDetails, setSubjectDetails] = useState({
    total_students: 0,
    total_sessions_held: 0,
  });

  const fetchAttendance = async () => {
    const moduleCode = subject?.module_code || selectedModule;

    // CRITICAL FIX: Clear stale data when module or session placeholder is active
    if (!moduleCode || moduleCode === "all" || selectedSessionId === "") {
      setAttendanceRecords([]);
      setSubjectDetails({ total_students: 0, total_sessions_held: 0 });
      return;
    }

    setIsLoading(true);
    try {
      const token =
        localStorage.getItem("adminToken") ||
        localStorage.getItem("lecturerToken");

      const params = new URLSearchParams();
      const batch = subject?.batch || selectedBatch;
      if (batch && batch !== "all") params.append("batch", batch);
      if (lecturerType && lecturerType !== "all")
        params.append("lecturer_type", lecturerType);

      if (selectedSessionId !== "" && selectedSessionId !== "Overall") {
        params.append("session_id", selectedSessionId);
        if (fromDate) params.append("date", fromDate);
      }

      const res = await fetch(
        `http://localhost:8000/api/lecturer/attendance/${moduleCode}?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();

      const formattedRecords = (data.students || []).map((record: any) => ({
        ...record,
        total_sessions: parseInt(record.total_sessions, 10) || 0,
        attended_sessions: parseInt(record.attended_sessions, 10) || 0,
      }));

      setAttendanceRecords(formattedRecords);
      setSubjectDetails(
        data.subject_details || { total_students: 0, total_sessions_held: 0 },
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to load attendance records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token =
          localStorage.getItem("adminToken") ||
          localStorage.getItem("lecturerToken");

        // Fetch Modules
        const modRes = await fetch(`http://localhost:8000/api/admin/modules`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (modRes.ok) {
          const data = await modRes.json();
          setAvailableModules(data);
        }

        // Fetch Lecturers
        const lecRes = await fetch(
          `http://localhost:8000/api/admin/lecturers`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (lecRes.ok) {
          const data = await lecRes.json();
          setAllLecturers(data);
        }
        // Fetch Batches
        const batchRes = await fetch(
          `http://localhost:8000/api/admin/batches`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (batchRes.ok) {
          const data = await batchRes.json();
          setAllBatches(data);
        }
      } catch (err) {
        console.error("Error fetching initial data:", err);
      }
    };

    fetchInitialData();
  }, []);

  // Cascading Logic
  useEffect(() => {
    setFilterDepartment("all");
    setFilterDegree("all");
    setFilterLecturerName("all");
    setSelectedModule("all");
  }, [filterFaculty]);

  useEffect(() => {
    setFilterDegree("all");
    setFilterLecturerName("all");
    setSelectedModule("all");
  }, [filterDepartment]);

  useEffect(() => {
    setFilterLecturerName("all");
    setSelectedModule("all");
    setSelectedBatch("all");
  }, [filterDegree]);

  useEffect(() => {
    setFilterLecturerName("all");
  }, [lecturerType]);

  useEffect(() => {
    setSelectedSessionId("");
  }, [selectedBatch, selectedModule]);

  useEffect(() => {
    fetchAttendance();
  }, [
    subject?.module_code,
    fromDate,
    selectedSessionId,
    riskFilter,
    lecturerType,
    selectedBatch,
    selectedModule,
    filterFaculty,
    filterDepartment,
    filterDegree,
    filterLecturerName,
  ]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const token =
          localStorage.getItem("adminToken") ||
          localStorage.getItem("lecturerToken");

        const moduleCode = subject?.module_code || selectedModule;
        const batch = subject?.batch || selectedBatch;

        const response = await fetch(
          `http://localhost:8000/api/attendance/sessions?module_code=${moduleCode || ""}&batch_id=${batch !== "all" ? batch : ""}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (response.ok) {
          const data = await response.json();
          setSessions(data.sessions || []);
        }
      } catch (error) {
        console.error("Network error fetching sessions", error);
      }
    };

    const moduleCode = subject?.module_code || selectedModule;
    const batch = subject?.batch || selectedBatch;

    if (moduleCode && moduleCode !== "all") {
      fetchSessions();
    }
  }, [subject?.module_code, subject?.batch, selectedModule, selectedBatch]);

  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sessionId = e.target.value;
    setSelectedSessionId(sessionId);

    if (sessionId !== "" && sessionId !== "Overall") {
      const selectedSession = sessions.find(
        (s) => s.session_id.toString() === sessionId,
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
    setSelectedSessionId(""); // Reset session dropdown when date is manually picked
  };

  const handleRefresh = async () => {
    if (filterDegree === "all") {
      toast.error("Please select a Degree first to sync data.");
      return;
    }
    setIsRefreshing(true);
    await fetchAttendance();
    setIsRefreshing(false);
    toast.success("Attendance records synced");
  };

  const handleResetFilters = () => {
    setFilterFaculty("all");
    setFilterDepartment("all");
    setFilterDegree("all");
    setLecturerType("all");
    setFilterLecturerName("all");
    setSelectedBatch("all");
    setSelectedModule("all");
    setSelectedSessionId("");
    setSearchQuery("");
    setRiskFilter("all");
    setFromDate(getLocalDateString());
    setAttendanceRecords([]);
    setSubjectDetails({ total_students: 0, total_sessions_held: 0 });
    toast.success("Filters cleared");
  };

  const displayedStudents = useMemo(() => {
    return attendanceRecords.filter((s) => {
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
        (s as any).student_id
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());

      return matchesRisk && matchesSearch;
    });
  }, [
    attendanceRecords,
    riskFilter,
    searchQuery,
    subjectDetails.total_sessions_held,
  ]);

  // Dynamic Stats Calculation (As requested by USER)
  const filteredStats = useMemo(() => {
    // 1. Currently Enrolled
    const enrolled = attendanceRecords.length;

    // 2. Average Attendance
    let attendanceVal = "0%";
    if (enrolled > 0) {
      if (selectedSessionId !== "Overall") {
        const presentCount = attendanceRecords.filter(
          (r) => r.status?.toLowerCase() === "present",
        ).length;
        attendanceVal = Math.round((presentCount / enrolled) * 100) + "%";
      } else {
        const avg =
          attendanceRecords.reduce(
            (acc, s) => acc + (s.attendance_percentage || 0),
            0,
          ) / enrolled;
        attendanceVal = Math.round(avg) + "%";
      }
    }

    // 3. Action Needed
    const actionNeeded = attendanceRecords.filter((s) => {
      if (selectedSessionId !== "Overall")
        return s.status?.toLowerCase() === "absent";
      return (s.attendance_percentage || 0) < 70;
    }).length;

    return { enrolled, attendance: attendanceVal, actionNeeded };
  }, [attendanceRecords, selectedSessionId]);

  const handleExportExcel = async () => {
    if (filterDegree === "all") {
      toast.error(
        "Please filter down to at least a specific Degree before exporting data.",
      );
      return;
    }
    if (!displayedStudents || displayedStudents.length === 0) {
      toast.error("No records to export. Adjust your filters and try again.");
      return;
    }

    const toastId = toast.loading("Preparing your Excel report...");

    try {
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Attendance Report");

      const isOverall = selectedSessionId === "Overall";
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
        (r) => (parseFloat(String(r.attendance_percentage)) || 0) >= 70,
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
        (r) => (parseFloat(String(r.attendance_percentage)) || 0) < 20,
      ).length;

      // --- Section 1: Main Titles ---
      const selectedModuleObj = availableModules.find(
        (m) => m.module_code === (subject?.module_code || selectedModule),
      );
      const moduleDisplayName =
        subject?.module_name ||
        selectedModuleObj?.module_name ||
        (selectedModule === "all" ? "All Modules" : selectedModule);
      const batchDisplayName =
        subject?.batch ||
        (selectedBatch !== "all" ? selectedBatch : "All Batches");

      worksheet.mergeCells("A1", `${maxCol}1`);
      const titleCell = worksheet.getCell("A1");
      const displayModuleCode =
        subject?.module_code ||
        (selectedModule !== "all" ? selectedModule : "All Modules");
      titleCell.value = `Attendance Report: ${displayModuleCode} - ${moduleDisplayName} - ${batchDisplayName}`;
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
      worksheet.getCell("A2").value =
        `Generated on: ${new Date().toLocaleDateString()} | View: ${isOverall ? "Overall Summary" : `Session on ${fromDate}`}`;
      worksheet.getCell("A2").font = { italic: true };
      worksheet.getCell("A2").alignment = { horizontal: "center" };

      // --- Section 2: Side-by-Side Dashboard (Rows 4 to 8) ---
      // Left Side: Module Info
      const setInfo = (cell: string, value: any, bold = false) => {
        const c = worksheet.getCell(cell);
        c.value = value;
        if (bold) c.font = { bold: true };
      };

      setInfo("A4", "Module:", true);
      setInfo("B4", moduleDisplayName);
      setInfo("A5", "Degree:", true);
      setInfo(
        "B5",
        subject?.degree ||
          (filterDegree !== "all" ? filterDegree : "All Degrees"),
      );
      setInfo("A6", "Semester:", true);
      setInfo("B6", subject?.semester || selectedModuleObj?.level || "N/A");
      setInfo("A7", "Lecturer:", true);
      setInfo(
        "B7",
        filterLecturerName !== "all" ? filterLecturerName : "All Lecturers",
      );
      setInfo("A8", "Total Enrolled:", true);
      setInfo("B8", enrolledCount);
      setInfo("A9", "Total Present:", true);
      setInfo("B9", presentCount);
      setInfo("A10", "Total Absent:", true);
      setInfo("B10", absentCount);
      setInfo("A11", "Faculty:", true);
      setInfo("B11", filterFaculty !== "all" ? filterFaculty : "All Faculties");
      setInfo("A12", "Department:", true);
      setInfo(
        "B12",
        filterDepartment !== "all" ? filterDepartment : "All Departments",
      );
      setInfo("A13", "Risk Filter:", true);
      setInfo(
        "B13",
        riskFilter === "all"
          ? "All Students"
          : riskFilter.charAt(0).toUpperCase() + riskFilter.slice(1),
      );
      setInfo("A14", "Search Query:", true);
      setInfo("B14", searchQuery || "None");

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
        colorHex: string,
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
              `${parseFloat(String(record.attendance_percentage || 0)).toFixed(1)}%`,
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

          // Specific formatting for Single Session View
          if (!isOverall) {
            if (colNumber === 5) {
              // Status Column
              const status = cell.value?.toString().toLowerCase();
              if (status === "present")
                cell.font = { color: { argb: "FF16A34A" }, bold: true };
              if (status === "absent" || status === "flagged")
                cell.font = { color: { argb: "FFDC2626" }, bold: true };
            }
            if (colNumber === 8 && cell.value !== "-") {
              // Reason Column (Highlight issues in red text)
              cell.font = { color: { argb: "FFDC2626" }, italic: true };
            }
          }
          // Specific formatting for Overall View
          else {
            if (colNumber === 6) {
              // Percentage Column — 4-tier colour coding
              const percentage = parseFloat(
                cell.value?.toString().replace("%", "") || "0",
              );
              if (percentage >= 70)
                cell.font = { color: { argb: "FF16A34A" }, bold: true }; // green
              else if (percentage >= 50)
                cell.font = { color: { argb: "FFEAB308" }, bold: true }; // yellow
              else if (percentage >= 20)
                cell.font = { color: { argb: "FFF97316" }, bold: true }; // orange
              else cell.font = { color: { argb: "FFDC2626" }, bold: true }; // red
            }
          }
        });
      });

      // Export
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const safeModuleCode =
        subject?.module_code ||
        (selectedModule !== "all" ? selectedModule : "All_Modules");
      const safeBatch = (
        subject?.batch ||
        (selectedBatch !== "all" ? selectedBatch : "All_Batches")
      ).replace(/\s+/g, "");
      const viewType = isOverall ? "Overall" : fromDate;
      const datePart = new Date().toISOString().split("T")[0];

      saveAs(
        blob,
        `Attendance_${safeModuleCode}_Batch${safeBatch}_${viewType}_${datePart}.xlsx`,
      );

      if (toast.dismiss) toast.dismiss(toastId);
      toast.success(
        `Report downloaded: ${displayedStudents.length} record(s) exported.`,
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

  const isModuleLocked = filterDegree === "all" && filterLecturerName === "all";

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500 ease-out animate-in fade-in slide-in-from-bottom-4">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 cursor-pointer text-gray-500 hover:text-blue-600 transition-colors font-medium group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Back
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Attendance Reports
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Comprehensive overview across all modules and faculties.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-bold text-gray-700">Academic Year</p>
            <p className="text-xl font-bold text-blue-600">2026</p>
          </div>
          <div className="h-10 w-[2px] bg-gray-200"></div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-700">Current Semester</p>
            <p className="text-xl font-bold text-blue-600">Semester 2</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-blue-50 p-6 rounded-2xl shadow-sm border-2 border-blue-200 flex items-center gap-5 hover:shadow-md transition-all">
          <div className="h-14 w-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
            <User className="w-8 h-8" />
          </div>
          <div>
            <p className="text-md font-bold text-gray-600 tracking-wider">
              Currently Enrolled
            </p>
            <div className="text-3xl font-bold text-gray-900 mt-1">
              {filteredStats.enrolled}
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-6 rounded-2xl shadow-sm border-2 border-green-200 flex items-center gap-5 hover:shadow-md transition-all">
          <div className="h-14 w-14 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-md font-bold text-gray-600 tracking-wider">
              Average Attendance
            </p>
            <div className="text-3xl font-bold text-gray-900 mt-1">
              {filteredStats.attendance}
            </div>
          </div>
        </div>

        <div className="bg-red-50 p-6 rounded-2xl shadow-sm border-2 border-red-200 flex items-center gap-5 hover:shadow-md transition-all">
          <div className="h-14 w-14 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
            <AlertTriangle className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <p className="text-md font-bold text-red-600 tracking-wider">
              Action Needed (&lt; 70%)
            </p>
            <div className="text-3xl font-bold text-red-600 mt-1">
              {filteredStats.actionNeeded}{" "}
              <span className="text-lg font-medium text-red-600">Students</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl border-2 border-gray-100 shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-4">
          {/* 1. Faculty Dropdown */}
          <div>
            <label className="block text-sm font-bold text-gray-800 tracking-wider mb-1.5">
              Select Faculty
            </label>
            <select
              value={filterFaculty}
              onChange={(e) => setFilterFaculty(e.target.value)}
              className="w-full h-[42px] px-3 py-2 border cursor-pointer border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
            >
              <option value="all">All Faculties</option>
              {Object.keys(universityData).map((fac) => (
                <option key={fac} value={fac}>
                  {fac}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Department Dropdown */}
          <div>
            <label className="block text-sm font-bold text-gray-800 tracking-wider mb-1.5">
              Select Department
            </label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              disabled={filterFaculty === "all"}
              className="w-full h-[42px] px-3 py-2 border cursor-pointer border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <option value="all">All Departments</option>
              {filterFaculty !== "all" &&
                universityData[filterFaculty]?.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
            </select>
          </div>

          {/* 3. Degree Dropdown */}
          <div>
            <label className="block text-sm font-bold text-gray-800 tracking-wider mb-1.5">
              Select Degree
            </label>
            <select
              value={filterDegree}
              onChange={(e) => setFilterDegree(e.target.value)}
              disabled={filterDepartment === "all"}
              className="w-full h-[42px] px-3 py-2 border border-gray-300 cursor-pointer rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <option value="all">All Degrees</option>
              {filterDepartment !== "all" &&
                degreeMapping[filterDepartment]?.map((deg) => (
                  <option key={deg} value={deg}>
                    {deg}
                  </option>
                ))}
            </select>
          </div>

          {/* 4. Lecturer Type */}
          <div>
            <label className="block text-sm font-bold text-gray-800 tracking-wider mb-1.5">
              Lecturer Type
            </label>
            <select
              value={lecturerType}
              onChange={(e) => setLecturerType(e.target.value)}
              className="w-full h-[42px] px-3 py-2 border cursor-pointer border-gray-300 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
              <option value="all">All Types</option>
              <option value="internal">Internal Staff</option>
              <option value="visiting">Visiting Lecturers</option>
            </select>
          </div>

          {/* 5. Lecturer Name */}
          <div>
            <label className="block text-sm font-bold text-gray-800 tracking-wider mb-1.5">
              Lecturer Name
            </label>
            <select
              value={filterLecturerName}
              onChange={(e) => setFilterLecturerName(e.target.value)}
              className="w-full h-[42px] px-3 py-2 border cursor-pointer border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
            >
              <option value="all">All Lecturers</option>
              {allLecturers
                .filter((l) => {
                  const matchesFaculty =
                    filterFaculty === "all" || l.faculty === filterFaculty;
                  const matchesDept =
                    filterDepartment === "all" ||
                    l.department === filterDepartment;
                  const matchesType =
                    lecturerType === "all" ||
                    (lecturerType === "visiting"
                      ? l.is_visiting
                      : !l.is_visiting);
                  return matchesFaculty && matchesDept && matchesType;
                })
                .map((l) => (
                  <option key={l.id} value={l.name}>
                    {l.name}
                  </option>
                ))}
            </select>
          </div>

          {/* 6. Select Batch */}
          <div className="flex flex-col relative">
            <label className="block text-sm font-bold text-gray-800 tracking-wider mb-1.5">
              Select Batch
            </label>
            {filterDegree === "all" && (
              <div
                className="absolute inset-0 top-6 z-10 cursor-not-allowed"
                onClick={() =>
                  toast.error(
                    "Please select a Degree first to view its batches.",
                  )
                }
              ></div>
            )}
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              disabled={filterDegree === "all"}
              className={`w-full h-[42px] px-3 py-2 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed ${filterDegree === "all" ? "border-gray-200" : "border-gray-300 cursor-pointer"}`}
            >
              <option value="all">
                {filterDegree === "all" ? "Select Degree First" : "All Batches"}
              </option>
              {availableBatches.map((batch) => (
                <option key={batch.name} value={batch.name}>
                  Batch {batch.name}
                </option>
              ))}
            </select>
          </div>

          {/* 7. Select Module */}
          <div className="flex flex-col relative">
            <label className="block text-sm font-bold text-gray-800 tracking-wider mb-1.5">
              Select Module
            </label>
            {isModuleLocked && (
              <div
                className="absolute inset-0 top-6 z-10 cursor-not-allowed"
                onClick={() =>
                  toast.error(
                    "Please select a Degree or a Lecturer first to view modules.",
                  )
                }
              ></div>
            )}
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              disabled={isModuleLocked}
              className={`w-full h-[42px] px-3 py-2 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed ${isModuleLocked ? "border-gray-200" : "border-gray-300 cursor-pointer"}`}
            >
              {isModuleLocked ? (
                <option value="all">Select Degree/Lecturer First</option>
              ) : (
                <>
                  <option value="all">All Modules</option>
                  {availableModules
                    .filter((mod) => {
                      const matchesFaculty =
                        filterFaculty === "all" ||
                        mod.faculty === filterFaculty;
                      const matchesDept =
                        filterDepartment === "all" ||
                        mod.department === filterDepartment;

                      // 1. Check Degree (comma-separated in DB)
                      const matchesDegree =
                        filterDegree === "all" ||
                        (mod.degree && mod.degree.includes(filterDegree));

                      // 2. Check Lecturer (If a lecturer is selected, find their assigned subjects)
                      let matchesLecturer = true;
                      if (filterLecturerName !== "all") {
                        const selectedLecturer = allLecturers.find(
                          (l) => l.name === filterLecturerName,
                        );
                        if (
                          selectedLecturer &&
                          selectedLecturer.assigned_subjects
                        ) {
                          // Check if this module's code is in the lecturer's assigned_subjects string
                          matchesLecturer =
                            selectedLecturer.assigned_subjects.includes(
                              mod.module_code,
                            );
                        } else {
                          matchesLecturer = false; // Lecturer has no subjects
                        }
                      }

                      return (
                        matchesFaculty &&
                        matchesDept &&
                        matchesDegree &&
                        matchesLecturer
                      );
                    })
                    .map((mod) => (
                      <option key={mod.id} value={mod.module_code}>
                        {mod.module_code} - {mod.module_name}
                      </option>
                    ))}
                </>
              )}
            </select>
          </div>

          {/* 8. Select Session */}
          <div className="flex flex-col relative">
            <label className="block text-sm font-bold text-gray-800 tracking-wider mb-1.5">
              Select Session
            </label>
            {selectedModule === "all" && (
              <div
                className="absolute inset-0 top-6 z-10 cursor-not-allowed"
                onClick={() =>
                  toast.error(
                    "Please select a Module first to view its sessions.",
                  )
                }
              ></div>
            )}
            <select
              value={selectedSessionId}
              onChange={handleSessionChange}
              disabled={selectedModule === "all"}
              className={`w-full h-[42px] px-3 py-2 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed ${selectedModule === "all" ? "border-gray-200" : "border-gray-300 cursor-pointer"}`}
            >
              {selectedModule === "all" ? (
                <option value="">Select a Module First</option>
              ) : (
                <>
                  <option value="">Select a Session</option>
                  <option value="Overall">All Sessions (Overall)</option>
                  {sessions.map((session) => (
                    <option key={session.session_id} value={session.session_id}>
                      {session.session_type} ({session.date})
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* 9. Select Date */}
          <div className="flex flex-col relative">
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
                disabled={
                  selectedSessionId === "" || selectedSessionId === "Overall"
                }
                className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm h-[42px] ${
                  selectedSessionId === "" || selectedSessionId === "Overall"
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                    : "bg-white cursor-pointer border-gray-300"
                }`}
              />
            </div>
          </div>

          {/* 10. Search Student */}
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
                className="w-full pl-10 pr-4 py-2 border cursor-pointer border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm h-[42px]"
              />
            </div>
          </div>

          {/* 11. Risk Filter */}
          <div>
            <label className="block text-sm font-bold text-gray-800 tracking-wider mb-1.5">
              Risk Filter
            </label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className={`w-full h-[42px] px-3 py-2 border cursor-pointer rounded-xl text-sm font-bold outline-none transition-colors duration-200 ${getRiskDropdownColor(riskFilter)}`}
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
        <div className="flex flex-wrap items-center justify-end gap-4 mt-6">
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl shadow-sm hover:bg-red-500 hover:shadow-md text-red-600 font-bold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Filters
            </button>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl shadow-sm hover:bg-gray-100 text-gray-700 font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-600" : "text-gray-500"}`}
              />
              Refresh
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center space-x-2 px-5 cursor-pointer py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-md font-bold"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>Export to Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Report Data Table */}
      {attendanceRecords.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 border-b-1 border-gray-300">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 tracking-wider">
                    Student Details
                  </th>

                  {selectedSessionId === "Overall" ? (
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

                  {selectedSessionId === "Overall" ? (
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
                      <span className="px-3 py-1 rounded-full text-sm font-bold bg-gray-100 text-gray-700">
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

                        {selectedSessionId === "Overall" ? (
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
                        {selectedSessionId === "Overall" ? (
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
                                    width: `${subjectDetails.total_sessions_held === 0 ? 0 : student.attendance_percentage}%`,
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

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing{" "}
              <span className="font-medium">1-{displayedStudents.length}</span>{" "}
              of <span className="font-medium">{attendanceRecords.length}</span>{" "}
              students
            </div>
            <div className="flex flex-col items-end">
              <p className="text-xs text-gray-400 italic">
                Analysis based on {subjectDetails.total_sessions_held} sessions
                held.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border-4 border-dashed border-gray-400 mt-4 shadow-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <CalendarX className="w-10 h-10 text-gray-400 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            No Records Found
          </h3>
          <p className="text-gray-500 text-sm font-medium text-center">
            Please select a Faculty, Department, and Degree to view available
            modules and attendance data.
          </p>
        </div>
      )}
    </div>
  );
}
