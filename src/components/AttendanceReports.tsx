import { useState } from "react";
import { FileSpreadsheet, FileText, Calendar } from "lucide-react";

interface AttendanceRecord {
  id: number;
  date: string;
  time: string;
  studentName: string;
  indexNo: string;
  batch: string;
  subject: string;
  status: "Present" | "Absent";
  avatarColor: string;
}

export default function AttendanceReports() {
  const [fromDate, setFromDate] = useState("2026-02-01");
  const [toDate, setToDate] = useState("2026-02-07");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");

  const attendanceRecords: AttendanceRecord[] = [
    {
      id: 1,
      date: "2026-02-07",
      time: "09:00 AM",
      studentName: "Ashan Perera",
      indexNo: "CS/2024/001",
      batch: "Year 1",
      subject: "Database Systems",
      status: "Present",
      avatarColor: "bg-blue-500",
    },
    {
      id: 2,
      date: "2026-02-07",
      time: "09:00 AM",
      studentName: "Sanduni Fernando",
      indexNo: "CS/2024/012",
      batch: "Year 1",
      subject: "Database Systems",
      status: "Present",
      avatarColor: "bg-purple-500",
    },
    {
      id: 3,
      date: "2026-02-07",
      time: "09:00 AM",
      studentName: "Ravindu Jayawardena",
      indexNo: "CS/2022/123",
      batch: "Year 3",
      subject: "Database Systems",
      status: "Absent",
      avatarColor: "bg-orange-500",
    },
    {
      id: 4,
      date: "2026-02-07",
      time: "10:30 AM",
      studentName: "Kamal Silva",
      indexNo: "EE/2023/045",
      batch: "Year 2",
      subject: "Circuit Theory",
      status: "Present",
      avatarColor: "bg-green-500",
    },
    {
      id: 5,
      date: "2026-02-07",
      time: "10:30 AM",
      studentName: "Hansini Wickramasinghe",
      indexNo: "EE/2024/023",
      batch: "Year 1",
      subject: "Circuit Theory",
      status: "Present",
      avatarColor: "bg-cyan-500",
    },
    {
      id: 6,
      date: "2026-02-06",
      time: "02:00 PM",
      studentName: "Nethmi Wijesinghe",
      indexNo: "ME/2023/078",
      batch: "Year 2",
      subject: "Thermodynamics",
      status: "Absent",
      avatarColor: "bg-pink-500",
    },
    {
      id: 7,
      date: "2026-02-06",
      time: "11:00 AM",
      studentName: "Dilini Rajapaksha",
      indexNo: "BA/2022/089",
      batch: "Year 3",
      subject: "Business Analytics",
      status: "Present",
      avatarColor: "bg-teal-500",
    },
    {
      id: 8,
      date: "2026-02-06",
      time: "09:00 AM",
      studentName: "Tharindu Dissanayake",
      indexNo: "CS/2023/067",
      batch: "Year 2",
      subject: "Data Structures",
      status: "Present",
      avatarColor: "bg-yellow-500",
    },
    {
      id: 9,
      date: "2026-02-05",
      time: "01:00 PM",
      studentName: "Chaminda Bandara",
      indexNo: "CE/2021/156",
      batch: "Year 4",
      subject: "Structural Engineering",
      status: "Present",
      avatarColor: "bg-indigo-500",
    },
    {
      id: 10,
      date: "2026-02-05",
      time: "03:00 PM",
      studentName: "Imesha Gamage",
      indexNo: "AR/2024/007",
      batch: "Year 1",
      subject: "Architectural Design",
      status: "Absent",
      avatarColor: "bg-red-500",
    },
    {
      id: 11,
      date: "2026-02-05",
      time: "09:00 AM",
      studentName: "Ashan Perera",
      indexNo: "CS/2024/001",
      batch: "Year 1",
      subject: "Programming Fundamentals",
      status: "Present",
      avatarColor: "bg-blue-500",
    },
    {
      id: 12,
      date: "2026-02-04",
      time: "10:00 AM",
      studentName: "Sanduni Fernando",
      indexNo: "CS/2024/012",
      batch: "Year 1",
      subject: "Web Development",
      status: "Present",
      avatarColor: "bg-purple-500",
    },
    {
      id: 13,
      date: "2026-02-04",
      time: "02:00 PM",
      studentName: "Kamal Silva",
      indexNo: "EE/2023/045",
      batch: "Year 2",
      subject: "Digital Electronics",
      status: "Absent",
      avatarColor: "bg-green-500",
    },
    {
      id: 14,
      date: "2026-02-04",
      time: "11:00 AM",
      studentName: "Ravindu Jayawardena",
      indexNo: "CS/2022/123",
      batch: "Year 3",
      subject: "Machine Learning",
      status: "Present",
      avatarColor: "bg-orange-500",
    },
    {
      id: 15,
      date: "2026-02-03",
      time: "09:00 AM",
      studentName: "Dilini Rajapaksha",
      indexNo: "BA/2022/089",
      batch: "Year 3",
      subject: "Marketing Management",
      status: "Present",
      avatarColor: "bg-teal-500",
    },
  ];

  const filteredRecords = attendanceRecords.filter((record) => {
    const matchesDepartment =
      selectedDepartment === "all" ||
      record.indexNo.startsWith(selectedDepartment);

    const matchesBatch =
      selectedBatch === "all" || record.batch === selectedBatch;

    const matchesSubject =
      selectedSubject === "all" || record.subject === selectedSubject;

    return matchesDepartment && matchesBatch && matchesSubject;
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
    <div>
      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-12 gap-4 items-end">
          {/* Date Range Picker */}
          <div className="col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                aria-label="Select From Date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                aria-label="Select To Date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Department Dropdown */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <select
              aria-label="Select Department"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="all">All Departments</option>
              <option value="CS">Computer Science</option>
              <option value="EE">Electrical Engineering</option>
              <option value="ME">Mechanical Engineering</option>
              <option value="CE">Civil Engineering</option>
              <option value="BA">Business Admin</option>
              <option value="AR">Architecture</option>
            </select>
          </div>

          {/* Batch Dropdown */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Batch / Year
            </label>
            <select
              aria-label="Select Batch"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="all">All Batches</option>
              <option value="Year 1">Year 1</option>
              <option value="Year 2">Year 2</option>
              <option value="Year 3">Year 3</option>
              <option value="Year 4">Year 4</option>
            </select>
          </div>

          {/* Subject Dropdown */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <select
              aria-label="Select Subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="all">All Subjects</option>
              <option value="Database Systems">Database Systems</option>
              <option value="Circuit Theory">Circuit Theory</option>
              <option value="Data Structures">Data Structures</option>
              <option value="Machine Learning">Machine Learning</option>
              <option value="Web Development">Web Development</option>
              <option value="Business Analytics">Business Analytics</option>
            </select>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md font-medium"
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span>Export to Excel</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md font-medium"
          >
            <FileText className="w-5 h-5" />
            <span>Export to CSV</span>
          </button>
        </div>
      </div>

      {/* Report Data Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Student Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Batch
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRecords.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Date & Time */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {record.date}
                    </div>
                    <div className="text-sm text-gray-500">{record.time}</div>
                  </td>

                  {/* Student Details (Avatar + Name + Index) */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div
                        className={`w-10 h-10 rounded-full ${record.avatarColor} flex items-center justify-center text-white font-semibold mr-3`}
                      >
                        {record.studentName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {record.studentName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.indexNo}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Batch */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{record.batch}</div>
                  </td>

                  {/* Subject */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {record.subject}
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        record.status === "Present"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
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

        {/* No Results Message */}
        {filteredRecords.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No attendance records found.
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Try adjusting your filters or date range.
            </p>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredRecords.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing{" "}
              <span className="font-medium">1-{filteredRecords.length}</span> of{" "}
              <span className="font-medium">500</span> records
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                Previous
              </button>
              <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium">
                1
              </button>
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                2
              </button>
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                3
              </button>
              <span className="px-2 text-gray-500">...</span>
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                50
              </button>
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
