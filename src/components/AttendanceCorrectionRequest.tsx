import { useState } from "react";
import {
  FileText,
  Upload,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";

// Props Interface
interface AttendanceCorrectionRequestProps {
  onLogout: () => void;
  onNavigate: (screen: any) => void;
}

export default function AttendanceCorrectionRequest({
  onLogout,
  onNavigate,
}: AttendanceCorrectionRequestProps) {
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Correction request submitted successfully!");
    // Reset form
    setSubject("");
    setDate("");
    setReason("");
    setDescription("");
  };

  const pastRequests = [
    {
      id: 1,
      subject: "Database Systems",
      date: "2026-02-05",
      reason: "Marked absent incorrectly",
      status: "Pending",
      submittedOn: "2026-02-06",
    },
    {
      id: 2,
      subject: "Algorithms",
      date: "2026-02-03",
      reason: "System technical error",
      status: "Approved",
      submittedOn: "2026-02-04",
    },
    {
      id: 3,
      subject: "Web Development",
      date: "2026-01-28",
      reason: "Forgot to scan out",
      status: "Rejected",
      submittedOn: "2026-01-29",
    },
  ];

  return (
    <div className="p-8 bg-white">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-8 h-8 text-red-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            Request Attendance Correction
          </h1>
        </div>
        <p className="text-gray-600">
          Submit a request to correct your attendance records
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side - Request Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Submit New Request
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Subject Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Subject <span className="text-red-600">*</span>
                </label>
                <select
                  aria-label="Select Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                  required
                >
                  <option value="">Choose a subject...</option>
                  <option value="Database Systems">Database Systems</option>
                  <option value="Algorithms">Algorithms</option>
                  <option value="Web Development">Web Development</option>
                  <option value="Operating Systems">Operating Systems</option>
                  <option value="Computer Networks">Computer Networks</option>
                </select>
              </div>

              {/* Date Picker */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date of Issue <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    aria-label="Select Date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Reason Dropdown */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason for Correction <span className="text-red-600">*</span>
                </label>
                <select
                  aria-label="Select Reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                  required
                >
                  <option value="">Select a reason...</option>
                  <option value="Marked absent incorrectly">
                    Marked absent incorrectly
                  </option>
                  <option value="Forgot to scan out">Forgot to scan out</option>
                  <option value="System technical error">
                    System technical error
                  </option>
                  <option value="Medical leave">
                    Medical leave (Upload evidence)
                  </option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Description Text Area */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Please explain the issue in detail..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
                  required
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Upload Evidence (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600 font-medium">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG, PDF up to 5MB
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors shadow-md"
              >
                Submit Request
              </button>
            </form>
          </div>
        </div>

        {/* Right Side - Past Requests */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Request History
            </h3>

            <div className="space-y-3">
              {pastRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold text-sm text-gray-900">
                      {request.subject}
                    </h4>
                    <span
                      className={`px-2 py-1 text-xs font-bold rounded-full ${
                        request.status === "Pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : request.status === "Approved"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Date: {request.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Submitted: {request.submittedOn}</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 mt-2 border-t border-gray-100 pt-2">
                    {request.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
