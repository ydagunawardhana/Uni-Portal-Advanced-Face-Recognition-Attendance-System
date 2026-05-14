import { useState, useEffect, useMemo } from "react";
import {
  Search,
  User,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileSpreadsheet,
} from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useLocation } from "react-router-dom";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import toast from "react-hot-toast";

interface AttendanceRecord {
  id: number;
  date: string;
  studentName: string;
  indexNumber: string;
  subject: string;
  timeIn: string;
  timeOut: string;
  status: "Present" | "Late" | "Left Early" | "Absent";
  photoUrl?: string;
}

export default function LecturerAttendanceHistory() {
  const location = useLocation();
  const passedState = location.state as any;

  // New Filter States - initialized from passedState if available
  const [selectedDegree, setSelectedDegree] = useState(
    passedState?.degree?.trim() || "all",
  );
  const [selectedSemester, setSelectedSemester] = useState(
    passedState?.semester?.trim() || "all",
  );
  const [selectedModule, setSelectedModule] = useState(
    passedState?.module?.trim() || "all",
  );
  const [selectedBatch, setSelectedBatch] = useState(
    passedState?.batch?.trim() || "all",
  );
  const [selectedDate, setSelectedDate] = useState(passedState?.date || "");
  const [searchQuery, setSearchQuery] = useState("");

  // Dropdown Options States
  const [filterOptions, setFilterOptions] = useState<{
    degrees: any[];
    semesters: any[];
    modules: any[];
    batches: any[];
  }>({
    degrees: [],
    semesters: [],
    modules: [],
    batches: [],
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = 12;

  const isFilterActive =
    selectedDegree !== "all" ||
    selectedSemester !== "all" ||
    selectedModule !== "all" ||
    selectedBatch !== "all" ||
    selectedDate !== "" ||
    searchQuery !== "";

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const lecturerToken = localStorage.getItem("lecturerToken");
        const response = await fetch(
          "http://localhost:8000/api/lecturer/filter-options",
          {
            headers: {
              Authorization: `Bearer ${lecturerToken}`,
            },
          },
        );
        if (response.ok) {
          const data = await response.json();
          console.log("Fetched Filter Options:", data);

          setFilterOptions({
            degrees: data.degrees || [],
            semesters: data.semesters || [],
            modules: data.modules || [],
            batches: data.batches || [],
          });
        } else {
          console.error("Failed to fetch options, Status:", response.status);
        }
      } catch (error) {
        console.error("Network error fetching filter options:", error);
        // Fallback so the UI doesn't break while debugging
        setFilterOptions({
          degrees: [{ name: "BSc (Hons) in Computer Science" }],
          semesters: [
            { name: "Year 1 - Semester 1" },
            { name: "Year 1 - Semester 2" },
          ],
          modules: [{ name: "Full Stack Development - (PUSL3120)" }],
          batches: [{ name: "23.2" }],
        });
      }
    };
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedDegree,
    selectedSemester,
    selectedModule,
    selectedBatch,
    selectedDate,
    searchQuery,
  ]);

  useEffect(() => {
    if (!isFilterActive) {
      setHistoryRecords([]);
      return;
    }

    const fetchRealData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (selectedDegree !== "all")
          queryParams.append("degree", selectedDegree);
        if (selectedSemester !== "all")
          queryParams.append("semester", selectedSemester);
        if (selectedModule !== "all")
          queryParams.append("module", selectedModule);
        if (selectedBatch !== "all") queryParams.append("batch", selectedBatch);
        if (selectedDate) queryParams.append("date", selectedDate);
        if (searchQuery) queryParams.append("search", searchQuery);
        queryParams.append("page", currentPage.toString());

        const lecturerToken = localStorage.getItem("lecturerToken");
        const response = await fetch(
          `http://localhost:8000/api/attendance/history?${queryParams.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${lecturerToken}`,
            },
          },
        );
        if (!response.ok) throw new Error("Failed to fetch attendance history");

        const data = await response.json();
        setHistoryRecords(data.records || data);
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(err.message || "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRealData();
  }, [
    selectedDegree,
    selectedSemester,
    selectedModule,
    selectedBatch,
    selectedDate,
    searchQuery,
    currentPage,
    isFilterActive,
  ]);

  const handleExportExcel = async () => {
    if (historyRecords.length === 0) {
      toast.error("No records to export. Apply a filter first.");
      return;
    }

    const toastId = toast.loading(
      "Preparing your professional Excel report...",
    );

    try {
      // 2.5s artificial delay for polished UX
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Attendance Portal";
      workbook.created = new Date();
      const ws = workbook.addWorksheet("Attendance History");

      ws.columns = [
        { key: "date", width: 15 },
        { key: "studentName", width: 30 },
        { key: "indexNumber", width: 20 },
        { key: "subject", width: 44 },
        { key: "timeIn", width: 14 },
        { key: "timeOut", width: 14 },
        { key: "status", width: 16 },
      ];

      ws.mergeCells("A1:G1");
      const titleCell = ws.getCell("A1");
      titleCell.value = "Attendance History Report";
      titleCell.font = {
        name: "Calibri",
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
      ws.getRow(1).height = 30;

      ws.mergeCells("A2:G2");
      const metaCell = ws.getCell("A2");
      const currentDate = new Date().toLocaleDateString("en-GB");
      metaCell.value = `Generated on: ${currentDate}  |  ${historyRecords.length} record(s) exported`;
      metaCell.font = {
        name: "Calibri",
        size: 10,
        italic: true,
        color: { argb: "FF374151" },
      };
      metaCell.alignment = { horizontal: "center" };
      metaCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEFF6FF" },
      };

      ws.addRow([]);

      const filterLabelStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, color: { argb: "FF1E40AF" } },
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFDBEAFE" },
        },
      };
      const filters: [string, string][] = [
        ["Degree", selectedDegree !== "all" ? selectedDegree : "All Degrees"],
        [
          "Semester",
          selectedSemester !== "all" ? selectedSemester : "All Semesters",
        ],
        ["Module", selectedModule !== "all" ? selectedModule : "All Modules"],
        ["Batch", selectedBatch !== "all" ? selectedBatch : "All Batches"],
        ["Date", selectedDate ? selectedDate : "All Dates"],
      ];
      filters.forEach(([label, value]) => {
        const row = ws.addRow([`${label} Filter:`, value]);
        Object.assign(row.getCell(1), filterLabelStyle);
        row.getCell(2).font = { italic: true };
      });

      ws.addRow([]);

      const headerRow = ws.addRow([
        "Date",
        "Student Name",
        "Index Number",
        "Subject",
        "Time In",
        "Time Out",
        "Status",
      ]);
      headerRow.height = 22;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF2563EB" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin", color: { argb: "FF1D4ED8" } },
          bottom: { style: "thin", color: { argb: "FF1D4ED8" } },
          left: { style: "thin", color: { argb: "FF1D4ED8" } },
          right: { style: "thin", color: { argb: "FF1D4ED8" } },
        };
      });

      const borderStyle: Partial<ExcelJS.Borders> = {
        top: { style: "hair", color: { argb: "FFE5E7EB" } },
        bottom: { style: "hair", color: { argb: "FFE5E7EB" } },
        left: { style: "hair", color: { argb: "FFE5E7EB" } },
        right: { style: "hair", color: { argb: "FFE5E7EB" } },
      };

      const rowFillEven: ExcelJS.Fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF9FAFB" },
      };
      const rowFillOdd: ExcelJS.Fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFFFFF" },
      };

      historyRecords.forEach((record, idx) => {
        const subjectDisplay = record.module_code
          ? `${record.module_code} — ${record.subject}`
          : record.subject || "--";

        const dataRow = ws.addRow([
          record.date || "--",
          record.studentName || record.student_name || "--",
          record.indexNumber || record.index_number || "--",
          subjectDisplay,
          record.timeIn || record.time_in || "--",
          record.timeOut || record.time_out || "--",
          record.status || "--",
        ]);

        dataRow.eachCell((cell) => {
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: false,
          };
          cell.border = borderStyle as ExcelJS.Borders;
          cell.fill = idx % 2 === 0 ? rowFillEven : rowFillOdd;
        });

        const statusCell = dataRow.getCell(7);
        statusCell.font = {
          bold: true,
          color: {
            argb:
              record.status === "Present"
                ? "FF15803D"
                : record.status === "Absent"
                  ? "FFDC2626"
                  : "FFD97706",
          },
        };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const modulePart = selectedModule !== "all" ? `_${selectedModule}` : "";
      const batchPart = selectedBatch !== "all" ? `_Batch${selectedBatch}` : "";
      const datePart = new Date().toISOString().split("T")[0];
      const fileName = `Attendance_Report${modulePart}${batchPart}_${datePart}.xlsx`;

      saveAs(blob, fileName);
      toast.success(`Report downloaded: ${fileName}`, {
        id: toastId,
        duration: 4000,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to generate Excel report.", { id: toastId });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getAvatarColor = (id: number) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-indigo-500",
    ];
    return colors[id % colors.length];
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Degree
            </label>
            <select
              value={selectedDegree}
              onChange={(e) => setSelectedDegree(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl cursor-pointer font-semibold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">All Degrees</option>
              {filterOptions.degrees?.map((deg: any, i) => (
                <option key={i} value={deg.name?.trim() || deg}>
                  {deg.name || deg}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl cursor-pointer font-semibold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">All Semesters</option>
              {filterOptions.semesters?.map((sem: any, i) => (
                <option key={i} value={sem.name?.trim() || sem}>
                  {sem.name || sem}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Module
            </label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 cursor-pointer rounded-xl font-semibold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">All Modules</option>
              {filterOptions.modules?.map((mod: any, i) => {
                // Always use just the code as the value for exact backend matching
                const code = mod.code || mod.module_code || "";
                const name = mod.name || mod.module_name || code;
                return (
                  <option key={i} value={code}>
                    {code} — {name}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Batch
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 cursor-pointer rounded-xl font-semibold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">All Batches</option>
              {filterOptions.batches?.map((batch: any, i) => (
                <option key={i} value={batch.name?.trim() || batch}>
                  {batch.name || batch}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 cursor-pointer rounded-xl font-semibold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Student
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                <Search className="w-4 h-4 mx-2 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name or ID..."
                className="w-full px-8 py-2 pl-8 border border-gray-300 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Export Button Row */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleExportExcel}
            disabled={historyRecords.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-md transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-5 h-5" />
            Export to Excel
          </button>
        </div>
      </div>

      {/* Data Table */}
      {!isFilterActive ? (
        <div className="bg-white rounded-xl border-4 border-dashed border-gray-400 p-10 flex flex-col items-center justify-center text-center">
          <div className="bg-blue-50 p-6 rounded-full mb-6">
            <Filter className="w-12 h-12 text-blue-500 animate-pulse" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">
            Select Filters to View History
          </h3>
          <p className="text-gray-500 max-w-md font-medium leading-relaxed">
            Please select a Subject, Session, or Date range from the filter menu
            above to load the attendance records.
          </p>
        </div>
      ) : isLoading ? (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-10 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-bold tracking-wide">
            Fetching Real-time Records...
          </p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-10 flex flex-col items-center justify-center text-center">
          <div className="bg-red-50 p-6 rounded-full mb-6">
            <Search className="w-12 h-12 text-red-500" />
          </div>
          <h3 className="text-2xl font-bold text-red-800 mb-3">
            Error Loading Data
          </h3>
          <p className="text-red-500 max-w-md font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Student Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Index Number
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Subject
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Time In
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Time Out
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {historyRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-gray-500 font-medium"
                    >
                      No records found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  historyRecords.map((record, index) => (
                    <tr
                      key={record.id || index}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">
                        {record.date}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          {record.photoUrl || record.avatar ? (
                            <ImageWithFallback
                              src={record.photoUrl || record.avatar}
                              alt={record.studentName || record.student_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className={`w-10 h-10 ${getAvatarColor(
                                index,
                              )} rounded-full flex items-center justify-center text-white font-medium text-sm`}
                            >
                              {getInitials(
                                record.studentName ||
                                  record.student_name ||
                                  "Unknown",
                              )}
                            </div>
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {record.studentName ||
                              record.student_name ||
                              "Unknown Student"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm  font-bold text-gray-600">
                        {record.indexNumber || record.index_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                        {record.module_code
                          ? `${record.module_code} - ${record.subject}`
                          : record.subject}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-bold">
                        {record.timeIn || record.time_in}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-bold">
                        {record.timeOut || record.time_out}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${
                            record.status === "Present"
                              ? "bg-green-100 text-green-700"
                              : record.status === "Late"
                                ? "bg-yellow-100 text-yellow-700"
                                : record.status === "Left Early"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-red-100 text-red-600"
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {historyRecords.length} records
            </div>
            <div className="flex items-center space-x-2">
              <button
                aria-label="Previous Page"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg border transition-colors ${
                  currentPage === 1
                    ? "border-gray-200 text-gray-400 cursor-not-allowed"
                    : "border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-1">
                {[1, 2, 3, "...", totalPages].map((page, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      typeof page === "number" && setCurrentPage(page)
                    }
                    disabled={page === "..."}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      page === currentPage
                        ? "bg-blue-600 text-white"
                        : page === "..."
                          ? "text-gray-400 cursor-default"
                          : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                aria-label="current Page"
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg border transition-colors ${
                  currentPage === totalPages
                    ? "border-gray-200 text-gray-400 cursor-not-allowed"
                    : "border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
