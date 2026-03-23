import { useState } from "react";
import { LogOut, Camera, User, CheckCircle } from "lucide-react";
import Sidebar from "./Sidebar";
import DashboardHome from "./DashboardHome";
import SettingsScreen from "./SettingsScreen";
import ManageLecturers from "./ManageLecturers";
import AttendanceReports from "./AttendanceReports";
import SystemAuditLogs from "./SystemAuditLogs";

interface AdminDashboardProps {
  onLogout: () => void;
  onNavigate: (screen: "admin" | "reporting") => void;
}

export default function AdminDashboard({
  onLogout,
  onNavigate,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [imagesCaptured, setImagesCaptured] = useState(0);
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(false);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleCaptureImages = () => {
    // Simulate image capture
    const interval = setInterval(() => {
      setImagesCaptured((prev) => {
        if (prev >= 50) {
          clearInterval(interval);
          return 50;
        }
        return prev + 1;
      });
    }, 100);
  };

  const handleRegisterStudent = () => {
    if (imagesCaptured === 50) {
      alert(`Student ${studentName} registered successfully!`);
      handleClearForm();
    } else {
      alert("Please capture all 50 images before registering.");
    }
  };

  const handleClearForm = () => {
    setStudentName("");
    setStudentId("");
    setEmail("");
    setMobileNumber("");
    setDepartment("");
    setAcademicYear("");
    setImagesCaptured(0);
    setAutoGeneratePassword(false);
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return "Admin Dashboard";
      case "students":
        return "Student Registration";
      case "lecturers":
        return "Manage Lecturers";
      case "settings":
        return "System Settings";
      case "reports":
        return "Attendance Reports";
      case "audit":
        return "System Audit Logs";
      default:
        return "Admin Dashboard";
    }
  };

  const getHeaderDescription = () => {
    switch (activeTab) {
      case "dashboard":
        return "Manage your university attendance system";
      case "students":
        return "Register new students and capture face data";
      case "lecturers":
        return "View and manage academic staff";
      case "settings":
        return "Configure system preferences and parameters";
      case "reports":
        return "Generate and export class attendance records";
      case "audit":
        return "View system audit logs";
      default:
        return "Manage your university attendance system";
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onCollapseChange={setIsSidebarCollapsed}
      />

      <div
        className={`flex-1 transition-all duration-300 ${
          isSidebarCollapsed ? "ml-[80px]" : "ml-[280px]"
        }`}
      >
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-8 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {getHeaderTitle()}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {getHeaderDescription()}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg">
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  Admin User
                </span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-8">
          {activeTab === "dashboard" && (
            <DashboardHome onTabChange={handleTabChange} />
          )}

          {activeTab === "settings" && <SettingsScreen />}

          {activeTab === "lecturers" && <ManageLecturers />}

          {activeTab === "reports" && <AttendanceReports />}

          {activeTab === "audit" && <SystemAuditLogs />}

          {activeTab === "students" && (
            <>
              <div className="grid grid-cols-2 gap-8">
                {/* Left Panel - Registration Form */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">
                    Student Details Form
                  </h2>

                  <form className="space-y-5">
                    {/* Full Name */}
                    <div>
                      <label
                        htmlFor="studentName"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="studentName"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Enter student full name"
                      />
                    </div>

                    {/* Index Number */}
                    <div>
                      <label
                        htmlFor="studentId"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Index Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="studentId"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="e.g., CS/2024/001"
                      />
                    </div>

                    {/* Email Address */}
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="student@university.edu"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Essential for attendance reports
                      </p>
                    </div>

                    {/* Mobile Number */}
                    <div>
                      <label
                        htmlFor="mobileNumber"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        id="mobileNumber"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="+94 77 123 4567"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Essential for SMS alerts
                      </p>
                    </div>

                    {/* Department */}
                    <div>
                      <label
                        htmlFor="department"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Department <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="department"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="">Select department</option>
                        <option value="Computer Science">
                          Computer Science
                        </option>
                        <option value="Electrical Engineering">
                          Electrical Engineering
                        </option>
                        <option value="Mechanical Engineering">
                          Mechanical Engineering
                        </option>
                        <option value="Civil Engineering">
                          Civil Engineering
                        </option>
                        <option value="Business Administration">
                          Business Administration
                        </option>
                        <option value="Architecture">Architecture</option>
                      </select>
                    </div>

                    {/* Batch / Academic Year */}
                    <div>
                      <label
                        htmlFor="academicYear"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Batch / Academic Year{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="academicYear"
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="">Select academic year</option>
                        <option value="Year 1">Year 1</option>
                        <option value="Year 2">Year 2</option>
                        <option value="Year 3">Year 3</option>
                        <option value="Year 4">Year 4</option>
                      </select>
                    </div>

                    {/* Auto Generate Password Checkbox */}
                    <div className="pt-2">
                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          id="autoGeneratePassword"
                          checked={autoGeneratePassword}
                          onChange={(e) =>
                            setAutoGeneratePassword(e.target.checked)
                          }
                          className="w-4 h-4 mt-0.5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                        />
                        <label
                          htmlFor="autoGeneratePassword"
                          className="ml-3 text-sm text-gray-700 cursor-pointer"
                        >
                          Auto-generate password and send login credentials via
                          email to the student.
                        </label>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Right Panel - Webcam Feed */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">
                    Live Webcam Feed
                  </h2>

                  {/* Camera Selector Dropdown */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Camera Source
                    </label>
                    <select
                      aria-label="Select Camera Source"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                    >
                      <option value="integrated">
                        Integrated Webcam (Default)
                      </option>
                      <option value="external">External USB Camera</option>
                    </select>
                  </div>

                  {/* Large 16:9 Webcam Placeholder */}
                  <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center mb-5 relative overflow-hidden border-4 border-gray-800">
                    <div className="text-center z-10 px-6">
                      <Camera className="w-20 h-20 text-gray-600 mx-auto mb-6" />
                      <p className="text-lg text-gray-400 font-medium mb-4">
                        Live Webcam Feed
                      </p>

                      {/* Updated Multi-Angle Capture Instructions */}
                      <div className="max-w-md mx-auto">
                        <p className="text-sm text-gray-400 leading-relaxed">
                          Click Capture and slowly turn your head left, right,
                          and slightly up/down to capture face data from all
                          angles. The system will automatically take 50
                          snapshots.
                        </p>
                      </div>
                    </div>
                    {/* Simulated face detection overlay */}
                    {imagesCaptured > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-64 border-4 border-green-500 rounded-lg animate-pulse">
                          <div className="absolute -top-8 left-0 bg-green-500 text-white px-3 py-1 rounded text-sm font-medium">
                            Face Detected
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Capture Images Button */}
                  <button
                    onClick={handleCaptureImages}
                    disabled={imagesCaptured === 50}
                    className={`w-full py-3 rounded-lg font-medium transition-colors mb-5 flex items-center justify-center space-x-2 ${
                      imagesCaptured === 50
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    } text-white`}
                  >
                    <Camera className="w-5 h-5" />
                    <span>Capture Images</span>
                  </button>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Images Captured: {imagesCaptured}/50
                      </label>
                      <span className="text-sm font-medium text-blue-600">
                        {Math.round((imagesCaptured / 50) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          imagesCaptured === 50 ? "bg-green-500" : "bg-blue-600"
                        }`}
                        style={{ width: `${(imagesCaptured / 50) * 100}%` }}
                      ></div>
                    </div>
                    {imagesCaptured === 50 && (
                      <p className="text-sm text-green-600 mt-2 font-medium flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        All images captured successfully!
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Action Buttons */}
              <div className="mt-8 flex justify-end space-x-4">
                <button
                  onClick={handleClearForm}
                  className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                >
                  Clear Form
                </button>
                <button
                  onClick={handleRegisterStudent}
                  disabled={imagesCaptured < 50}
                  className={`px-8 py-3 rounded-lg font-medium transition-colors shadow-md ${
                    imagesCaptured === 50
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Register Student
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
