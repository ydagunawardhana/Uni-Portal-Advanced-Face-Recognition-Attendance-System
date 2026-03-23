import { useState } from "react";
import {
  Search,
  Download,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  User,
} from "lucide-react";

interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: "Admin" | "Lecturer";
  userImage: string;
  action: string;
  ipAddress: string;
  status: "Success" | "Failed";
}

export default function SystemAuditLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [actionTypeFilter, setActionTypeFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Mock audit log data
  const auditLogs: AuditLog[] = [
    {
      id: "1",
      timestamp: "2026-02-07 10:30 AM",
      userName: "Dr. Sarah Johnson",
      userRole: "Admin",
      userImage: "",
      action: "Updated Student Profile - CS/2021/045",
      ipAddress: "192.168.1.5",
      status: "Success",
    },
    {
      id: "2",
      timestamp: "2026-02-07 10:15 AM",
      userName: "Prof. Michael Chen",
      userRole: "Lecturer",
      userImage: "",
      action: "Started Live Attendance Session - CS301",
      ipAddress: "192.168.1.12",
      status: "Success",
    },
    {
      id: "3",
      timestamp: "2026-02-07 09:45 AM",
      userName: "Dr. Sarah Johnson",
      userRole: "Admin",
      userImage: "",
      action: "Deleted Class Session - EE205",
      ipAddress: "192.168.1.5",
      status: "Success",
    },
    {
      id: "4",
      timestamp: "2026-02-07 09:30 AM",
      userName: "Dr. Emily Watson",
      userRole: "Lecturer",
      userImage: "",
      action: "Failed Login Attempt",
      ipAddress: "203.94.45.78",
      status: "Failed",
    },
    {
      id: "5",
      timestamp: "2026-02-07 09:00 AM",
      userName: "Admin User",
      userRole: "Admin",
      userImage: "",
      action: "Registered New Student - John Smith",
      ipAddress: "192.168.1.5",
      status: "Success",
    },
    {
      id: "6",
      timestamp: "2026-02-07 08:45 AM",
      userName: "Prof. Michael Chen",
      userRole: "Lecturer",
      userImage: "",
      action: "Ended Live Attendance Session - CS301",
      ipAddress: "192.168.1.12",
      status: "Success",
    },
    {
      id: "7",
      timestamp: "2026-02-07 08:30 AM",
      userName: "Dr. Sarah Johnson",
      userRole: "Admin",
      userImage: "",
      action: "Updated System Settings - Face Recognition Threshold",
      ipAddress: "192.168.1.5",
      status: "Success",
    },
    {
      id: "8",
      timestamp: "2026-02-07 08:15 AM",
      userName: "Dr. Robert Kumar",
      userRole: "Lecturer",
      userImage: "",
      action: "Approved Attendance Correction Request",
      ipAddress: "192.168.1.18",
      status: "Success",
    },
    {
      id: "9",
      timestamp: "2026-02-07 08:00 AM",
      userName: "Admin User",
      userRole: "Admin",
      userImage: "",
      action: "Exported Attendance Report - Department of CS",
      ipAddress: "192.168.1.5",
      status: "Success",
    },
    {
      id: "10",
      timestamp: "2026-02-07 07:45 AM",
      userName: "Prof. Michael Chen",
      userRole: "Lecturer",
      userImage: "",
      action: "Failed to Delete Student Record",
      ipAddress: "192.168.1.12",
      status: "Failed",
    },
    {
      id: "11",
      timestamp: "2026-02-06 04:30 PM",
      userName: "Dr. Sarah Johnson",
      userRole: "Admin",
      userImage: "",
      action: "Created New Lecturer Account - Dr. Emily Watson",
      ipAddress: "192.168.1.5",
      status: "Success",
    },
    {
      id: "12",
      timestamp: "2026-02-06 04:00 PM",
      userName: "Dr. Robert Kumar",
      userRole: "Lecturer",
      userImage: "",
      action: "Marked Manual Attendance - CS402",
      ipAddress: "192.168.1.18",
      status: "Success",
    },
  ];

  const handleExportCSV = () => {
    // In a real application, this would generate and download a CSV file
    alert("Exporting audit logs to CSV...");
  };

  // Filter logs based on search and filters
  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "All" || log.userRole === roleFilter;

    const matchesActionType =
      actionTypeFilter === "All" ||
      log.action.toLowerCase().includes(actionTypeFilter.toLowerCase());

    return matchesSearch && matchesRole && matchesActionType;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, endIndex);
  const totalRecords = filteredLogs.length;

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getRoleBadgeColor = (role: "Admin" | "Lecturer") => {
    return role === "Admin"
      ? "bg-purple-100 text-purple-700 border-purple-200"
      : "bg-blue-100 text-blue-700 border-blue-200";
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : parts[0][0];
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            System Activity Logs
          </h2>
          <p className="text-gray-600 mt-1">
            Track all system activities and user actions
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
        >
          <Download className="w-5 h-5" />
          <span className="font-medium">Export to CSV</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-lg shadow-md p-5 mb-6">
        <div className="grid grid-cols-4 gap-4">
          {/* Search User */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search User
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or action..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Date Range Start */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                title="Select start date"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Date Range End */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                title="Select end date"
                placeholder="Select end date"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Filter by Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Role
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <select
                title="Filter by role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
              >
                <option value="All">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Lecturer">Lecturer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Type Filter - Full Width Row */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Action Type
          </label>
          <select
            title="Filter by action type"
            value={actionTypeFilter}
            onChange={(e) => setActionTypeFilter(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
          >
            <option value="All">All Actions</option>
            <option value="Login">Login Activity</option>
            <option value="Updated">Updates</option>
            <option value="Deleted">Deletions</option>
            <option value="Created">Creations</option>
            <option value="Started">Session Started</option>
            <option value="Ended">Session Ended</option>
            <option value="Exported">Exports</option>
            <option value="Approved">Approvals</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentLogs.length > 0 ? (
                currentLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {log.timestamp.split(" ")[0]}
                      </div>
                      <div className="text-xs text-gray-500">
                        {log.timestamp.split(" ").slice(1).join(" ")}
                      </div>
                    </td>

                    {/* User */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {getInitials(log.userName)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {log.userName}
                          </div>
                          <span
                            className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${getRoleBadgeColor(
                              log.userRole
                            )}`}
                          >
                            {log.userRole}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-md">
                        {log.action}
                      </div>
                    </td>

                    {/* IP Address */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-700 bg-gray-100 px-3 py-1 rounded inline-block">
                        {log.ipAddress}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.status === "Success" ? (
                        <span className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          <span>Success</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          <XCircle className="w-4 h-4" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">
                        No audit logs found matching your filters
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {currentLogs.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
              <span className="font-medium">
                {Math.min(endIndex, totalRecords)}
              </span>{" "}
              of <span className="font-medium">{totalRecords}</span> records
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className={`flex items-center space-x-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === 1
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                        currentPage === page
                          ? "bg-blue-600 text-white"
                          : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className={`flex items-center space-x-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === totalPages
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
