import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Download,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Loader2,
  FileX,
  AlertTriangle,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = "http://localhost:8000";

interface AuditLog {
  id: number;
  timestamp: string | null;
  action_type: string;
  description: string;
  ip_address?: string;
  severity?: "Info" | "Warning" | "Critical";
}

// Severity derivation
const deriveSeverity = (log: AuditLog): "Info" | "Warning" | "Critical" => {
  if (log.severity) return log.severity;
  const text = `${log.action_type} ${log.description}`.toLowerCase();
  if (
    text.includes("delete") ||
    text.includes("fail") ||
    text.includes("unauthor") ||
    text.includes("critical")
  )
    return "Critical";
  if (
    text.includes("update") ||
    text.includes("warn") ||
    text.includes("suspend") ||
    text.includes("disable")
  )
    return "Warning";
  return "Info";
};

const severityConfig = {
  Info: {
    cls: "bg-blue-100 text-blue-700",
    icon: <Info className="w-4 h-4" />,
  },
  Warning: {
    cls: "bg-yellow-100 text-yellow-700",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  Critical: {
    cls: "bg-red-100 text-red-700",
    icon: <XCircle className="w-4 h-4" />,
  },
};

// Status derivation
const deriveStatus = (description: string): "Success" | "Failed" => {
  const lower = description.toLowerCase();
  if (
    lower.includes("fail") ||
    lower.includes("error") ||
    lower.includes("unauthor")
  )
    return "Failed";
  return "Success";
};

// Role derivation
const deriveRole = (log: AuditLog): "Admin" | "Lecturer" | "Student" | null => {
  const actionType = log.action_type?.toLowerCase() ?? "";
  const desc = log.description?.toLowerCase() ?? "";

  // Admin panel actions are always performed by the Admin
  if (
    actionType.includes("student management") ||
    actionType.includes("lecturer management") ||
    actionType.includes("system operations")
  ) {
    return "Admin";
  }

  // Login activity — derive from description text
  if (actionType.includes("login")) {
    if (desc.includes("admin")) return "Admin";
    if (desc.includes("lecturer")) return "Lecturer";
    if (desc.includes("student")) return "Student";
  }

  // Fallback: keyword scan
  if (desc.includes("admin")) return "Admin";
  if (desc.includes("lecturer")) return "Lecturer";
  if (desc.includes("student")) return "Student";
  return null;
};

const getRoleBadgeColor = (role: "Admin" | "Lecturer" | "Student") => {
  switch (role) {
    case "Admin":
      return "bg-purple-100 text-purple-700 border-purple-200 border-2 rounded-full px-3";
    case "Lecturer":
      return "bg-blue-100 text-blue-700 border-blue-200 border-2 rounded-full px-3";
    case "Student":
      return "bg-emerald-100 text-emerald-700 border-emerald-200 border-2 rounded-full px-3";
  }
};

// Timestamp formatter
const formatTimestamp = (iso: string | null) => {
  if (!iso) return { date: "—", time: "" };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }),
    time: d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };
};

// Performed By extractor
const extractPerformedBy = (description: string): string => {
  const quotedMatch = description.match(/'([^']+)'/);
  if (quotedMatch) return quotedMatch[1];

  const emailMatch = description.match(/[\w.-]+@[\w.-]+/);
  if (emailMatch) return emailMatch[0];
  return "System";
};

// Component
export default function SystemAuditLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [actionTypeFilter, setActionTypeFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const itemsPerPage = 30;

  // Data fetching
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (roleFilter && roleFilter !== "All") params.append("role", roleFilter);
      if (actionTypeFilter && actionTypeFilter !== "All")
        params.append("action_type", actionTypeFilter);

      const res = await fetch(
        `${API_BASE}/api/admin/audit-logs?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        const data: AuditLog[] = await res.json();
        setLogs(data);
        setCurrentPage(1);
      } else {
        console.error("Failed to fetch audit logs:", res.status);
      }
    } catch (err) {
      console.error("Network error fetching audit logs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, startDate, endDate, roleFilter, actionTypeFilter]);

  useEffect(() => {
    const debounce = setTimeout(() => fetchLogs(), 350);
    return () => clearTimeout(debounce);
  }, [fetchLogs]);

  // Pagination
  const totalPages = Math.ceil(logs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLogs = logs.slice(startIndex, endIndex);
  const totalRecords = logs.length;

  // CSV Export
  const handleExportCSV = () => {
    if (!logs || logs.length === 0) {
      toast.error("No logs available to export.");
      return;
    }
    setShowExportModal(true);
  };

  const executeCSVExport = () => {
    try {
      const headers = [
        "Timestamp",
        "Action Type",
        "Description",
        "Performed By",
        "Severity",
        "Status",
      ];
      const csvRows = logs.map((l) =>
        [
          `"${l.timestamp ?? ""}"`,
          `"${l.action_type}"`,
          `"${l.description.replace(/"/g, '""')}"`,
          `"${extractPerformedBy(l.description)}"`,
          `"${deriveSeverity(l)}"`,
          `"${deriveStatus(l.description)}"`,
        ].join(","),
      );

      const csvContent = [headers.join(","), ...csvRows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `audit_logs_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Audit logs exported successfully!");
      setShowExportModal(false);
    } catch (error) {
      toast.error("Failed to export logs.");
    }
  };

  // Render
  return (
    <div className="pb-20">
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
          className="flex items-center cursor-pointer space-x-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
        >
          <Download className="w-5 h-5" />
          <span className="font-medium">Export to CSV</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-lg shadow-md p-5 mb-6">
        <div className="grid grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by action or description..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm cursor-pointer font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Role
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <select
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

        {/* Action Type */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Action Type
          </label>
          <select
            value={actionTypeFilter}
            onChange={(e) => setActionTypeFilter(e.target.value)}
            className="w-full px-4  cursor-pointer py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
          >
            <option value="All">All Actions</option>
            <option value="Login Activity">Login Activity</option>
            <option value="Student Management">Student Management</option>
            <option value="Lecturer Management">Lecturer Management</option>
            <option value="System Operations">System Operations</option>
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
                  Action Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Performed By
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-500 mb-3" />
                    <p className="text-sm text-gray-500">
                      Loading audit logs...
                    </p>
                  </td>
                </tr>
              ) : currentLogs.length > 0 ? (
                currentLogs.map((log) => {
                  const { date, time } = formatTimestamp(log.timestamp);
                  const status = deriveStatus(log.description);
                  const severity = deriveSeverity(log);
                  const role = deriveRole(log);
                  const sevCfg = severityConfig[severity];

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {date}
                        </div>
                        <div className="text-xs text-gray-500">{time}</div>
                      </td>

                      {/* Action Type + Role badge */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {log.action_type}
                        </div>
                        {role && (
                          <span
                            className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${getRoleBadgeColor(role)}`}
                          >
                            {role}
                          </span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="px-6 py-4 max-w-xs">
                        <div className="text-sm text-gray-700 break-words">
                          {log.description}
                        </div>
                      </td>

                      {/* Performed By */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {extractPerformedBy(log.description)}
                        </div>
                      </td>

                      {/* Severity */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${sevCfg.cls}`}
                        >
                          {sevCfg.icon}
                          {severity}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {status === "Success" ? (
                          <span className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
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
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <FileX className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-medium text-gray-500">
                      No audit logs found matching your criteria
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Try adjusting your filters or date range
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
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
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                {Array.from(
                  { length: Math.min(totalPages, 7) },
                  (_, i) => i + 1,
                ).map((page) => (
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
                ))}
                {totalPages > 7 && (
                  <span className="px-2 text-gray-400">…</span>
                )}
              </div>

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
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

      {/* Export Confirmation Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Download size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Export Audit Logs
              </h3>
            </div>

            <p className="text-gray-600 mb-6 leading-relaxed">
              You are about to export{" "}
              <span className="font-bold text-gray-900">{logs.length}</span>{" "}
              audit log records as a CSV file. This file contains sensitive
              system activity data. Are you sure you want to proceed?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-sm cursor-pointer font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeCSVExport}
                className="px-4 py-2 text-sm cursor-pointer font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download size={16} /> Yes, Export Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
