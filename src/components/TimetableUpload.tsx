import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Download,
  Calendar,
  Layers,
  X,
  FileText,
  RotateCcw,
  GraduationCap,
  School,
  Library,
  ChevronDown,
  Eye,
  Trash2,
  Loader2,
  Edit,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";

export default function TimetableUpload() {
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [startDate, setStartDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview States
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [fullExtractedData, setFullExtractedData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);

  // New Validation Error States
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

  // Live History & UX States
  const [recentUploads, setRecentUploads] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteBatchId, setDeleteBatchId] = useState<string | null>(null);

  // View Modal States
  const [viewBatchId, setViewBatchId] = useState<string | null>(null);
  const [viewData, setViewData] = useState<any[]>([]);
  const [isLoadingView, setIsLoadingView] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isViewModalHidden, setIsViewModalHidden] = useState(false);

  const handleEditClick = (session: any) => {
    setEditingSession(session);
    setIsEditModalOpen(true);
    setIsViewModalHidden(true); // Hide view modal to prevent overlap
  };

  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
    setEditingSession(null);
    setIsViewModalHidden(false); // Re-open the preview modal ONLY on cancel
  };

  const handleUpdateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // 1. Show loading toast
    const loadingToastId = toast.loading("Updating session details...");

    // 2. Add artificial delay (1s) for tactile feedback
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      const response = await fetch(
        `http://localhost:8000/api/admin/timetable/${editingSession.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
          },
          body: JSON.stringify({
            date: editingSession.date,
            start_time: editingSession.start_time,
            end_time: editingSession.end_time,
            lecturer: editingSession.lecturer,
            module_code: editingSession.module_code,
            module_name: editingSession.module_name,
          }),
        },
      );

      const errorData = await response.json().catch(() => ({}));

      if (response.ok) {
        // 3. Replace loading toast with success toast
        toast.success("Timetable updated successfully!", {
          id: loadingToastId,
        });
        setIsEditModalOpen(false);
        setViewBatchId(null); // Close the preview modal
        setIsViewModalHidden(false); // Reset hidden state

        // Refresh the table data silently
        if (viewBatchId) handleViewBatch(viewBatchId, false);
      } else {
        // 4. Replace loading toast with specific backend error
        toast.error(
          errorData.detail ||
            "Failed to update timetable. Please check your inputs.",
          {
            id: loadingToastId,
            duration: 5000,
            style: {
              fontWeight: "bold",
            },
          },
        );
      }
    } catch (error) {
      toast.error("Network error. Please try again.", { id: loadingToastId });
    } finally {
      setIsSaving(false); // Reset loading state
    }
  };

  // Fetch recent uploads on mount
  useEffect(() => {
    fetchRecentUploads();
  }, []);

  const fetchRecentUploads = async () => {
    try {
      const response = await fetch(
        "http://localhost:8000/api/timetable/recent",
      );
      if (response.ok) {
        const data = await response.json();
        setRecentUploads(data);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  const universityData: Record<string, Record<string, string[]>> = {
    "Faculty of Computing": {
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
    },
    "Faculty of Business": {
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
      "Department of Accounting and Finance": [
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
    },
    "Faculty of Engineering": {
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
        "BSc (Hons) Quantity Surveying Top-Up Degree",
      ],
      "Department of Design Studies": [
        "Bachelor of Interior Design",
        "BA (Hons) in Interior Design",
      ],
    },
    "Faculty of Science": {
      "Department of Health Sciences": [
        "BSc (Hons) in Biomedical Science",
        "BSc (Hons) Biomedical Science",
        "BSc (Honours) in Pharmaceutical Science",
        "BSc (Hons) Nutrition and Health",
        "BSc (Hons) Nursing",
        "BSc (Hons) Nursing – Top up",
        "Foundation Programme for Bachelor's Degree",
      ],
      "Department of Life Sciences": ["BSc (Hons) Psychology"],
    },
  };

  const intakeOptions = [
    "23.1",
    "23.2",
    "24.1",
    "24.2",
    "25.1",
    "25.2",
    "26.1",
    "26.2",
  ];
  const semesterOptions = [
    "Year 1 Semester 1",
    "Year 1 Semester 2",
    "Year 2 Semester 1",
    "Year 2 Semester 2",
    "Year 3 Semester 1",
    "Year 3 Semester 2",
  ];

  // Cascading Helpers
  const faculties = Object.keys(universityData);
  const departments = selectedFaculty
    ? Object.keys(universityData[selectedFaculty])
    : [];

  const handleDownloadTemplate = () => {
    toast.success("Preparing your template...");
    window.location.href = "http://localhost:8000/api/timetable/template";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDeleteTimetable = (batch_id: string) => {
    setDeleteBatchId(batch_id);
  };

  const confirmDelete = async () => {
    if (!deleteBatchId) return;

    setIsDeleting(true);
    const deleteToast = toast.loading(
      `Removing schedule for ${deleteBatchId}...`,
    );

    try {
      // Artificial UX delay for tactile feedback
      await new Promise((resolve) => setTimeout(resolve, 800));

      const response = await fetch(
        `http://localhost:8000/api/timetable/batch/${deleteBatchId}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        toast.success(`Batch ${deleteBatchId} deleted successfully!`, {
          id: deleteToast,
        });
        setDeleteBatchId(null);
        fetchRecentUploads();
      } else {
        toast.error("Failed to delete batch", { id: deleteToast });
      }
    } catch (error) {
      toast.error("Error deleting batch", { id: deleteToast });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    if (
      validTypes.includes(selectedFile.type) ||
      selectedFile.name.endsWith(".csv")
    ) {
      setFile(selectedFile);
      toast.success("File attached successfully!");
    } else {
      toast.error("Please upload a valid Excel (.xlsx, .xls) or CSV file.");
    }
  };

  const handleViewBatch = async (batchId: string, showToast = true) => {
    setIsLoadingView(true);
    let viewToast = null;
    if (showToast) {
      viewToast = toast.loading(`Retrieving schedule for ${batchId}...`);
    }

    try {
      const response = await fetch(
        `http://localhost:8000/api/timetable/batch/${batchId}`,
      );
      if (!response.ok) throw new Error("Failed to load records");
      const data = await response.json();
      setViewData(data);
      setViewBatchId(batchId);
      if (showToast && viewToast) {
        toast.success("Schedule loaded!", { id: viewToast });
      }
    } catch (error) {
      if (showToast && viewToast) {
        toast.error("Failed to load timetable details.", { id: viewToast });
      }
    } finally {
      setIsLoadingView(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!viewBatchId) return;

    // Step 1: Show loading toast FIRST, then flush render before starting fetch.
    setIsExporting(true);
    const TOAST_ID = "excel-export-toast";
    toast.loading("Generating Report, Please wait...", {
      id: TOAST_ID,
      duration: Infinity, // Keep it alive until we explicitly dismiss it
    });

    // Flush: yield to the browser so React commits the loading state
    // and the toast renders before the fetch blocks the thread.
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      // Step 2: Fetch the Excel blob — await so loading toast stays visible
      const response = await fetch(
        `http://localhost:8000/api/timetable/export/${encodeURIComponent(viewBatchId)}`,
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.detail || "Failed to generate Excel report.");
      }

      // CRITICAL: Read as binary Blob — prevents .xlsx corruption
      const blob = await response.blob();
      const url = window.URL.createObjectURL(
        new Blob([blob], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );

      // Step 3: Trigger download via hidden anchor, then clean up
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `Official_Timetable_${viewBatchId}_Report.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Step 4: Replace loading toast with success
      toast.success("Excel Report Downloaded Successfully! ", {
        id: TOAST_ID,
        duration: 4000,
      });
    } catch (error: any) {
      // Step 5: Replace loading toast with error
      toast.error(error.message || "Export Failed. Please try again.", {
        id: TOAST_ID,
        duration: 5000,
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Legacy CSV export kept for reference
  const exportToCSV = async () => {
    if (!viewData || viewData.length === 0) return;

    setIsExporting(true);
    const exportToast = toast.loading("Processing dataset for export...");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const headers = [
        "Date,Start Time,End Time,Module Code,Module Name,Lecturer,Faculty,Department,Semester",
      ];
      const csvRows = viewData.map(
        (row) =>
          `"${row.date}","${row.start_time}","${row.end_time}","${row.module_code}","${row.module_name || ""}","${row.lecturer || ""}","${row.faculty || ""}","${row.department || ""}","${row.semester || ""}"`,
      );
      const csvString = [headers, ...csvRows].join("\n");
      const blob = new Blob([csvString], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Timetable_Batch_${viewBatchId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success("CSV file downloaded successfully!", { id: exportToast });
    } catch (error) {
      toast.error("Failed to generate export.", { id: exportToast });
    } finally {
      setIsExporting(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success("File removed.");
  };

  const resetForm = () => {
    setSelectedFaculty("");
    setSelectedDepartment("");
    setSelectedBatch("");
    setSelectedSemester("");
    setStartDate("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleManualReset = () => {
    resetForm();
    toast.success("Form cleared successfully!");
  };

  const handleConfirmSync = async () => {
    setIsSyncing(true);
    const syncToast = toast.loading("Finalizing Timetable Sync...");

    try {
      // UX Delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const response = await fetch("http://localhost:8000/api/timetable/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_id: selectedBatch,
          faculty: selectedFaculty,
          department: selectedDepartment,
          semester: selectedSemester,
          file_name: file?.name || "extracted_schedule.xlsx",
          records: fullExtractedData.map((row) => ({
            ...row,
            module_name: row.module || row.module_name || "",
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Sync failed");
      }

      toast.success(`Schedule for ${selectedBatch} synced successfully!`, {
        id: syncToast,
      });
      setIsPreviewModalOpen(false);
      resetForm();
      fetchRecentUploads();
    } catch (error: any) {
      console.error("Sync Error:", error);

      // Extract and sanitize error message (strip technical prefixes like 400: or Sync failed:)
      let errorMsg = error.message || "Failed to sync records to database.";
      if (typeof errorMsg === "string") {
        errorMsg = errorMsg
          .replace(/^(Sync failed:?\s*|400:?\s*|Error:?\s*)+/gi, "")
          .trim();
      }

      // Increase duration to 6 seconds for better readability of detailed errors
      toast.error(errorMsg, {
        id: syncToast,
        duration: 6000,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpload = async () => {
    // 1. Validation
    if (
      !file ||
      !selectedFaculty ||
      !selectedDepartment ||
      !selectedBatch ||
      !selectedSemester ||
      !startDate
    ) {
      toast.error(
        "Please complete all academic fields, start date, and select a file.",
      );
      return;
    }

    setIsUploading(true);
    const loadingToast = toast.loading("Extracting timetable data...");

    try {
      // UX Delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 2. Prepare Form Data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("start_date", startDate);
      formData.append("faculty", selectedFaculty);
      formData.append("department", selectedDepartment);
      formData.append("batch", selectedBatch);
      formData.append("semester", selectedSemester);

      // 3. API Call
      const response = await fetch(
        "http://localhost:8000/api/timetable/extract",
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const errorData = await response.json();

        // Handle structured validation errors
        if (errorData.detail?.errors) {
          setValidationErrors(errorData.detail.errors);
          setIsErrorModalOpen(true);
          toast.dismiss(loadingToast);
          setIsUploading(false);
          return;
        }

        // Handle concatenated string fallback
        if (
          typeof errorData.detail === "string" &&
          errorData.detail.includes("|")
        ) {
          setValidationErrors(
            errorData.detail.split("|").map((e: string) => e.trim()),
          );
          setIsErrorModalOpen(true);
          toast.dismiss(loadingToast);
          setIsUploading(false);
          return;
        }

        throw new Error(
          errorData.detail?.message || errorData.detail || "Extraction failed",
        );
      }

      const result = await response.json();

      // 4. Success Handling - Store full data but only show top 5 in preview UI
      setFullExtractedData(result.full_data);
      setPreviewData(result.full_data.slice(0, 5));
      setTotalRecords(result.total_records);
      setIsPreviewModalOpen(true);

      toast.success("Timetable extracted successfully!", { id: loadingToast });
    } catch (error: any) {
      console.error("Extraction Error:", error);

      // Attempt to extract structured errors from response
      try {
        // Since we're using fetch, we need to handle the error parsing carefully
        // If it's a validation error, the response.ok was false
        if (error.response?.data?.detail?.errors) {
          setValidationErrors(error.response.data.detail.errors);
          setIsErrorModalOpen(true);
          toast.dismiss(loadingToast);
          return;
        }
      } catch (e) {
        console.error("Failed to parse structured error:", e);
      }

      toast.error(error.message || "Failed to extract timetable.", {
        id: loadingToast,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-none p-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {/* 1. Validation Error Modal */}
      {isErrorModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 ease-out" 
              onClick={() => setIsErrorModalOpen(false)}
            />
            <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 ease-out">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Validation Errors Found
                </h3>
                <p className="text-gray-500 text-sm mb-6">
                  Please correct the following issues in your Excel file and try
                  uploading again.
                </p>

                <div className="max-h-64 overflow-y-auto bg-red-50 rounded-xl p-4 border border-red-100 mb-6 text-left">
                  <ul className="space-y-2">
                    {validationErrors.map((err, i) => (
                      <li key={i} className="flex gap-2 text-sm text-red-700">
                        <span className="shrink-0 font-bold">•</span>
                        <span>{err}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => setIsErrorModalOpen(false)}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all cursor-pointer shadow-lg shadow-gray-200"
                >
                  Close & Fix
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Container matching standard admin grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* 1. UPLOAD SECTION (Takes 2 columns on large screens) */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <UploadCloud className="w-10 h-10 text-blue-600" />
              Upload New Timetable
            </h2>
            <button
              onClick={handleDownloadTemplate}
              className="text-sm font-medium cursor-pointer text-blue-600 hover:text-black hover:bg-blue-100 flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border-2 border-blue-200 transition-colors"
            >
              <Download className="w-5 h-5" />
              Download Standard Template
            </button>
          </div>

          <div className="flex flex-col gap-y-6 mb-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Faculty Dropdown */}
              <div className="space-y-2">
                <label className="block text-md font-bold text-gray-600 tracking-wider flex items-center gap-3">
                  Select Faculty
                </label>
                <div className="relative">
                  <select
                    value={selectedFaculty}
                    onChange={(e) => {
                      setSelectedFaculty(e.target.value);
                      setSelectedDepartment("");
                    }}
                    className="w-full border border-gray-300 bg-gray-50 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-all cursor-pointer pr-10"
                  >
                    <option value="" disabled>
                      Choose Faculty...
                    </option>
                    {faculties.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-800 pointer-events-none" />
                </div>
              </div>

              {/* Department Dropdown */}
              <div className="space-y-2">
                <label
                  className={`block text-md font-bold tracking-wider flex items-center gap-3 ${!selectedFaculty ? "text-gray-400" : "text-gray-600"}`}
                >
                  Select Department
                </label>
                <div className="relative">
                  <select
                    value={selectedDepartment}
                    disabled={!selectedFaculty}
                    onChange={(e) => {
                      setSelectedDepartment(e.target.value);
                    }}
                    className="w-full border border-gray-300 bg-gray-50 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-all cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed pr-10"
                  >
                    <option value="" disabled>
                      Choose Department...
                    </option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-800 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Batch Searchable Input */}
              <div className="space-y-2">
                <label className="block text-md font-bold text-gray-600 tracking-wider flex items-center gap-3">
                  Select Intake / Batch
                </label>
                <input
                  type="text"
                  list="batch-options"
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  placeholder="Type or select batch"
                  className="w-full border border-gray-300 bg-gray-50 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                />
                <datalist id="batch-options">
                  {intakeOptions.map((opt) => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
              </div>

              {/* Semester Dropdown */}
              <div className="space-y-2">
                <label className="block text-md font-bold text-gray-600 tracking-wider flex items-center gap-3">
                  Select Semester
                </label>
                <div className="relative">
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className="w-full border border-gray-300 bg-gray-50 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-all cursor-pointer pr-10"
                  >
                    <option value="" disabled>
                      Choose a semester...
                    </option>
                    {semesterOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-800 pointer-events-none" />
                </div>
              </div>

              {/* Semester Start Date Date Picker */}
              <div className="space-y-2">
                <label className="block text-md font-bold text-gray-600 tracking-wider flex items-center gap-3">
                  Semester Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-300 bg-gray-50 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            className={`h-[220px] w-full border-2 rounded-xl transition-all duration-200 flex flex-col justify-center items-center relative ${
              isDragActive
                ? "border-blue-500 bg-blue-50"
                : file
                  ? "border-green-400 bg-green-50"
                  : "border-gray-300 border-dashed bg-gray-50 hover:bg-gray-100"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              className="hidden"
            />

            {!file ? (
              <>
                <div className="p-4 bg-white border-2 border-blue-200 shadow-sm rounded-full flex items-center justify-center mb-4 mt-6 text-blue-500">
                  <FileSpreadsheet className="w-10 h-10" />
                </div>
                <h3 className="text-gray-900 font-semibold mb-1">
                  Click to upload or drag and drop
                </h3>
                <p className="text-gray-500 text-sm mb-4">
                  Excel (.xlsx) or CSV files up to 10MB
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white border-2 border-gray-300 mb-6 cursor-pointer rounded-lg shadow-sm px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Browse Files
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 w-full h-full relative">
                <button
                  onClick={removeFile}
                  className="absolute top-4 right-4 p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-full transition-colors cursor-pointer"
                  title="Remove File"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="bg-white p-4 rounded-full shadow-sm mb-4 border-2 border-green-200">
                  <FileSpreadsheet className="w-10 h-10 text-green-600" />
                </div>
                <p className="text-lg font-bold text-gray-900 text-center truncate max-w-full px-4">
                  {file.name}
                </p>
                <p className="text-sm text-green-600 font-bold mt-2 flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-green-200">
                  <CheckCircle className="w-4 h-4" />
                  Ready to sync
                </p>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">
                  {(file.size / 1024 / 1024).toFixed(2)} MB • Excel Spreadsheet
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col md:flex-row gap-4">
            <button
              onClick={handleManualReset}
              className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
              Reset Form
            </button>
            <button
              onClick={handleUpload}
              disabled={
                isUploading ||
                !file ||
                !selectedFaculty ||
                !selectedDepartment ||
                !selectedBatch ||
                !selectedSemester ||
                !startDate
              }
              className={`flex-[2] py-3 rounded-xl text-white font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 ${
                !file ||
                !selectedFaculty ||
                !selectedDepartment ||
                !selectedBatch ||
                !selectedSemester
                  ? "bg-gray-300 shadow-none cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              }`}
            >
              {isUploading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Syncing Timetable...
                </>
              ) : (
                <>Upload & Sync Timetable</>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Recent Uploads */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 lg:col-span-1 flex flex-col">
          <div className="flex items-center justify-between mb-3 shrink-0 p-6">
            <h3 className="font-bold text-xl text-gray-800 flex items-center gap-3">
              <Layers className="w-6 h-6 text-blue-600" />
              Recent Uploads
            </h3>
            <span className="text-sm font-medium bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100">
              {recentUploads.length} Files
            </span>
          </div>

          <div className="flex-1 relative min-h-[300px]">
            {recentUploads.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 m-8  group hover:bg-gray-50 transition-all">
                <div className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center mb-4 border-2 border-blue-200 group-hover:scale-110 transition-transform duration-300">
                  <UploadCloud className="w-8 h-8 text-blue-500 group-hover:text-blue-500 transition-colors" />
                </div>
                <h3 className="text-gray-900 font-bold text-base mb-2">
                  No history found
                </h3>
                <p className="text-gray-500 text-sm max-w-[220px] leading-relaxed italic font-medium">
                  Upload Files will appear here once you've uploaded academic
                  schedules.
                </p>
                <div className="mt-6 px-4 py-2 cursor-pointer bg-blue-50 text-blue-600 text-[11px] font-bold shadow-sm tracking-wider rounded-full border-2 border-blue-100">
                  Ready for Sync
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 overflow-y-auto border border-gray-200 rounded-lg scrollbar-thin scrollbar-thumb-gray-200">
                <table className="w-full text-left border-collapse">
                  <thead className="text-sm text-gray-700 bg-gray-100 sticky top-0 z-10 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 font-bold">File Name</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                      <th className="px-5 py-3 font-bold text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentUploads.map((record) => (
                      <tr
                        key={record.id}
                        className="hover:bg-blue-50/50 transition-colors group"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <FileSpreadsheet className="w-8 h-8 text-yellow-600 bg-yellow-100 rounded-lg p-1 shrink-0" />
                            <div>
                              <p className="text-sm font-bold text-gray-800 truncate max-w-[180px]">
                                {record.name}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Batch: {record.batch} • {record.date}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-1 py-4">
                          {record.status === "Success" ? (
                            <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded-full border-2 border-green-200 text-sm font-bold uppercase">
                              <CheckCircle className="w-4 h-4" />
                              {record.status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded-full border-2 border-red-200 text-sm font-bold uppercase">
                              <AlertCircle className="w-4 h-4" />
                              {record.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewBatch(record.batch)}
                              disabled={isLoadingView}
                              className="p-1.5 cursor-pointer text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
                              title="View Details"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteTimetable(record.batch)
                              }
                              className="p-1.5 cursor-pointer text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete Record"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Extraction Preview Modal */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Eye className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Review Extracted Timetable
                  </h3>
                  <p className="text-sm text-gray-500">
                    Verify the mapped dates and times before final sync
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-bold border border-blue-100">
                  {totalRecords} Classes Found
                </span>
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-100 text-gray-600 text-sm tracking-wider font-bold">
                    <tr>
                      <th className="px-4 py-4 border-b">Actual Date</th>
                      <th className="px-6 py-4 border-b">Day</th>
                      <th className="px-6 py-4 border-b">Time Slot</th>
                      <th className="px-6 py-4 border-b text-blue-600">
                        Module Code
                      </th>
                      <th className="px-6 py-4 border-b">
                        Module / Description
                      </th>
                      <th className="px-6 py-4 border-b">Lecturer</th>
                      <th className="px-6 py-4 border-b">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewData.map((row, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-blue-50/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-900">
                            {row.date}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{row.day}</td>
                        <td className="px-6 py-4 text-gray-800 font-bold text-sm bg-gray-50">
                          {row.time}
                        </td>
                        <td className="px-6 py-4 font-bold text-blue-600">
                          {row.module_code}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            <span className="text-gray-800 font-medium">
                              {row.module}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 font-medium">
                          {row.lecturer}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {row.location}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-blue-50 text-blue-700 p-4 rounded-xl text-sm mt-4 border border-blue-200 flex flex-col gap-1 items-center text-center">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-7 h-7 text-blue-600" />
                  <span className="font-bold text-blue-900 text-sm">
                    Showing first 5 records as a preview.
                  </span>
                </div>
                <span className="text-blue-600 font-medium italic">
                  All {fullExtractedData.length} records will be transactionally
                  synchronized to the registry upon confirmation.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
              <p className="text-sm text-gray-500 italic px-2 font-bold">
                <span className="text-red-500 font-bold text-sm">*</span>{" "}
                Timetable data is mapped relative to the provided Start Date.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    setPreviewData([]);
                  }}
                  className="px-6 py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSync}
                  disabled={isSyncing}
                  className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSyncing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  Confirm & Sync All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 4. Custom Delete Confirmation Modal */}
      {deleteBatchId &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-2xl w-full max-w-md overflow-hidden p-8 text-center animate-in fade-in zoom-in duration-200">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-sm">
                <Trash2 className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Delete Timetable?
              </h3>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Are you sure you want to permanently delete all records for
                Batch{" "}
                <span className="font-bold text-gray-900">{deleteBatchId}</span>
                ? This action is destructive and cannot be undone.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setDeleteBatchId(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl border-2 border-gray-200 hover:bg-gray-200 transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Delete Timetable"
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* 5. View Full Timetable Modal */}
      {viewBatchId &&
        !isViewModalHidden &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-8 border-b flex justify-between items-center bg-gray-50 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shadow-inner">
                    <Calendar className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                      Academic Schedule
                    </h2>
                    <p className="text-sm text-gray-500 font-medium mt-2 flex items-center flex-wrap gap-1">
                      <span className="flex items-center gap-2">
                        <span className="text-gray-500">Faculty:</span>
                        <span className="text-gray-800 gap">
                          {viewData[0]?.faculty || "N/A"}
                        </span>
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="flex items-center gap-2">
                        <span className="text-gray-500">Department:</span>
                        <span className="text-gray-800">
                          {viewData[0]?.department || "N/A"}
                        </span>
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="flex items-center gap-2">
                        <span className="text-gray-500">Semester:</span>
                        <span className="text-gray-800">
                          {viewData[0]?.semester || "N/A"}
                        </span>
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="flex items-center gap-2">
                        <span className="text-gray-500">Batch:</span>
                        <span className="text-blue-600 font-bold">
                          {viewBatchId}
                        </span>
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-800 font-bold bg-blue-100 px-2 py-0.5 rounded-full text-[11px] border border-blue-200 uppercase tracking-tighter">
                        {viewData.length} Active Sessions
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={handleDownloadExcel}
                    disabled={isExporting}
                    className="px-8 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isExporting ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Download className="w-8 h-8" />
                    )}
                    {isExporting ? "Generating..." : "Export Excel"}
                  </button>
                  <button
                    onClick={() => setViewBatchId(null)}
                    className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-all cursor-pointer"
                  >
                    <X className="w-7 h-7" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-auto p-0 scrollbar-thin scrollbar-thumb-gray-200">
                <table className="w-full text-left border-collapse border-gray-200 border-2 whitespace-nowrap min-w-full">
                  <thead className="bg-gray-100 sticky top-0 z-10 border-b-2 border-gray-100">
                    <tr>
                      <th className="px-8 py-4 text-sm font-bold text-gray-500 tracking-widest">
                        Date
                      </th>
                      <th className="px-8 py-4 text-sm font-bold text-gray-500 tracking-widest">
                        Time Slot
                      </th>
                      <th className="px-6 py-4 text-sm font-bold text-blue-600 tracking-widest">
                        Module Code
                      </th>
                      <th className="px-8 py-4 text-sm font-bold text-gray-500 tracking-widest">
                        Module Name
                      </th>
                      <th className="px-4 py-4 text-sm font-bold text-gray-500 tracking-widest">
                        Lecturer
                      </th>
                      <th className="px-4 py-4 text-sm font-bold text-gray-500 tracking-widest">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {viewData.map((row, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-blue-50/50 transition-colors group"
                      >
                        <td className="px-8 py-4">
                          <span className="font-bold text-gray-900 underline decoration-blue-200 decoration-2 underline-offset-4">
                            {row.date}
                          </span>
                        </td>
                        <td className="px-8 py-4">
                          <div className="bg-white border border-gray-200 px-3 py-1 rounded-lg shadow-sm font-bold text-gray-700 text-sm inline-block">
                            {row.start_time} - {row.end_time}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-blue-600 tracking-tight">
                          {row.module_code}
                        </td>
                        <td className="px-8 py-4 text-sm text-gray-800 font-bold">
                          {row.module_name}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 font-medium">
                          {row.lecturer || "—"}
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => handleEditClick(row)}
                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                            title="Edit Session"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t bg-gray-50 flex justify-center shrink-0">
                <p className="text-xs text-gray-500 italic font-bold">
                  Showing all records retrieved for the academic batch registry.
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* 6. Edit Session Modal */}
      {isEditModalOpen &&
        editingSession &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-gray-200 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Edit className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">
                    Edit Session
                  </h3>
                </div>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-500 font-bold hover:text-gray-600 p-1 cursor-pointer hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateSession} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">
                      Module Code
                    </label>
                    <input
                      type="text"
                      className="w-full p-2.5 border border-gray-300 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      value={editingSession.module_code || ""}
                      onChange={(e) =>
                        setEditingSession({
                          ...editingSession,
                          module_code: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">
                      Module Name
                    </label>
                    <input
                      type="text"
                      className="w-full p-2.5 border border-gray-300 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      value={editingSession.module_name || ""}
                      onChange={(e) =>
                        setEditingSession({
                          ...editingSession,
                          module_name: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">
                    Date
                  </label>
                  <input
                    type="date"
                    className="w-full p-2.5 border cursor-pointer border-gray-300 text-sm font-semibold rounded-xl font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    value={editingSession.date}
                    onChange={(e) =>
                      setEditingSession({
                        ...editingSession,
                        date: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">
                      Start Time
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 08:30 AM"
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      value={editingSession.start_time}
                      onChange={(e) =>
                        setEditingSession({
                          ...editingSession,
                          start_time: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">
                      End Time
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 10:30 AM"
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      value={editingSession.end_time}
                      onChange={(e) =>
                        setEditingSession({
                          ...editingSession,
                          end_time: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">
                    Lecturer Name
                  </label>
                  <input
                    type="text"
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    value={editingSession.lecturer}
                    onChange={(e) =>
                      setEditingSession({
                        ...editingSession,
                        lecturer: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 py-2.5 bg-gray-50 text-gray-700 font-bold rounded-xl border-2 border-gray-200 hover:bg-gray-200 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={`flex-2 px-6 font-bold py-2.5 rounded-xl transition-all flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 ${
                      isSaving
                        ? "bg-blue-400 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
