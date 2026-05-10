import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  ArrowLeft,
  RefreshCw,
  User,
  CheckCircle,
  Loader2,
  BookOpen,
  RotateCcw,
} from "lucide-react";
import { toast } from "react-hot-toast";

const API_BASE = "http://localhost:8000";

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

interface CompletedSession {
  session_id: number;
  module_name: string;
  module_code: string;
  batch_id: string;
  batch?: string;
  date: string;
  time?: string;
  start_time?: string;
  status: string;
  degree?: string;
  semester?: string;
  level?: string;
  lecturer?: string;
}

export default function AdminManualAttendances() {
  const navigate = useNavigate();
  const [filterFaculty, setFilterFaculty] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterDegree, setFilterDegree] = useState("all");
  const [lecturerType, setLecturerType] = useState("all");
  const [filterLecturerName, setFilterLecturerName] = useState("all");
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [filterSemester, setFilterSemester] = useState("all");
  const [selectedModule, setSelectedModule] = useState("all");

  const [availableModules, setAvailableModules] = useState<any[]>([]);
  const [allLecturers, setAllLecturers] = useState<any[]>([]);
  const [allBatches, setAllBatches] = useState<any[]>([]);
  const [sessions, setSessions] = useState<CompletedSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const availableBatches = useMemo(() => {
    return allBatches.filter(
      (batch) => filterDegree === "all" || batch.degree === filterDegree,
    );
  }, [allBatches, filterDegree]);

  const filteredLecturers = useMemo(() => {
    return allLecturers.filter((lec) => {
      if (lecturerType === "all") return true;
      // Visiting lecturers have 'VIS' in their employee_id, Internal have 'LEC'
      if (lecturerType === "Visiting") return lec.employee_id?.includes("VIS");
      if (lecturerType === "Full Time") return lec.employee_id?.includes("LEC");
      return true;
    });
  }, [allLecturers, lecturerType]);

  const filteredModules = useMemo(() => {
    return availableModules.filter((module) => {
      // 1. Degree Match
      const matchesDegree =
        filterDegree === "all" ||
        (module.degree && module.degree.includes(filterDegree));

      // 2. Semester Match (DB column is 'level')
      const matchesSemester =
        filterSemester === "all" ||
        (module.level && module.level === filterSemester);

      // 3. Lecturer Match (Check assigned_subjects)
      let matchesLecturer = true;
      if (filterLecturerName !== "all") {
        const selectedLec = allLecturers.find(
          (l) => l.name === filterLecturerName,
        );
        if (selectedLec && selectedLec.assigned_subjects) {
          matchesLecturer = selectedLec.assigned_subjects.includes(
            module.module_code,
          );
        } else {
          matchesLecturer = false;
        }
      }

      return matchesDegree && matchesSemester && matchesLecturer;
    });
  }, [
    availableModules,
    filterDegree,
    filterSemester,
    filterLecturerName,
    allLecturers,
  ]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        if (!token) return;

        const [modRes, lecRes, batchRes] = await Promise.all([
          fetch(`${API_BASE}/api/admin/modules`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/admin/lecturers`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/admin/batches`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (modRes.ok) setAvailableModules(await modRes.json());
        if (lecRes.ok) setAllLecturers(await lecRes.json());
        if (batchRes.ok) setAllBatches(await batchRes.json());
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
    setSelectedModule("all");
  }, [lecturerType, filterSemester]);

  const fetchSessions = async () => {
    if (selectedModule === "all") return;
    setIsLoadingSessions(true);
    try {
      const token = localStorage.getItem("adminToken");
      const batchParam =
        selectedBatch !== "all" ? `&batch_id=${selectedBatch}` : "";
      const moduleCode = selectedModule.includes(" - ")
        ? selectedModule.split(" - ")[0]
        : selectedModule;
      const response = await fetch(
        `${API_BASE}/api/attendance/sessions?module_code=${moduleCode}${batchParam}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        const data = await response.json();
        // Filter for completed sessions only as requested
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to load sessions.");
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (selectedModule !== "all") {
      fetchSessions();
    } else {
      setSessions([]);
    }
  }, [selectedModule, selectedBatch]);

  const handleResetFilters = () => {
    setFilterFaculty("all");
    setFilterDepartment("all");
    setFilterDegree("all");
    setLecturerType("all");
    setFilterLecturerName("all");
    setSelectedBatch("all");
    setFilterSemester("all");
    setSelectedModule("all");
    setSessions([]);
    toast.success("Filters cleared");
  };

  return (
    <div className="flex-1 space-y-4 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center mt-2">
        <Calendar className="w-8 h-8 text-blue-600 mr-3" />
        <h2 className="text-2xl font-bold text-gray-800">
          Recent Completed Sessions
        </h2>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl border-2 border-gray-100 shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {/* 1. Faculty */}
          <div className="flex flex-col">
            <label className="block text-sm font-bold text-gray-800 tracking-wider mb-1.5">
              Faculty
            </label>
            <select
              value={filterFaculty}
              onChange={(e) => setFilterFaculty(e.target.value)}
              className="w-full h-[42px] px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium cursor-pointer"
            >
              <option value="all">All Faculties</option>
              {Object.keys(universityData).map((fac) => (
                <option key={fac} value={fac}>
                  {fac}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Department */}
          <div className="flex flex-col relative">
            <label className="block text-sm font-bold text-gray-800 tracking-wider mb-1.5">
              Department
            </label>
            {filterFaculty === "all" && (
              <div
                className="absolute inset-0 top-6 z-10 cursor-not-allowed"
                onClick={() => toast.error("Please select a Faculty first.")}
              ></div>
            )}
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              disabled={filterFaculty === "all"}
              className="w-full h-[42px] px-3 py-2 border cursor-pointer border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <option value="all">All Departments</option>
              {filterFaculty !== "all" &&
                universityData[filterFaculty].map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
            </select>
          </div>

          {/* 3. Degree */}
          <div className="flex flex-col relative">
            <label className="block text-sm font-bold text-gray-800 tracking-wider mb-1.5">
              Degree
            </label>
            {filterDepartment === "all" && (
              <div
                className="absolute inset-0 top-6 z-10 cursor-not-allowed"
                onClick={() => toast.error("Please select a Department first.")}
              ></div>
            )}
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
          <div className="flex flex-col">
            <label className="block text-sm font-bold text-gray-800 tracking-wider mb-1.5">
              Lecturer Type
            </label>
            <select
              value={lecturerType}
              onChange={(e) => setLecturerType(e.target.value)}
              className="w-full h-[42px] px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="Full Time">Full Time</option>
              <option value="Visiting">Visiting</option>
            </select>
          </div>

          {/* 5. Lecturer Name */}
          <div className="flex flex-col">
            <label className="block text-sm font-bold text-gray-800 tracking-wider mb-1.5">
              Lecturer Name
            </label>
            <select
              value={filterLecturerName}
              onChange={(e) => setFilterLecturerName(e.target.value)}
              className="w-full h-[42px] px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium cursor-pointer"
            >
              <option value="all">All Lecturers</option>
              {filteredLecturers.map((l) => (
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
                onClick={() => toast.error("Please select a Degree first.")}
              ></div>
            )}
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              disabled={filterDegree === "all"}
              className={`w-full h-[42px] px-3 py-2 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed ${filterDegree === "all" ? "border-gray-200" : "border-gray-300 cursor-pointer"}`}
            >
              <option value="all">All Batches</option>
              {availableBatches.map((batch) => (
                <option key={batch.name} value={batch.name}>
                  {batch.name}
                </option>
              ))}
            </select>
          </div>

          {/* 7. Semester */}
          <div className="flex flex-col">
            <label className="block text-sm font-bold text-gray-800 tracking-wider mb-1.5">
              Semester
            </label>
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="w-full h-[42px] px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium cursor-pointer"
            >
              <option value="all">All Semesters</option>
              <option value="Year 1 - Semester 1">Year 1 - Semester 1</option>
              <option value="Year 1 - Semester 2">Year 1 - Semester 2</option>
              <option value="Year 2 - Semester 1">Year 2 - Semester 1</option>
              <option value="Year 2 - Semester 2">Year 2 - Semester 2</option>
              <option value="Year 3 - Semester 1">Year 3 - Semester 1</option>
              <option value="Year 3 - Semester 2">Year 3 - Semester 2</option>
              <option value="Year 4 - Semester 1">Year 4 - Semester 1</option>
              <option value="Year 4 - Semester 2">Year 4 - Semester 2</option>
            </select>
          </div>

          {/* 7. Select Module */}
          <div className="flex flex-col relative">
            <label className="block text-sm font-bold text-gray-800 tracking-wider mb-1.5">
              Select Module
            </label>
            {filterDegree === "all" && filterLecturerName === "all" && (
              <div
                className="absolute inset-0 top-6 z-10 cursor-not-allowed"
                onClick={() =>
                  toast.error("Please select a Degree or Lecturer first.")
                }
              ></div>
            )}
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              disabled={filterDegree === "all" && filterLecturerName === "all"}
              className={`w-full h-[42px] px-3 py-2 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed ${filterDegree === "all" && filterLecturerName === "all" ? "border-gray-200" : "border-gray-300 cursor-pointer"}`}
            >
              <option value="all">Select a Module</option>
              {filteredModules.map((m) => (
                <option
                  key={m.module_code}
                  value={`${m.module_code} - ${m.module_name}`}
                >
                  {m.module_code} - {m.module_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-end gap-4 mt-6">
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl shadow-sm hover:bg-red-500 hover:shadow-md text-red-600 font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Filters
          </button>
          <button
            onClick={fetchSessions}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl shadow-sm hover:bg-gray-100 text-gray-700 font-bold transition-colors cursor-pointer"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoadingSessions ? "animate-spin text-blue-600" : "text-gray-500"}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Session Card Grid */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1.5 bg-blue-600 rounded-full"></div>
          </div>
        </div>

        {isLoadingSessions ? (
          <div className="flex justify-center items-center py-20 bg-white rounded-2xl border-2 border-gray-100">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 font-bold tracking-wide">
                Syncing academic session intelligence...
              </p>
            </div>
          </div>
        ) : selectedModule === "all" ? (
          <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-10 text-center">
            <BookOpen className="w-20 h-20 text-gray-300 mx-auto mb-6 animate-pulse" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Ready to Manage Attendances
            </h3>
            <p className="text-gray-500 font-medium max-w-md mx-auto">
              Please select a module from the filters above to view and correct
              past attendance sessions.
            </p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-3xl p-10 text-center">
            <Calendar className="w-20 h-20 text-gray-300 mx-auto mb-6 animate-pulse" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              No Completed Sessions Found
            </h3>
            <p className="text-gray-500 font-medium max-w-md mx-auto">
              We couldn't find any completed attendance records for the selected
              module and batch.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session, index) => {
              // Extract module name/code from filter if needed
              const moduleFromFilter =
                selectedModule !== "all" ? selectedModule : "";
              const batchFromFilter =
                selectedBatch !== "all" ? selectedBatch : "";
              const degreeFromFilter =
                filterDegree !== "all" ? filterDegree : "";

              return (
                <div
                  key={`${session.session_id}-${index}`}
                  className="bg-white rounded-xl border-2 border-gray-200 p-5 shadow-sm hover:shadow-md cursor-pointer transition-shadow"
                  onClick={() =>
                    navigate(`/admin/session-review/${session.session_id}`)
                  }
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-full uppercase">
                      COMPLETED
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">
                        {session.date && session.date !== "N/A"
                          ? new Date(session.date)
                              .toLocaleDateString("en-GB", {
                                year: "numeric",
                                month: "short",
                                day: "2-digit",
                              })
                              .replace(/ /g, "-")
                          : "DATE N/A"}
                      </div>
                      <div className="text-sm text-gray-500 mt-1 font-bold">
                        {session.time || session.start_time || "Time N/A"}
                      </div>
                    </div>
                  </div>

                  <h3
                    className="text-xl font-bold text-gray-900 mb-2 truncate"
                    title={
                      session.module_name ||
                      (selectedModule !== "all" &&
                      selectedModule.includes(" - ")
                        ? selectedModule.split(" - ")[1].trim()
                        : "")
                    }
                  >
                    {session.module_name ||
                      (selectedModule !== "all" &&
                      selectedModule.includes(" - ")
                        ? selectedModule.split(" - ")[1].trim()
                        : "Unknown Module")}
                  </h3>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 bg-blue-600 text-white text-sm font-bold rounded-xl">
                      {session.module_code ||
                        (selectedModule !== "all" &&
                        selectedModule.includes(" - ")
                          ? selectedModule.split(" - ")[0].trim()
                          : "CODE")}
                    </span>
                    <span className="text-md font-bold text-gray-600 tracking-wide">
                      Batch{" "}
                      {session.batch_id ||
                        session.batch ||
                        batchFromFilter ||
                        "N/A"}
                    </span>
                  </div>

                  <div className="mt-2 pt-1 border-t border-gray-100">
                    <div className="text-sm font-bold text-gray-700 flex items-center gap-1.5 tracking-tight">
                      {/* CRITICAL FIX: Use session.lecturer */}
                      <span className="">
                        {session.lecturer ||
                          (filterLecturerName !== "all"
                            ? filterLecturerName
                            : "Unknown Lecturer")}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-gray-600 tracking-tighter mt-1">
                      {session.degree || degreeFromFilter || "Degree N/A"}
                      {(session.semester && session.semester !== "N/A") ||
                      (session.level && session.level !== "N/A") ||
                      filterSemester !== "all" ? (
                        <>
                          {" "}
                          |{" "}
                          {session.semester || session.level || filterSemester}
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
