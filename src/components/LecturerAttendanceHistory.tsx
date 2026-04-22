import { useState, useEffect } from "react";
import {
  Search,
  Download,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [dateFrom, setDateFrom] = useState("2026-02-01");
  const [dateTo, setDateTo] = useState("2026-02-06");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 12;

  const attendanceRecords: AttendanceRecord[] = [
    {
      id: 1,
      date: "2026-02-06",
      studentName: "John Smith",
      indexNumber: "CS/2021/001",
      subject: "CS 101 - Database Systems",
      timeIn: "09:05 AM",
      timeOut: "11:00 AM",
      status: "Present",
      photoUrl:
        "https://images.unsplash.com/photo-1698356253803-838dceb68946?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwc3R1ZGVudCUyMHBvcnRyYWl0JTIwbWFsZXxlbnwxfHx8fDE3NzAzNzkxNTd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    },
    {
      id: 2,
      date: "2026-02-06",
      studentName: "Emily Johnson",
      indexNumber: "CS/2021/002",
      subject: "CS 101 - Database Systems",
      timeIn: "09:03 AM",
      timeOut: "10:50 AM",
      status: "Left Early",
      photoUrl:
        "https://images.unsplash.com/photo-1709811240710-cff5f04deb44?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xsZWdlJTIwc3R1ZGVudCUyMGZlbWFsZSUyMHBvcnRyYWl0fGVufDF8fHx8MTc3MDM4NzE4OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    },
    {
      id: 3,
      date: "2026-02-06",
      studentName: "Michael Brown",
      indexNumber: "CS/2021/003",
      subject: "CS 101 - Database Systems",
      timeIn: "09:15 AM",
      timeOut: "11:15 AM",
      status: "Late",
      photoUrl:
        "https://images.unsplash.com/photo-1600180758890-6b94519a8ba6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMG1hbiUyMHN0dWRlbnQlMjBoZWFkc2hvdHxlbnwxfHx8fDE3NzA0MDg2MjV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    },
    {
      id: 4,
      date: "2026-02-06",
      studentName: "Sarah Davis",
      indexNumber: "CS/2021/004",
      subject: "CS 101 - Database Systems",
      timeIn: "09:08 AM",
      timeOut: "11:05 AM",
      status: "Present",
      photoUrl:
        "https://images.unsplash.com/photo-1758521540968-3af0cc2074a0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMHdvbWFuJTIwc3R1ZGVudCUyMGhlYWRzaG90fGVufDF8fHx8MTc3MDQ2ODE2N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    },
    {
      id: 5,
      date: "2026-02-06",
      studentName: "David Wilson",
      indexNumber: "CS/2021/005",
      subject: "CS 101 - Database Systems",
      timeIn: "—",
      timeOut: "—",
      status: "Absent",
      photoUrl:
        "https://images.unsplash.com/photo-1543689604-6fe8dbcd1f59?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXZlcnNlJTIwc3R1ZGVudCUyMHBvcnRyYWl0fGVufDF8fHx8MTc3MDQ3MzEyM3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    },
    {
      id: 6,
      date: "2026-02-05",
      studentName: "James Taylor",
      indexNumber: "CS/2021/006",
      subject: "CS 201 - Algorithms",
      timeIn: "11:02 AM",
      timeOut: "12:55 PM",
      status: "Present",
      photoUrl:
        "https://images.unsplash.com/photo-1544168190-79c17527004f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xsZWdlJTIwbWFsZSUyMHN0dWRlbnR8ZW58MXx8fHwxNzcwNDczMTIzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    },
    {
      id: 7,
      date: "2026-02-05",
      studentName: "Emma Martinez",
      indexNumber: "CS/2021/007",
      subject: "CS 201 - Algorithms",
      timeIn: "11:05 AM",
      timeOut: "12:30 PM",
      status: "Left Early",
      photoUrl:
        "https://images.unsplash.com/photo-1709811240710-cff5f04deb44?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xsZWdlJTIwc3R1ZGVudCUyMGZlbWFsZSUyMHBvcnRyYWl0fGVufDF8fHx8MTc3MDM4NzE4OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    },
    {
      id: 8,
      date: "2026-02-05",
      studentName: "Oliver Anderson",
      indexNumber: "CS/2021/008",
      subject: "CS 201 - Algorithms",
      timeIn: "—",
      timeOut: "—",
      status: "Absent",
      photoUrl:
        "https://images.unsplash.com/photo-1698356253803-838dceb68946?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwc3R1ZGVudCUyMHBvcnRyYWl0JTIwbWFsZXxlbnwxfHx8fDE3NzAzNzkxNTd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    },
    {
      id: 9,
      date: "2026-02-05",
      studentName: "Sophia Thomas",
      indexNumber: "CS/2021/009",
      subject: "CS 101 - Database Systems",
      timeIn: "09:01 AM",
      timeOut: "11:01 AM",
      status: "Present",
      photoUrl:
        "https://images.unsplash.com/photo-1758521540968-3af0cc2074a0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMHdvbWFuJTIwc3R1ZGVudCUyMGhlYWRzaG90fGVufDF8fHx8MTc3MDQ2ODE2N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    },
    {
      id: 10,
      date: "2026-02-04",
      studentName: "Lucas Garcia",
      indexNumber: "CS/2021/010",
      subject: "CS 301 - AI & ML",
      timeIn: "02:10 PM",
      timeOut: "04:10 PM",
      status: "Present",
      photoUrl:
        "https://images.unsplash.com/photo-1600180758890-6b94519a8ba6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMG1hbiUyMHN0dWRlbnQlMjBoZWFkc2hvdHxlbnwxfHx8fDE3NzA0MDg2MjV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    },
    {
      id: 11,
      date: "2026-02-04",
      studentName: "Ava Rodriguez",
      indexNumber: "CS/2021/011",
      subject: "CS 301 - AI & ML",
      timeIn: "02:18 PM",
      timeOut: "04:15 PM",
      status: "Late",
      photoUrl:
        "https://images.unsplash.com/photo-1709811240710-cff5f04deb44?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xsZWdlJTIwc3R1ZGVudCUyMGZlbWFsZSUyMHBvcnRyYWl0fGVufDF8fHx8MTc3MDM4NzE4OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    },
    {
      id: 12,
      date: "2026-02-04",
      studentName: "Liam Martinez",
      indexNumber: "CS/2021/012",
      subject: "CS 201 - Algorithms",
      timeIn: "11:12 AM",
      timeOut: "10:45 AM",
      status: "Present",
      photoUrl:
        "https://images.unsplash.com/photo-1544168190-79c17527004f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xsZWdlJTIwbWFsZSUyMHN0dWRlbnR8ZW58MXx8fHwxNzcwNDczMTIzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    },
  ];

  const handleExport = () => {
    alert("Exporting attendance report to CSV...");
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
    <div className="space-y-6">
      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-4 gap-4">
          {/* Select Subject */}
          <div>
            <label
              htmlFor="subject"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Select Subject
            </label>
            <select
              id="subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="all">All Subjects</option>
              <option value="cs101">CS 101 - Database Systems</option>
              <option value="cs201">CS 201 - Algorithms</option>
              <option value="cs301">CS 301 - AI & Machine Learning</option>
            </select>
          </div>

          {/* Date Range - From */}
          <div>
            <label
              htmlFor="dateFrom"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Date From
            </label>
            <input
              type="date"
              id="dateFrom"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Date Range - To */}
          <div>
            <label
              htmlFor="dateTo"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Date To
            </label>
            <input
              type="date"
              id="dateTo"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Search Bar */}
          <div>
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Search Student
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name or ID..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        {/* Export Button Row */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleExport}
            className="inline-flex items-center space-x-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-md"
          >
            <Download className="w-5 h-5" />
            <span>Export Report (CSV/Excel)</span>
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
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
              {attendanceRecords.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {record.date}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {/* Student Photo */}
                      {record.photoUrl ? (
                        <ImageWithFallback
                          src={record.photoUrl}
                          alt={record.studentName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 ${getAvatarColor(
                            record.id
                          )} rounded-full flex items-center justify-center text-white font-medium text-sm`}
                        >
                          {getInitials(record.studentName)}
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900">
                        {record.studentName}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {record.indexNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {record.subject}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {record.timeIn}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {record.timeOut}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                        record.status === "Present"
                          ? "bg-green-100 text-green-700"
                          : record.status === "Late"
                          ? "bg-yellow-100 text-yellow-700"
                          : record.status === "Left Early"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {attendanceRecords.length} records
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
    </div>
  );
}
