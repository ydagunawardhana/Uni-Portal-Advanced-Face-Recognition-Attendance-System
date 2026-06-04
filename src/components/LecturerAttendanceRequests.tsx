import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { API_BASE_URL } from "../config";
import {
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  Clock,
  ChevronLeft,
  BookOpen,
  Users,
  Bell,
  Search,
  Filter,
  GraduationCap,
  RefreshCw,
  Calendar,
  AlertTriangle,
  Info,
} from "lucide-react";

interface CorrectionRequest {
  id: number;
  student_id: string;
  session_id: number;
  reason_type: string;
  description: string;
  evidence_url: string | null;
  status: string;
  submitted_at: string;
  student_name: string;
  session_date: string;
  session_time: string;
}

interface SubjectGroup {
  subject_id: string | number;
  subject_code: string;
  subject_name: string;
  batch: string;
  degree: string; // Replaced semester with degree
  semester?: string; // Added semester
  pending_count: number;
  requests: CorrectionRequest[];
}

const LecturerAttendanceRequests = () => {
  const [subjectGroups, setSubjectGroups] = useState<SubjectGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<SubjectGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter State
  const [subjectSearch, setSubjectSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [degreeFilter, setDegreeFilter] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  // Modal State removed - actions moved to Admin portal

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem("lecturerToken");
      const response = await fetch(
        API_BASE_URL + "/api/attendance/lecturer/requests",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch requests");

      const data: SubjectGroup[] = await response.json();
      setSubjectGroups(data);

      // If a group is currently selected, update its data seamlessly without closing the table
      if (selectedGroup) {
        const updatedGroup = data.find(
          (g) =>
            g.subject_code === selectedGroup.subject_code &&
            g.batch === selectedGroup.batch
        );
        setSelectedGroup(updatedGroup || null);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load attendance requests.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Updated Filter Logic for Cards
  const filteredGroups = useMemo(() => {
    return subjectGroups.filter((g) => {
      const matchesSearch =
        (g.subject_name || "")
          .toLowerCase()
          .includes(subjectSearch.toLowerCase()) ||
        (g.subject_code || "")
          .toLowerCase()
          .includes(subjectSearch.toLowerCase());
      const matchesBatch = batchFilter ? (g.batch || "") === batchFilter : true;
      const matchesDegree = degreeFilter
        ? (g.degree || "").includes(degreeFilter)
        : true;
      return matchesSearch && matchesBatch && matchesDegree;
    });
  }, [subjectGroups, subjectSearch, batchFilter, degreeFilter]);

  return (
    <div className="p- mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {!selectedGroup ? (
        /* 
           VIEW 1: SUBJECT CARDS (With New Filters)
           */
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Filter Subjects & Requests
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                View attendance correction appeals submitted by students for
                your modules.
              </p>
            </div>

            <button
              onClick={() => {
                toast.loading("Refreshing requests...", {
                  id: "refresh-toast",
                  duration: 1500,
                });
                fetchRequests();
              }}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-md text-sm font-semibold active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  isLoading ? "animate-spin text-blue-600" : ""
                }`}
              />
              Refresh Data
            </button>
          </div>

          <div className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <Info className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-blue-800">
                Read-Only View
              </h4>
              <p className="text-sm font-semibold text-blue-700 mt-0.5 leading-relaxed">
                This page is for your reference to track student absences and
                excuses. Please note that all attendance correction requests are
                reviewed, approved, or rejected directly by the{" "}
                <strong>University Administration</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-col-3 gap-4 mb-6">
            {/* Search Input */}
            <div className="relative w-full flex">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search subjects by module name or code..."
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-white font-semibold text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-800"
              />
            </div>

            {/* Batch Filter Dropdown */}
            <div className="relative w-full ">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-white font-semibold text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-medium text-gray-700 cursor-pointer"
              >
                <option value="">All Batches</option>
                {Array.from(
                  new Set(subjectGroups.map((g) => g.batch).filter(Boolean))
                ).map((b) => (
                  <option key={b} value={b}>
                    Batch {b}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </div>
            </div>

            {/* Degree Filter Dropdown */}
            <div className="relative w-full md:w-64">
              <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <select
                value={degreeFilter}
                onChange={(e) => setDegreeFilter(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-white font-semibold text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-medium text-gray-700 cursor-pointer"
              >
                <option value="">All Degrees</option>
                {Array.from(
                  new Set(subjectGroups.map((g) => g.degree).filter(Boolean))
                ).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-12 text-gray-500 font-medium">
              Loading subjects...
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border-2 border-dashed border-gray-300 shadow-sm">
              <CheckCircle className="w-16 h-16 text-green-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                No Subjects Found
              </h3>
              <p className="text-gray-500">
                Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.map((group, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedGroup(group);
                    setStudentSearch("");
                  }}
                  className="bg-white border border-gray-300 rounded-xl p-6 cursor-pointer hover:shadow-lg shadow-md transition-all group relative"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BookOpen className="w-7 h-7" />
                    </div>
                    {group.pending_count > 0 ? (
                      <span className="flex items-center gap-1 bg-red-100 text-red-700 border-2 border-red-100 px-3 py-1 rounded-full text-sm font-bold animate-pulse shadow-sm">
                        <Bell className="w-4 h-4" /> {group.pending_count}{" "}
                        Pending
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-700 border-2 border-green-100 px-3 py-1 rounded-full text-sm font-bold">
                        Up to date
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-700 transition-colors">
                    {group.subject_name}
                  </h3>
                  <div className="flex flex-col gap-2 mt-3">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="bg-blue-600 px-3 py-1 rounded-xl font-bold text-white text-sm shadow-sm">
                        {group.subject_code}
                      </span>
                      <span className="flex items-center gap-1 bg-green-600 text-white font-bold border border-green-100 px-2.5 py-1 rounded-xl text-sm shadow-sm">
                        <Users className="w-3.5 h-3.5" /> Batch {group.batch}
                      </span>
                    </div>
                    {group.degree && (
                      <span
                        className="flex items-center gap-2 mt-2 text-sm text-gray-500 font-medium line-clamp-1"
                        title={group.degree}
                      >
                        <GraduationCap className="inline-block w-5 h-5 text-gray-700" />{" "}
                        {group.degree}
                      </span>
                    )}
                    {group.semester && (
                      <span className=" text-gray-500 flex items-center gap-2 text-sm text-gray-500 font-medium line-clamp-1 ">
                        <Calendar className="inline-block w-5 h-5 text-gray-700" />
                        {group.semester}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* 
           VIEW 2: DETAILED TABLE
        */
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <button
              onClick={() => setSelectedGroup(null)}
              className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-blue-700 mb-3 transition-colors font-bold text-md"
            >
              <ChevronLeft className="w-5 h-5 font-bold" /> Back to Subjects
            </button>

            <div className="flex flex-col">
              <h3 className="font-bold text-2xl text-blue-700 mb-2">
                {selectedGroup.subject_name}
              </h3>
              <div className="flex items-center gap-2 text-md text-gray-600 font-bold">
                <span>{selectedGroup.subject_code}</span>
                <span>•</span>
                <span>Batch {selectedGroup.batch}</span>
                <span>•</span>
                <span>{selectedGroup.degree}</span>
              </div>
            </div>

            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student ID..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-12 pr-4 py-2 flex-2 col-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none text-sm w-full md:w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-100 text-gray-700 text-sm font-bold tracking-wider">
                  <th className="p-4 font-bold">Student</th>
                  <th className="p-4 font-bold">Session Details</th>
                  <th className="p-4 font-bold">Date Submitted</th>
                  <th className="p-4 font-bold">Reason & Description</th>
                  <th className="p-4 font-bold text-center">Evidence</th>
                  <th className="p-4 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(selectedGroup.requests || []).filter((req) =>
                  req.student_id
                    .toLowerCase()
                    .includes(studentSearch.toLowerCase())
                ).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No matching requests found.
                    </td>
                  </tr>
                ) : (
                  (selectedGroup.requests || [])
                    .filter((req) =>
                      req.student_id
                        .toLowerCase()
                        .includes(studentSearch.toLowerCase())
                    )
                    .map((req) => (
                      <tr
                        key={req.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 text-md">
                              {req.student_name}
                            </span>
                            <span className="text-sm text-gray-500 font-bold">
                              {req.student_id}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-700 text-sm">
                              {req.session_date}
                            </span>
                            <span className="text-sm text-gray-500 font-medium">
                              {req.session_time}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-gray-800 font-semibold flex items-center gap-2">
                            <Clock className="w-4 h-4 text-green-600" />
                            {new Date(req.submitted_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-4 max-w-xs">
                          <div className="inline-flex px-2 py-0.5 rounded text-sm rounded-xl font-bold bg-red-100 text-red-700 border-2 border-red-200 mb-2">
                            {req.reason_type}
                          </div>
                          <p
                            className="text-xs text-gray-600 font-bold italic line-clamp-2"
                            title={req.description}
                          >
                            {req.description}
                          </p>
                        </td>
                        <td className="p-4 text-center">
                          {req.evidence_url ? (
                            <a
                              href={
                                req.evidence_url.startsWith("http")
                                  ? req.evidence_url
                                  : `${API_BASE_URL}${
                                      req.evidence_url.startsWith("/")
                                        ? ""
                                        : "/"
                                    }${req.evidence_url}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 border-2 border-blue-200 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                            >
                              <Eye className="w-5 h-5" /> View
                            </a>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-xl text-sm font-bold shadow-sm ${
                              req.status === "Pending"
                                ? "bg-yellow-100 text-yellow-700 border-2 border-yellow-200 animate-pulse"
                                : req.status === "Approved"
                                ? "bg-green-100 text-green-800 border border-green-200"
                                : "bg-red-100 text-red-800 border border-red-200"
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerAttendanceRequests;
