import { useState, useEffect } from "react";
import { LogOut, User, UserCheck, Video, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import LecturerSidebar from "./LecturerSidebar";
import LecturerDashboardHome from "./LecturerDashboardHome";
import LecturerAttendanceHistory from "./LecturerAttendanceHistory";
import LecturerMySubjects from "./LecturerMySubjects";
import LecturerSettings from "./LecturerSettings";
import LecturerLiveClassMonitoring from "./LecturerLiveClassMonitoring";
import ManualAttendanceMarking from "./ManualAttendanceMarking";
import LecturerProfile from "./LecturerProfile";
import Appointments from "./Appointments";
import LecturerTimetable from "./LecturerTimetable";

interface AttendanceRecord {
  id: number;
  studentName: string;
  indexNumber: string;
  timestamp: string;
}

interface DetectedFace {
  id: number;
  name: string;
  position: { top: string; left: string };
}

interface LecturerDashboardProps {
  onLogout: () => void;
}

export default function LecturerDashboard({
  onLogout,
}: LecturerDashboardProps) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lecturerName, setLecturerName] = useState("Lecturer");
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("lecturerRequiresPasswordChange") === "true") {
      // 1. Show the static banner
      setNeedsPasswordChange(true);

      // 2. Show the toast ONLY once per session
      if (!sessionStorage.getItem("passwordWarningToastShown")) {
        toast("Security Alert: Please change your temporary password!", {
          icon: "⚠️",
          duration: 8000,
          style: {
            borderRadius: "10px",
            background: "#FEF3C7",
            color: "#92400E",
            border: "1px solid #F59E0B",
            fontWeight: "500",
          },
        });
        // Mark as shown for this session
        sessionStorage.setItem("passwordWarningToastShown", "true");
      }
    }
  }, []);
  const [presentCount, setPresentCount] = useState(5);
  const [attendanceLog, setAttendanceLog] = useState<AttendanceRecord[]>([
    {
      id: 1,
      studentName: "John Smith",
      indexNumber: "CS/2021/001",
      timestamp: "09:15:23",
    },
    {
      id: 2,
      studentName: "Emily Johnson",
      indexNumber: "CS/2021/002",
      timestamp: "09:15:45",
    },
    {
      id: 3,
      studentName: "Michael Brown",
      indexNumber: "CS/2021/003",
      timestamp: "09:16:12",
    },
    {
      id: 4,
      studentName: "Sarah Davis",
      indexNumber: "CS/2021/004",
      timestamp: "09:16:34",
    },
    {
      id: 5,
      studentName: "David Wilson",
      indexNumber: "CS/2021/005",
      timestamp: "09:17:01",
    },
  ]);

  // Simulated detected faces with positions
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([
    { id: 1, name: "John Smith", position: { top: "15%", left: "12%" } },
    { id: 2, name: "Emily Johnson", position: { top: "20%", left: "45%" } },
    { id: 3, name: "Michael Brown", position: { top: "35%", left: "68%" } },
    { id: 4, name: "Sarah Davis", position: { top: "55%", left: "25%" } },
    { id: 5, name: "David Wilson", position: { top: "60%", left: "78%" } },
  ]);

  // Simulate real-time attendance detection
  useEffect(() => {
    if (activeTab !== "live-class") return;

    const mockStudents = [
      {
        studentName: "James Taylor",
        indexNumber: "CS/2021/006",
        position: { top: "45%", left: "52%" },
      },
      {
        studentName: "Emma Martinez",
        indexNumber: "CS/2021/007",
        position: { top: "25%", left: "82%" },
      },
      {
        studentName: "Oliver Anderson",
        indexNumber: "CS/2021/008",
        position: { top: "70%", left: "40%" },
      },
      {
        studentName: "Sophia Thomas",
        indexNumber: "CS/2021/009",
        position: { top: "48%", left: "15%" },
      },
    ];

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < mockStudents.length) {
        const now = new Date();
        const timestamp = now.toLocaleTimeString("en-US", { hour12: false });
        const newRecord = {
          id: attendanceLog.length + currentIndex + 1,
          studentName: mockStudents[currentIndex].studentName,
          indexNumber: mockStudents[currentIndex].indexNumber,
          timestamp,
        };

        const newFace = {
          id: detectedFaces.length + currentIndex + 1,
          name: mockStudents[currentIndex].studentName,
          position: mockStudents[currentIndex].position,
        };

        setAttendanceLog((prev) => [newRecord, ...prev]);
        setDetectedFaces((prev) => [...prev, newFace]);
        setPresentCount((prev) => prev + 1);
        currentIndex++;
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeTab]);

  // Fetch real-time pending appointment count + lecturer name
  useEffect(() => {
    const fetchPendingCount = async () => {
      const token = localStorage.getItem("lecturerToken");
      if (!token) return;

      try {
        const profRes = await fetch(
          "http://localhost:8000/api/lecturer/profile",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!profRes.ok) return;
        const profile = await profRes.json();

        // Set lecturer name from profile
        if (profile.name) setLecturerName(profile.name);

        const appRes = await fetch(
          `http://localhost:8000/api/appointments/lecturer/${profile.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (appRes.ok) {
          const data = await appRes.json();
          const count = data.filter((a: any) => a.status === "Pending").length;
          setPendingCount(count);
        }
      } catch (err) {
        console.error("Failed to fetch pending count:", err);
      }
    };

    fetchPendingCount();
    // Poll every 30 seconds for new requests
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case "profile":
        return "My Profile";
      case "dashboard":
        return "Lecturer Dashboard";
      case "live-class":
        return "Live Class Monitoring";
      case "history":
        return "Attendance History";
      case "subjects":
        return "My Subjects";
      case "timetable":
        return "Teaching Schedule";
      case "settings":
        return "Settings";
      case "appointments":
        return "Appointments";
      default:
        return "Lecturer Dashboard";
    }
  };

  const getHeaderDescription = () => {
    switch (activeTab) {
      case "profile":
        return "Manage your personal and academic information";
      case "dashboard":
        return "Overview of your classes and attendance";
      case "live-class":
        return "CS301 - Database Systems | Classroom A";
      case "history":
        return "View and export past class records";
      case "subjects":
        return "Manage your assigned courses";
      case "timetable":
        return "View and manage your weekly teaching schedule";
      case "settings":
        return "Manage your account and preferences";
      case "appointments":
        return "Manage student consultation requests and upcoming meetings";
      default:
        return "Overview of your classes and attendance";
    }
  };

  // Dashboard view with sidebar
  if (
    activeTab === "profile" ||
    activeTab === "dashboard" ||
    activeTab === "history" ||
    activeTab === "subjects" ||
    activeTab === "timetable" ||
    activeTab === "settings" ||
    activeTab === "mark-attendance" ||
    activeTab === "appointments"
  ) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <LecturerSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          pendingCount={pendingCount}
        />

        <div
          className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? "ml-[80px]" : "ml-[280px]"}`}
        >
          {/* Header (Hide for mark-attendance since it has its own) */}
          {activeTab !== "mark-attendance" && (
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
                      {lecturerName}
                    </span>
                  </div>
                  <button
                    onClick={onLogout}
                    className="flex items-center space-x-2 cursor-pointer px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </header>
          )}

          {/* Main Content */}
          {activeTab === "mark-attendance" ? (
            <ManualAttendanceMarking />
          ) : (
            <main className="p-8">
              {activeTab === "dashboard" && needsPasswordChange && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded-lg shadow-md animate-in slide-in-from-top duration-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <AlertTriangle className="w-8 h-8 text-red-600 mr-3 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-red-700">
                          Security Warning: Temporary Password in Use
                        </p>
                        <p className="text-sm text-black mt-1">
                          Please navigate to your{" "}
                          <button
                            onClick={() => {
                              window.location.hash = "password-settings";
                              handleTabChange("profile");
                            }}
                            className="font-bold underline hover:text-red-600 cursor-pointer"
                          >
                            My Profile
                          </button>{" "}
                          and Go to Security Section to change your password
                          immediately to secure your account.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        window.location.hash = "password-settings";
                        handleTabChange("profile");
                      }}
                      className="ml-6 px-4 py-2 bg-yellow-100 text-black text-sm font-bold rounded-lg hover:bg-red-100 border-2 transition-colors whitespace-nowrap cursor-pointer shadow-md"
                    >
                      Go to Profile
                    </button>
                  </div>
                </div>
              )}
              {activeTab === "profile" && <LecturerProfile />}
              {activeTab === "dashboard" && <LecturerDashboardHome />}
              {activeTab === "history" && <LecturerAttendanceHistory />}
              {activeTab === "subjects" && <LecturerMySubjects />}
              {activeTab === "timetable" && <LecturerTimetable />}
              {activeTab === "settings" && <LecturerSettings />}
              {activeTab === "appointments" && <Appointments />}
            </main>
          )}
        </div>
      </div>
    );
  }

  // Live class monitoring view (new dual camera system)
  if (activeTab === "live-class") {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <LecturerSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          pendingCount={pendingCount}
        />
        <div
          className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? "ml-[80px]" : "ml-[280px]"}`}
        >
          <LecturerLiveClassMonitoring
            onLogout={onLogout}
            onNavigate={(screen) => console.log("Navigate to:", screen)}
          />
        </div>
      </div>
    );
  }

  // Old live class view kept for reference (should not be reached)
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <div>
              <h1 className="text-xl font-bold text-white">
                {getHeaderTitle()}
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                {getHeaderDescription()}
              </p>
            </div>
            {activeTab === "live-class" && (
              <div className="flex items-center space-x-3 bg-green-600 px-5 py-2 rounded-lg">
                <UserCheck className="w-6 h-6 text-white" />
                <div>
                  <p className="text-xs text-green-100">Total Present</p>
                  <p className="text-2xl font-bold text-white">
                    {presentCount}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setActiveTab("dashboard")}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Back to Dashboard
            </button>
            <div className="flex items-center space-x-2 bg-gray-700 px-4 py-2 rounded-lg">
              <User className="w-5 h-5 text-gray-300" />
              <span className="text-sm font-medium text-gray-200">
                {lecturerName}
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
      <div className="flex-1 flex">
        {/* Video Feed - Takes majority of screen */}
        <div className="flex-1 p-6">
          <div className="relative w-full h-full bg-gray-950 rounded-lg overflow-hidden border-2 border-gray-700">
            {/* Simulated Classroom Video Feed */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <div className="text-center opacity-20">
                <Video className="w-32 h-32 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 text-xl">Live Classroom Feed</p>
              </div>
            </div>

            {/* Recording Indicator */}
            <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-600 px-4 py-2 rounded-lg z-10">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              <span className="text-white font-medium text-sm">LIVE</span>
            </div>

            {/* Session Timer */}
            <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-90 px-4 py-2 rounded-lg z-10">
              <p className="text-white text-sm font-medium">
                Session: 09:00 - 11:00
              </p>
            </div>

            {/* Face Detection Overlays */}
            {detectedFaces.map((face, index) => (
              <div
                key={face.id}
                className="absolute w-32 h-40 border-4 border-green-500 rounded-lg animate-pulse"
                style={{
                  top: face.position.top,
                  left: face.position.left,
                  animationDelay: `${index * 0.2}s`,
                  animationDuration: "2s",
                }}
              >
                {/* Student Name Label */}
                <div className="absolute -top-8 left-0 right-0 bg-green-500 px-2 py-1 rounded text-center">
                  <p className="text-white text-xs font-bold truncate">
                    {face.name}
                  </p>
                </div>
                {/* Checkmark Icon */}
                <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-green-500 rounded-full p-1">
                  <UserCheck className="w-4 h-4 text-white" />
                </div>
              </div>
            ))}

            {/* Bottom Status Bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-95 px-6 py-3 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-300">
                    Face Detection Active
                  </span>
                </div>
                <span className="text-gray-500">|</span>
                <span className="text-sm text-gray-300">
                  Detected: {detectedFaces.length} faces
                </span>
              </div>
              <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">
                End Session
              </button>
            </div>
          </div>
        </div>

        {/* Live Attendance Log Sidebar */}
        <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white mb-2">
              Live Attendance Log
            </h2>
            <p className="text-sm text-gray-400">Real-time student detection</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {attendanceLog.map((record, index) => (
              <div
                key={record.id}
                className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-green-500 transition-all animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {record.studentName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {record.indexNumber}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-600">
                  <span className="text-xs text-gray-400">Detected at</span>
                  <span className="text-sm font-medium text-green-400">
                    {record.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-700 bg-gray-750">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">Attendance Rate</span>
              <span className="text-lg font-bold text-white">
                {Math.round((presentCount / 45) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(presentCount / 45) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
