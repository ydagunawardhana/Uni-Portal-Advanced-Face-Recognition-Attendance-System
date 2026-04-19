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
  GraduationCap
} from "lucide-react";
import toast from "react-hot-toast";

export default function TimetableUpload() {
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedDegree, setSelectedDegree] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock History Data
  const recentUploads = [
    { id: 1, name: "Y2S1_Computing_Timetable.xlsx", batch: "24.1", date: "Oct 24, 2024", status: "Success" },
    { id: 2, name: "Revised_Y1S2_CS.csv", batch: "25.2", date: "Oct 20, 2024", status: "Success" },
    { id: 3, name: "Corrupted_File_Test.xls", batch: "24.2", date: "Oct 18, 2024", status: "Failed" },
  ];

  const intakeOptions = ['23.1', '23.2', '24.1', '24.2', '25.1', '25.2', '26.1', '26.2'];
  const semesterOptions = [
    'Year 1 Semester 1', 'Year 1 Semester 2', 
    'Year 2 Semester 1', 'Year 2 Semester 2', 
    'Year 3 Semester 1', 'Year 3 Semester 2'
  ];
  const degreeOptions = [
    "BSc (Hons) Software Engineering",
    "BSc (Hons) Computer Science",
    "BSc (Hons) Data Science",
    "BSc (Hons) Computer Networks"
  ];



  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
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
      "text/csv"
    ];
    if (validTypes.includes(selectedFile.type) || selectedFile.name.endsWith('.csv')) {
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
    setSelectedBatch("");
    setSelectedSemester("");
    setSelectedDegree("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success("Form cleared successfully!");
  };

  const handleUpload = async () => {
    if (!file || !selectedBatch || !selectedSemester || !selectedDegree) {
      toast.error("Please complete all fields and select a file.");
      return;
    }
    
    setIsUploading(true);
    const uploadPromise = new Promise((resolve) => setTimeout(resolve, 2000));

    toast.promise(uploadPromise, {
      loading: "Syncing timetable matrix...",
      success: "Timetable integration successful!",
      error: "Failed to sync timetable. Please try again.",
    });

    try {
      await uploadPromise;
      // SILENT CLEAR (no double toast)
      setSelectedBatch("");
      setSelectedSemester("");
      setSelectedDegree("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      // Error handled by toast.promise
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-none p-0 space-y-6">
      
      {/* Container matching standard admin grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. UPLOAD SECTION (Takes 2 columns on large screens) */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <UploadCloud className="w-7 h-7 text-blue-600" />
              Upload New Timetable
            </h2>
            <button className="text-sm font-medium cursor-pointer text-blue-600 hover:text-black hover:bg-blue-100 flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border-2 border-blue-200 transition-colors">
              <Download className="w-5 h-5" />
              Download Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Degree Program Dropdown */}
            <div>
              <label className="block text-md font-bold text-gray-600 tracking-wider mb-2 flex items-center gap-2">
                <GraduationCap className="w-5 h-5" /> Degree Program
              </label>
              <select 
                value={selectedDegree}
                onChange={(e) => setSelectedDegree(e.target.value)}
                className="w-full border border-gray-300 bg-gray-50 rounded-xl px-4 py-3 text-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-all cursor-pointer"
              >
                <option value="" disabled>Choose program...</option>
                {degreeOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Batch Searchable Input */}
            <div>
              <label className="block text-md font-bold text-gray-600 tracking-wider mb-2 flex items-center gap-2">
                <Layers className="w-4 h-4" /> Select Intake / Batch
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
                {intakeOptions.map(opt => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </div>

            {/* Semester Dropdown */}
            <div>
              <label className="block text-md font-bold text-gray-600 tracking-wider mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Select Semester
              </label>
              <select 
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full border border-gray-300 bg-gray-50 rounded-xl px-4 py-3 text-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-all cursor-pointer"
              >
                <option value="" disabled>Choose a semester...</option>
                {semesterOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div 
            className={`flex-1 border-2 border-dashed rounded-xl px-6 py-10 text-center transition-all duration-200 flex flex-col justify-center items-center ${
              isDragActive 
                ? "border-blue-500 bg-blue-50/50" 
                : file ? "border-green-400 bg-green-50/30" : "border-gray-300 bg-gray-50/50 hover:bg-gray-50"
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
                <div className="w-16 h-16 bg-white border-2 border-blue-200 mt-6 shadow-sm rounded-full flex items-center justify-center mb-4 text-blue-500">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <h3 className="text-gray-900 font-semibold mb-1">Click to upload or drag and drop</h3>
                <p className="text-gray-500 text-sm mb-4">Excel (.xlsx) or CSV files up to 10MB</p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white border-2 border-gray-300 cursor-pointer mb-6 rounded-lg shadow-sm px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Browse Files
                </button>
              </>
            ) : (
              <div className="w-full max-w-sm">
                <div className="bg-white border-2 border-green-200 p-4 rounded-xl shadow-sm flex items-start gap-4">
                  <div className="p-2 bg-green-100 text-green-600 rounded-lg shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-bold text-gray-900 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button 
                    onClick={removeFile}
                    className="p-1.5 hover:bg-red-50 text-red-700 hover:text-red-100 rounded-xl font-bold transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
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
              disabled={isUploading || !file || !selectedBatch || !selectedSemester || !selectedDegree}
              className={`flex-[2] py-3.5 rounded-xl text-white font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 ${
                (!file || !selectedBatch || !selectedSemester || !selectedDegree)
                  ? "bg-gray-300 shadow-none cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              }`}
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Syncing Timetable...
                </>
              ) : (
                <>
                  Upload & Sync Timetable
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. RECENT UPLOADS HISTORY (Takes 1 column on large screens) */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-md border border-gray-200 p-0 flex flex-col h-full overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Recent Uploads</h2>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 px-2 py-1 rounded-lg border-2 border-gray-200">
              Last 30 Days
            </span>
          </div>
          
          <div className="overflow-y-auto overflow-x-hidden flex-1 p-2">
            <div className="flex flex-col gap-2">
              {recentUploads.map((record) => (
                <div key={record.id} className="p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors flex flex-col gap-3">
                  {/* File name & Icon */}
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-yellow-100 rounded-lg shrink-0 mt-0.5">
                      <FileSpreadsheet className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 leading-tight mb-1">{record.name}</p>
                      <p className="text-xs font-semibold text-gray-500">{record.batch}</p>
                    </div>
                  </div>
                  
                  {/* Bottom details line (Date + Status) */}
                  <div className="flex items-center justify-between mt-1 pt-3 border-t border-gray-50">
                    <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {record.date}
                    </span>
                    
                    {record.status === "Success" ? (
                      <div className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded-lg border-2 border-green-200">
                        <CheckCircle className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{record.status}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded-lg border-2 border-red-200">
                        <AlertCircle className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{record.status}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
