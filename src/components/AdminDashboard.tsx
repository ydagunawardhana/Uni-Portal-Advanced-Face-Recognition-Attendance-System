import { useState, useEffect, useRef, useCallback } from "react";
import {
  LogOut,
  Camera,
  User,
  CheckCircle,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import Sidebar from "./Sidebar";
import DashboardHome from "./DashboardHome";
import SettingsScreen from "./SettingsScreen";
import ManageLecturers from "./ManageLecturers";
import ManageStudents from "./ManageStudents";
import AttendanceReports from "./AttendanceReports";
import SystemAuditLogs from "./SystemAuditLogs";
import PendingRegistrations from "./PendingRegistrations";

const API_BASE = "http://localhost:8000";
const TOTAL_FRAMES = 50;
const FRAME_INTERVAL_MS = 300;

const universityData: Record<string, Record<string, string[]>> = {
  "Faculty of Computing": {
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
  },
  "Faculty of Business": {
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
    "Department of Accounting and Finance": [
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
  },
  "Faculty of Engineering": {
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
      "BSc (Hons) Quantity Surveying Top-Up Degree",
    ],
    "Department of Design Studies": [
      "Bachelor of Interior Design",
      "BA (Hons) in Interior Design",
    ],
  },
  "Faculty of Science": {
    "Department of Health Sciences": [
      "BSc (Hons) in Biomedical Science",
      "BSc (Hons) Biomedical Science",
      "BSc (Honours) in Pharmaceutical Science",
      "BSc (Hons) Nutrition and Health",
      "BSc (Hons) Nursing",
      "BSc (Hons) Nursing – Top up",
      "Foundation Programme for Bachelor's Degree",
    ],
    "Department of Life Sciences": ["BSc (Hons) Psychology"],
  },
};

interface AdminDashboardProps {
  onLogout: () => void;
  onNavigate: (screen: "admin" | "reporting") => void;
}

export default function AdminDashboard({
  onLogout,
  onNavigate,
}: AdminDashboardProps) {
  //  UI state
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem("adminActiveTab") || "dashboard",
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  //  Form fields
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [department, setDepartment] = useState(""); // Maps to selectedDepartment
  const [selectedDegree, setSelectedDegree] = useState("");
  const [academicYearText, setAcademicYearText] = useState("");
  const [intake, setIntake] = useState("");
  const [nicNumber, setNicNumber] = useState("");
  const [gender, setGender] = useState("");
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(false);
  const [pendingPreRegId, setPendingPreRegId] = useState<number | null>(null);

  //  Webcam / capture state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [camActive, setCamActive] = useState(false);
  const [imagesCaptured, setImagesCaptured] = useState(0);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [faceStatus, setFaceStatus] = useState<{
    isError: boolean;
    message: string;
  } | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [registering, setRegistering] = useState(false);

  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
    [],
  );
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

  const captureActiveRef = useRef(false);

  //  Fetch available cameras
  useEffect(() => {
    async function getCameras() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setAvailableCameras(videoDevices);
        if (videoDevices.length > 0 && !selectedCameraId) {
          setSelectedCameraId(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error("Error fetching cameras:", error);
      }
    }
    getCameras();
  }, [selectedCameraId]);

  //  Derived
  const captureComplete = imagesCaptured >= TOTAL_FRAMES;
  const cameraStatus = camActive ? "Online" : "Offline";

  //  Tab change
  const handleTabChange = (tab: string) => {
    // Stop camera when leaving the students tab
    if (tab !== "students") stopCamera();
    setActiveTab(tab);
    localStorage.setItem("adminActiveTab", tab);
    // Always scroll to top when changing tabs so the fixed header never overlaps content
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const handleProcessPreRegistration = (data: any) => {
    setStudentName(data.name);
    setPersonalEmail(data.personal_email);
    setMobileNumber(data.mobile || "");
    setNicNumber(data.nic_number || "");
    setGender(data.gender || "Male");
    setSelectedFaculty(data.faculty || "");
    setDepartment(data.department || "");
    setSelectedDegree(data.degree_program || "");
    setIntake(data.intake || "");
    setPendingPreRegId(data.id);

    setActiveTab("students");
    localStorage.setItem("adminActiveTab", "students");
    toast.success(`Form pre-filled for ${data.name}`);
  };

  //  Camera helpers
  const startCamera = useCallback(
    async (deviceIdToUse?: string) => {
      const targetDeviceId =
        typeof deviceIdToUse === "string" ? deviceIdToUse : selectedCameraId;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: targetDeviceId
            ? { deviceId: { exact: targetDeviceId }, width: 640, height: 480 }
            : { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCamActive(true);
      } catch {
        toast.error(
          "Could not access webcam. Please allow camera permissions.",
        );
      }
    },
    [selectedCameraId],
  );

  const stopCamera = useCallback(() => {
    captureActiveRef.current = false;
    if (captureTimerRef.current) clearInterval(captureTimerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamActive(false);
    setCapturing(false);
  }, []);

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDeviceId = e.target.value;
    setSelectedCameraId(newDeviceId);

    if (camActive) {
      stopCamera();
      // Delay starting new stream slightly so the browser frees the previous hardware reference
      setTimeout(() => {
        startCamera(newDeviceId);
      }, 300);
    }
  };

  //  Capture a single frame
  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Strip the data-URL prefix → raw base64 string
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    return dataUrl.split(",")[1];
  }, []);

  //  Kick off the 50-frame capture sequence
  const handleCaptureImages = useCallback(() => {
    if (!camActive) {
      toast.error("Please start the camera first before capturing.");
      return;
    }
    if (!studentId.trim()) {
      toast.error("Please enter the Index Number before capturing images.");
      return;
    }
    if (capturing || captureComplete) return;

    setCapturing(true);
    setImagesCaptured(0);
    setCapturedFrames([]);
    setFaceStatus(null);
    captureActiveRef.current = true;

    let currentFrames: string[] = [];
    const toastId = toast.loading("Capturing face images… (0/50)");

    const captureLoop = async () => {
      while (captureActiveRef.current && currentFrames.length < TOTAL_FRAMES) {
        const b64 = captureFrame();
        if (b64) {
          try {
            const res = await fetch(`${API_BASE}/api/admin/validate-face`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ frame_b64: b64 }),
            });
            const data = await res.json();

            if (data.face_detected) {
              currentFrames.push(b64);
              setImagesCaptured(currentFrames.length);
              setFaceStatus({ isError: false, message: "Face Detected" });
              toast.loading(
                `Capturing face images… (${currentFrames.length}/${TOTAL_FRAMES})`,
                { id: toastId },
              );
            } else {
              setFaceStatus({ isError: true, message: `${data.reason}` });
            }
          } catch {
            setFaceStatus({ isError: true, message: "Validation error" });
          }
        }
        await new Promise((resolve) => setTimeout(resolve, FRAME_INTERVAL_MS));
      }

      if (currentFrames.length >= TOTAL_FRAMES && captureActiveRef.current) {
        setCapturedFrames(currentFrames);
        setCapturing(false);
        captureActiveRef.current = false;
        toast.success("All 50 images captured!", {
          id: toastId,
          duration: 3000,
        });
      } else {
        toast.dismiss(toastId);
        setCapturing(false);
      }
    };

    captureLoop();
  }, [capturing, captureComplete, captureFrame, studentId, camActive]);

  // Derived fields
  const autoEmail = studentId ? `${studentId.toLowerCase().replace(/\s+/g, '')}@students.university.edu` : "";

  //  Register student
  const handleRegisterStudent = useCallback(async () => {
    // Basic validation
    if (
      !studentName ||
      !studentId ||
      !personalEmail ||
      !mobileNumber ||
      !department ||
      !nicNumber ||
      !gender ||
      !academicYearText ||
      !intake
    ) {
      toast.error("Please fill in all required fields before registering.");
      return;
    }
    if (!autoGeneratePassword) {
      toast.error("You must check auto-generate password.");
      return;
    }
    if (!captureComplete) {
      toast.error("Please capture all 50 face images first.");
      return;
    }

    setRegistering(true);
    const toastId = toast.loading("Registering student…");

    try {
      const res = await fetch(`${API_BASE}/api/admin/register-student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: studentName,
          index_number: studentId,
          email: autoEmail,
          personal_email: personalEmail,
          mobile: mobileNumber,
          department,
          faculty: selectedFaculty,
          degree_program: selectedDegree,
          nic_number: nicNumber,
          gender,
          academic_year: academicYearText,
          intake,
          face_frames: capturedFrames,
          auto_gen_password: autoGeneratePassword,
          password: undefined,
          pre_registration_id: pendingPreRegId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.detail ?? "Registration failed. Please try again.", {
          id: toastId,
          duration: 5000,
        });
        return;
      }

      // Build success message
      let successMsg = `${data.message}`;
      if (data.generated_password) {
        successMsg += `\n Login Details have been sent to the student's email.`;
      }
      toast.success(successMsg, {
        id: toastId,
        duration: 8000,
        style: {
          background: "#2cad5dff",
          color: "#fff",
          fontWeight: "600",
          padding: "14px 20px",
          borderRadius: "10px",
          whiteSpace: "pre-line",
          lineHeight: "1",
          minWidth: "380px",
        },
      });

      handleClearForm();
      setPendingPreRegId(null);
    } catch {
      toast.error("Server error. Please check the backend.", {
        id: toastId,
        duration: 5000,
      });
    } finally {
      setRegistering(false);
    }
  }, [
    studentName,
    studentId,
    personalEmail,
    mobileNumber,
    department,
    nicNumber,
    gender,
    academicYearText,
    intake,
    autoGeneratePassword,
    captureComplete,
    capturedFrames,
    selectedFaculty,
    selectedDegree,
  ]);

  //  Clear form
  const handleClearForm = () => {
    setStudentName("");
    setStudentId("");
    setPersonalEmail("");
    setMobileNumber("");
    setSelectedFaculty("");
    setDepartment("");
    setSelectedDegree("");
    setAcademicYearText("");
    setIntake("");
    setNicNumber("");
    setGender("");
    setImagesCaptured(0);
    setCapturedFrames([]);
    setFaceStatus(null);
    setAutoGeneratePassword(false);
    setCapturing(false);
    captureActiveRef.current = false;
    if (captureTimerRef.current) clearInterval(captureTimerRef.current);
  };

  //  Header helpers
  const getHeaderTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return "Admin Dashboard";
      case "students":
        return "Student Registration";
      case "manage_students":
        return "Manage Students";
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
      case "manage_students":
        return "View all registered students and process re-training requests";
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

  const handleLogoutClick = () => {
    toast.success("Logged out successfully!", {
      icon: "👋",
      duration: 2500,
    });
    setTimeout(() => {
      onLogout();
    }, 500);
  };

  //  Render
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onCollapseChange={setIsSidebarCollapsed}
      />

      <div
        className={`w-full transition-all duration-300 ${
          isSidebarCollapsed ? "ml-[80px]" : "ml-[280px]"
        }`}
      >
        {/*  Fixed Header  */}
        <header
          className={`top-0 z-40 bg-white shadow-md border-b border-gray-200 transition-all duration-300 ${
            isSidebarCollapsed ? "left-[80px]" : "left-[280px]"
          }`}
        >
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
              {/* Camera Status Pill */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
                  cameraStatus === "Online"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : cameraStatus === "Offline"
                      ? "bg-red-50 border-red-200 text-red-600"
                      : "bg-gray-100 border-gray-200 text-gray-500"
                }`}
              >
                {cameraStatus === "Online" ? (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                    </span>
                    <Wifi className="w-3.5 h-3.5" />
                    Camera: Online
                  </>
                ) : cameraStatus === "Offline" ? (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                    </span>
                    <WifiOff className="w-3.5 h-3.5" />
                    Camera: Offline
                  </>
                ) : (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-pulse relative inline-flex rounded-full h-2.5 w-2.5 bg-gray-400" />
                    </span>
                    Checking…
                  </>
                )}
              </div>

              <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg">
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  Admin User
                </span>
              </div>
              <button
                onClick={handleLogoutClick}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/*  Main Content  */}
        <main className="px-8" style={{ paddingTop: "25px" }}>
          {activeTab === "dashboard" && (
            <DashboardHome onTabChange={handleTabChange} />
          )}
          {activeTab === "settings" && <SettingsScreen />}
          {activeTab === "lecturers" && <ManageLecturers />}
          {activeTab === "manage_students" && (
            <ManageStudents onRegisterNew={() => handleTabChange("students")} />
          )}
          {activeTab === "reports" && <AttendanceReports />}
          {activeTab === "audit" && <SystemAuditLogs />}
          {activeTab === "pre_registrations" && (
             <PendingRegistrations onProcess={handleProcessPreRegistration} />
          )}

          {/*  Student Registration  */}
          {activeTab === "students" && (
            <>
              {/* Hidden canvas used for frame capture */}
              <canvas ref={canvasRef} className="hidden" />

              <div className="grid grid-cols-2 gap-8">
                {/*  Left Panel: Form  */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
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
                        placeholder="e.g. CS202601"
                      />
                    </div>

                    {/* Personal Email */}
                    <div>
                      <label
                        htmlFor="personalEmail"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Personal Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="personalEmail"
                        value={personalEmail}
                        onChange={(e) => setPersonalEmail(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="e.g. john.doe@gmail.com"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Secure logic credentials will be generated and delivered here
                      </p>
                    </div>

                    {/* Official University Email */}
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Official University Email (Auto-generated)
                      </label>
                      <input
                        type="text"
                        id="email"
                        value={autoEmail}
                        readOnly
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-black font-medium outline-none cursor-not-allowed"
                        placeholder="student@university.edu"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Essential for academic attendance grouping
                      </p>
                    </div>

                    {/* Mobile */}
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

                    {/* Cascading Dropdowns: Faculty, Department, Degree */}
                    <div className="flex flex-col gap-4">
                      {/* Row 1: Faculty + Department */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Faculty */}
                        <div>
                          <label
                            htmlFor="faculty"
                            className="block text-sm font-medium text-gray-700 mb-2"
                          >
                            Faculty <span className="text-red-500">*</span>
                          </label>
                          <select
                            id="faculty"
                            value={selectedFaculty}
                            onChange={(e) => {
                              setSelectedFaculty(e.target.value);
                              setDepartment("");
                              setSelectedDegree("");
                            }}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          >
                            <option value="">Select Faculty</option>
                            {Object.keys(universityData).map((faculty) => (
                              <option key={faculty} value={faculty}>
                                {faculty}
                              </option>
                            ))}
                          </select>
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
                            onChange={(e) => {
                              setDepartment(e.target.value);
                              setSelectedDegree("");
                            }}
                            disabled={!selectedFaculty}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">Select Department</option>
                            {selectedFaculty &&
                              Object.keys(universityData[selectedFaculty]).map(
                                (dept) => (
                                  <option key={dept} value={dept}>
                                    {dept}
                                  </option>
                                ),
                              )}
                          </select>
                        </div>
                      </div>

                      {/* Row 2: Degree Program */}
                      <div className="w-full">
                        <label
                          htmlFor="degree"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Degree Program <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="degree"
                          value={selectedDegree}
                          onChange={(e) => setSelectedDegree(e.target.value)}
                          disabled={!department}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="">Select Degree Program</option>
                          {selectedFaculty &&
                            department &&
                            universityData[selectedFaculty][department].map(
                              (degree) => (
                                <option key={degree} value={degree}>
                                  {degree}
                                </option>
                              ),
                            )}
                        </select>
                      </div>
                    </div>

                    {/* NIC + Gender side-by-side */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="nicNumber"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          NIC Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="nicNumber"
                          value={nicNumber}
                          onChange={(e) => setNicNumber(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="e.g. 200012345678"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="gender"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Gender <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="gender"
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                    </div>

                    {/* Academic Year + Intake side-by-side */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="academicYearText"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Academic Year <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="academicYearText"
                          value={academicYearText}
                          onChange={(e) => setAcademicYearText(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="e.g. 2026"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="intake"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Intake / Batch <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="intake"
                          value={intake}
                          onChange={(e) => setIntake(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="e.g. 26.1"
                        />
                      </div>
                    </div>

                    {/* Auto-generate password */}
                    <div>
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
                          className="ml-3 text-sm font-semibold text-gray-700 cursor-pointer"
                        >
                          Auto-generate password and send login credentials via
                          email to the student.
                          <span className="text-red-500">*</span>
                        </label>
                      </div>
                    </div>
                  </form>
                </div>

                {/*  Right Panel: Webcam  */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">
                    Live Webcam Feed
                  </h2>

                  {/* Camera source selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Camera Source
                    </label>
                    <select
                      aria-label="Select Camera Source"
                      value={selectedCameraId}
                      onChange={handleCameraChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                    >
                      {availableCameras.length === 0 && (
                        <option value="">No cameras found</option>
                      )}
                      {availableCameras.map((cam, idx) => (
                        <option key={cam.deviceId} value={cam.deviceId}>
                          {cam.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Video container */}
                  <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center mb-5 relative overflow-hidden border-4 border-gray-800">
                    {/* Live video element */}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`absolute inset-0 w-full h-full object-cover ${camActive ? "opacity-100" : "opacity-0"}`}
                    />

                    {/* Placeholder shown when camera isn't active */}
                    {!camActive && (
                      <div className="text-center z-10 px-6">
                        <Camera className="w-20 h-20 text-gray-600 mx-auto mb-6" />
                        <p className="text-lg text-gray-400 font-medium mb-4">
                          Live Webcam Feed
                        </p>
                        <div className="max-w-md mx-auto">
                          <p className="text-sm text-gray-400 leading-relaxed">
                            Click Start Camera below, then click Capture and
                            slowly turn your head. The system will automatically
                            take 50 snapshots.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Permanent Target Guide overlay when camera is active */}
                    {camActive && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                        {/* Target border guide with darkened surroundings via massive box-shadow */}
                        <div
                          className="w-[260px] h-[340px] z-10  rounded-[30px] border-2 border-green-500/20 relative flex items-center justify-center transition-all duration-300"
                          style={{
                            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.1)",
                          }}
                        >
                          {/* Green Viewfinder Corner Accents */}
                          <div className="absolute -top-0.5 -left-0.5 w-10 h-10 border-t-4 border-l-4 border-green-500 rounded-tl-[30px]"></div>
                          <div className="absolute -top-0.5 -right-0.5 w-10 h-10 border-t-4 border-r-4 border-green-500 rounded-tr-[30px]"></div>
                          <div className="absolute -bottom-0.5 -left-0.5 w-10 h-10 border-b-4 border-l-4 border-green-500 rounded-bl-[30px]"></div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-10 h-10 border-b-4 border-r-4 border-green-500 rounded-br-[30px]"></div>

                          <span className="absolute -bottom-14 text-white text-sm font-medium bg-black/60 px-5 py-2 rounded-full whitespace-nowrap tracking-wide ">
                            Align face within frame
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Face bounding-box overlay during capture */}
                    {imagesCaptured > 0 && camActive && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        <div className="w-64 h-64 border-4 border-green-500 rounded-lg animate-pulse">
                          <div className="absolute -top-8 left-0 bg-green-500 text-white px-3 py-1 rounded text-sm font-medium">
                            Face Detected
                          </div>
                        </div>
                      </div>
                    )}

                    {/* "Capturing" spinner overlay */}
                    {capturing && (
                      <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1 z-20">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Capturing…
                      </div>
                    )}
                  </div>

                  {/* Start/Stop Camera Toggle */}
                  <button
                    type="button"
                    onClick={() => (camActive ? stopCamera() : startCamera())}
                    className={`w-full py-3 mb-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                      camActive
                        ? "border-2 border-red-500 text-red-500 hover:bg-red-50"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    <Camera className="w-5 h-5" />
                    <span>
                      {camActive ? "Turn Off Camera" : "Start Camera"}
                    </span>
                  </button>

                  {/* Capture button */}
                  <button
                    onClick={handleCaptureImages}
                    disabled={captureComplete || capturing}
                    className={`w-full py-3 rounded-lg font-medium transition-colors mb-5 flex items-center justify-center space-x-2 ${
                      captureComplete || capturing
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    } text-white`}
                  >
                    {capturing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Capturing…</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5" />
                        <span>Capture Images</span>
                      </>
                    )}
                  </button>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Images Captured: {imagesCaptured}/{TOTAL_FRAMES}
                      </label>

                      {faceStatus && (
                        <span
                          className={`text-sm font-semibold truncate max-w-[50%] text-right ${faceStatus.isError ? "text-red-500" : "text-green-600"}`}
                        >
                          {faceStatus.message}
                        </span>
                      )}

                      <span className="text-sm font-medium text-blue-600 ml-auto pl-4">
                        {Math.round((imagesCaptured / TOTAL_FRAMES) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          captureComplete ? "bg-green-500" : "bg-blue-600"
                        }`}
                        style={{
                          width: `${(imagesCaptured / TOTAL_FRAMES) * 100}%`,
                        }}
                      />
                    </div>
                    {captureComplete && (
                      <p className="text-sm text-green-600 mt-2 font-medium flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        All images captured successfully!
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer action buttons */}
              <div className="mt-4 flex justify-end space-x-4 mb-6">
                <button
                  onClick={handleClearForm}
                  className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                >
                  Clear Form
                </button>
                <button
                  onClick={handleRegisterStudent}
                  disabled={!captureComplete || registering}
                  className={`px-8 py-3 rounded-lg font-medium transition-colors shadow-md flex items-center gap-2 ${
                    captureComplete && !registering
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {registering && <Loader2 className="w-4 h-4 animate-spin" />}
                  {registering ? "Registering…" : "Register Student"}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
