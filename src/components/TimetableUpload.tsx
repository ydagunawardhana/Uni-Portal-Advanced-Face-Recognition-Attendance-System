import React, { useState, useRef } from "react";
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
} from "lucide-react";
import toast from "react-hot-toast";

export default function TimetableUpload() {
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedDegree, setSelectedDegree] = useState("");
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
  const [totalRecords, setTotalRecords] = useState(0);

  // Mock History Data
  const recentUploads = [
    {
      id: 1,
      name: "Y2S1_Computing_Timetable.xlsx",
      batch: "24.1",
      date: "Oct 24, 2024",
      status: "Success",
    },
    {
      id: 2,
      name: "Revised_Y1S2_CS.csv",
      batch: "25.2",
      date: "Oct 20, 2024",
      status: "Success",
    },
    {
      id: 2,
      name: "Revised_Y1S2_CS.csv",
      batch: "25.2",
      date: "Oct 20, 2024",
      status: "Success",
    },
    {
      id: 2,
      name: "Revised_Y1S2_CS.csv",
      batch: "25.2",
      date: "Oct 20, 2024",
      status: "Success",
    },
    {
      id: 3,
      name: "Corrupted_File_Test.xls",
      batch: "24.2",
      date: "Oct 18, 2024",
      status: "Failed",
    },
    {
      id: 3,
      name: "Corrupted_File_Test.xls",
      batch: "24.2",
      date: "Oct 18, 2024",
      status: "Failed",
    },
    {
      id: 3,
      name: "Corrupted_File_Test.xls",
      batch: "24.2",
      date: "Oct 18, 2024",
      status: "Failed",
    },
  ];

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
  const degrees =
    selectedFaculty && selectedDepartment
      ? universityData[selectedFaculty][selectedDepartment]
      : [];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDeleteTimetable = (id: number) => {
    // Mock delete logic
    toast.success("Timetable deleted successfully");
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

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success("File removed.");
  };

  const handleReset = () => {
    setSelectedFaculty("");
    setSelectedDepartment("");
    setSelectedDegree("");
    setSelectedBatch("");
    setSelectedSemester("");
    setStartDate("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success("Form cleared successfully!");
  };

  const handleUpload = async () => {
    // 1. Validation
    if (
      !file ||
      !selectedFaculty ||
      !selectedDepartment ||
      !selectedDegree ||
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
      // 2. Prepare Form Data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("start_date", startDate);
      formData.append("faculty", selectedFaculty);
      formData.append("department", selectedDepartment);
      formData.append("degree", selectedDegree);
      formData.append("batch", selectedBatch);
      formData.append("semester", selectedSemester);

      // 3. API Call
      const response = await fetch("http://localhost:8000/api/timetable/extract", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Extraction failed");
      }

      const result = await response.json();

      // 4. Success Handling
      setPreviewData(result.preview_data);
      setTotalRecords(result.total_records);
      setIsPreviewModalOpen(true);
      
      toast.success("Timetable extracted successfully!", { id: loadingToast });
    } catch (error: any) {
      toast.error(error.message || "Failed to extract timetable.", { id: loadingToast });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-none p-0 space-y-6">
      {/* Container matching standard admin grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* 1. UPLOAD SECTION (Takes 2 columns on large screens) */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <UploadCloud className="w-10 h-10 text-blue-600" />
              Upload New Timetable
            </h2>
            <button className="text-sm font-medium cursor-pointer text-blue-600 hover:text-black hover:bg-blue-100 flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border-2 border-blue-200 transition-colors">
              <Download className="w-5 h-5" />
              Download Template
            </button>
          </div>

          <div className="flex flex-col gap-y-6 mb-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Faculty Dropdown */}
              <div className="space-y-2">
                <label className="block text-md font-bold text-gray-600 tracking-wider flex items-center gap-3">
                  <School className="w-5 h-5 text-blue-500" /> Select Faculty
                </label>
                <div className="relative">
                  <select
                    value={selectedFaculty}
                    onChange={(e) => {
                      setSelectedFaculty(e.target.value);
                      setSelectedDepartment("");
                      setSelectedDegree("");
                    }}
                    className="w-full border border-gray-300 bg-gray-50 rounded-xl px-4 py-3 text-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-all cursor-pointer pr-10"
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
                  <Library className="w-5 h-5 text-blue-500" /> Select
                  Department
                </label>
                <div className="relative">
                  <select
                    value={selectedDepartment}
                    disabled={!selectedFaculty}
                    onChange={(e) => {
                      setSelectedDepartment(e.target.value);
                      setSelectedDegree("");
                    }}
                    className="w-full border border-gray-300 bg-gray-50 rounded-xl px-4 py-3 text-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-all cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed pr-10"
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
              {/* Degree Program Dropdown */}
              <div className="space-y-2 lg:col-span-1">
                <label
                  className={`block text-md font-bold tracking-wider flex items-center gap-3 ${!selectedDepartment ? "text-gray-400" : "text-gray-600"}`}
                >
                  <GraduationCap className="w-6 h-6 text-blue-500" /> Degree
                  Program
                </label>
                <div className="relative">
                  <select
                    value={selectedDegree}
                    disabled={!selectedDepartment}
                    onChange={(e) => setSelectedDegree(e.target.value)}
                    className="w-full border border-gray-300 bg-gray-50 rounded-xl px-4 py-3 text-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-all cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed pr-10"
                  >
                    <option value="" disabled>
                      Choose Program...
                    </option>
                    {degrees.map((deg) => (
                      <option key={deg} value={deg}>
                        {deg}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-800 pointer-events-none" />
                </div>
              </div>

              {/* Batch Searchable Input */}
              <div className="space-y-2">
                <label className="block text-md font-bold text-gray-600 tracking-wider flex items-center gap-3">
                  <Layers className="w-5 h-5 text-blue-500" /> Select Intake /
                  Batch
                </label>
                <input
                  type="text"
                  list="batch-options"
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  placeholder="Type or select batch (e.g., 25.1)"
                  className="w-full border border-gray-300 bg-gray-50 rounded-xl px-4 py-3 text-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                />
                <datalist id="batch-options">
                  {intakeOptions.map((opt) => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2 md:col-span-2 lg:col-span-1">
                <label className="block text-md font-bold text-gray-600 tracking-wider flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-500" /> Select Semester
                </label>
                <div className="relative">
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className="w-full border border-gray-300 bg-gray-50 rounded-xl px-4 py-3 text-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-all cursor-pointer pr-10"
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
            </div>
            {/* Semester Start Date Date Picker */}
            <div className="space-y-2 grid-cols-1 md:grid-cols-3 lg:grid-cols-3 mt-2">
              <label className="block text-md font-bold text-gray-600 tracking-wider flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-500" /> Semester Start
                Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 bg-gray-50 rounded-xl px-4 py-3 text-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all outline-none cursor-pointer"
              />
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
                <div className="w-16 h-16 bg-white border-2 border-blue-200 shadow-sm rounded-full flex items-center justify-center mb-4 mt-6 text-blue-500">
                  <FileSpreadsheet className="w-8 h-8" />
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
                <div className="bg-white p-4 rounded-full shadow-sm mb-4 border-2 border-green-100">
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
              onClick={handleReset}
              className="flex-1 py-3.5 rounded-xl border-2 border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                !selectedDegree ||
                !selectedBatch ||
                !selectedSemester ||
                !startDate
              }
              className={`flex-[2] py-3.5 rounded-xl text-white font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 ${
                !file ||
                !selectedFaculty ||
                !selectedDepartment ||
                !selectedDegree ||
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
            <div className="absolute inset-0 overflow-y-auto border border-gray-200 rounded-lg scrollbar-thin scrollbar-thumb-gray-200">
              <table className="w-full text-left border-collapse">
                <thead className="text-xs text-gray-800 bg-gray-100 sticky top-0 z-10 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 font-bold">File Name</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-8 py-3 font-bold text-right">Actions</th>
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
                          <FileSpreadsheet className="w-7 h-7 text-yellow-600 bg-yellow-100 rounded-lg p-1 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-800 truncate max-w-[180px]">
                              {record.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Batch: {record.batch} • {record.date}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {record.status === "Success" ? (
                          <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full border-2 border-green-200 text-[10px] font-bold uppercase">
                            <CheckCircle className="w-2 h-2" />
                            {record.status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full border-2 border-red-200 text-[10px] font-bold uppercase">
                            <AlertCircle className="w-2 h-2" />
                            {record.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="p-1.5 cursor-pointer text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTimetable(record.id)}
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
          </div>
        </div>
      </div>
      {/* Extraction Preview Modal */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
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
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-6 py-4 border-b">Actual Date</th>
                      <th className="px-6 py-4 border-b">Day</th>
                      <th className="px-6 py-4 border-b">Time Slot</th>
                      <th className="px-6 py-4 border-b">Module / Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-900">{row.date}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{row.day}</td>
                        <td className="px-6 py-4 text-gray-700 font-mono text-sm bg-gray-50/50">
                          {row.time}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            <span className="text-gray-800 font-medium">{row.module}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800 font-medium">
                    Showing first {previewData.length} records as a preview.
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    All {totalRecords} records will be synchronized to the database upon confirmation.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-500 italic px-2">
                * Timetable data is mapped relative to the provided Start Date.
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
                  onClick={() => {
                    toast.success("Synchronizing all records to database...");
                    setIsPreviewModalOpen(false);
                    // Placeholder for final save call
                    handleReset();
                  }}
                  className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="w-5 h-5" />
                  Confirm & Sync All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
