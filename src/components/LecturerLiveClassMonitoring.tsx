import { useState, useEffect, useRef, useCallback } from "react";
import {
  Video,
  ArrowUp,
  ArrowDown,
  Clock,
  Users,
  UserMinus,
  Pencil,
  Square,
  CameraOff,
  Play,
  CheckCircle,
  X,
  User,
} from "lucide-react";

// Constants
const API_BASE = "http://localhost:8000";
const CAPTURE_INTERVAL_MS = 3000; // send a frame every 3 seconds

// Props / Data Interfaces
interface LecturerLiveClassMonitoringProps {
  onLogout: () => void;
  onNavigate: (screen: any) => void;
}

interface LogEntry {
  id: number;
  studentName: string;
  indexNumber?: string;
  time: string;
  status: "entered" | "exited";
}

interface FaceBox {
  id: number;
  left: string;
  top: string;
  width: string;
  height: string;
  name: string;
}

// API Response shapes
interface ApiFaceResult {
  label: string;
  user_id: number;
  confidence: number;
  is_known: boolean;
  bbox: { x: number; y: number; w: number; h: number };
}

interface ApiAttendanceResponse {
  message: string;
  faces_detected: number;
  faces_recognised: number;
  results: ApiFaceResult[];
  logs: {
    id: number;
    student_id: number;
    timestamp: string;
    status: "entered" | "exited";
    student?: { id: number; index_number: string; name: string };
  }[];
  timestamp: string;
}

// Helpers
let _logIdCounter = 1000;

function nowTimeString(): string {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function bboxToPercent(
  bbox: { x: number; y: number; w: number; h: number },
  frameW: number,
  frameH: number,
): { left: string; top: string; width: string; height: string } {
  return {
    left: `${((bbox.x / frameW) * 100).toFixed(1)}%`,
    top: `${((bbox.y / frameH) * 100).toFixed(1)}%`,
    width: `${((bbox.w / frameW) * 100).toFixed(1)}%`,
    height: `${((bbox.h / frameH) * 100).toFixed(1)}%`,
  };
}

const LiveTimer = ({ isSessionActive }: { isSessionActive: boolean }) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isSessionActive) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [isSessionActive]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  if (!isSessionActive) return null;

  return (
    <span className="text-red-600 font-bold text-sm flex items-center gap-1.5 animate-pulse min-w-[100px]">
      <span className="w-2 h-2 rounded-full bg-red-600"></span>
      Live: {formatTime(elapsedTime)}
    </span>
  );
};

const RealTimeClock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-end">
      <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        {currentTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
      <span className="text-sm font-medium text-gray-500">
        {currentTime.toLocaleDateString([], {
          weekday: "long",
          month: "short",
          day: "numeric",
        })}
      </span>
    </div>
  );
};

// Component
export default function LecturerLiveClassMonitoring({
  onLogout,
  onNavigate,
}: LecturerLiveClassMonitoringProps) {
  // UI state
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [lecturerId, setLecturerId] = useState<number | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const [editStatus, setEditStatus] = useState("Present");
  const [editTime, setEditTime] = useState("");
  const [editReason, setEditReason] = useState("");
  const [isEntranceActive, setIsEntranceActive] = useState(false);
  const [isExitActive, setIsExitActive] = useState(false);

  // Session configuration state
  const [sessionDetails, setSessionDetails] = useState({
    type: "Lecture",
    location: "Lab 01",
  });
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);

  // Face box state – now driven by live annotated frames
  const [annotatedFrame, setAnnotatedFrame] = useState<string | null>(null);

  // Attendance log state
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);

  // Live stats (derived from log entries)
  const [liveStats, setLiveStats] = useState({
    currentlyInside: 0,
    totalEntered: 0,
    leftEarly: 0,
  });

  // Attendance notification toast
  const [attendanceToast, setAttendanceToast] = useState<string | null>(null);

  // Camera / recognition refs & state
  const entranceVideoRef = useRef<HTMLVideoElement>(null);
  const exitVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [inCameraId, setInCameraId] = useState("");
  const [outCameraId, setOutCameraId] = useState("");

  const inCamIndex = videoDevices.findIndex(
    (cam) => cam.deviceId === inCameraId,
  );
  const outCamIndex = videoDevices.findIndex(
    (cam) => cam.deviceId === outCameraId,
  );

  useEffect(() => {
    const getCameras = async () => {
      try {
        // 1. Request permission first to get actual device labels
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        // 2. Enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(
          (device) => device.kind === "videoinput",
        );
        setVideoDevices(videoInputs);

        // 3. CRITICAL: Stop the stream immediately to turn off the camera light!
        stream.getTracks().forEach((track) => track.stop());

        // Set defaults if available
        if (videoInputs.length > 0) setInCameraId(videoInputs[0].deviceId);
        if (videoInputs.length > 1) setOutCameraId(videoInputs[1].deviceId);
      } catch (err) {
        console.error("Error fetching cameras:", err);
      }
    };
    getCameras();
  }, []);

  // Fetch Lecturer ID on mount (Auth Context placeholder)
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("lecturerToken");
        if (!token) return;

        const res = await fetch(`${API_BASE}/api/lecturer/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setLecturerId(data.id);
        }
      } catch (err) {
        console.error("Failed to fetch lecturer profile", err);
      }
    };
    fetchProfile();
  }, []);

  // Live Data Polling for Logs and Stats
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    
    if (sessionActive && currentSessionId) {
      interval = setInterval(async () => {
        try {
          const logsRes = await fetch(`${API_BASE}/api/attendance/live_logs/${currentSessionId}`);
          if (logsRes.ok) {
            const logsData = await logsRes.json();
            setLogEntries(logsData.map((d: any, idx: number) => ({
              id: `${idx}-${d.time || d.timestamp}`,
              studentName: d.name,
              index: d.index_number,
              time: d.timestamp,
              status: d.status
            })));
          }

          const statsRes = await fetch(`${API_BASE}/api/attendance/session_stats/${currentSessionId}`);
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            setLiveStats({
              currentlyInside: statsData.currently_inside || 0,
              totalEntered: statsData.total_entered || 0,
              leftEarly: statsData.left_early || 0
            });
          }
        } catch (error) {
          console.error("Live polling error:", error);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionActive, currentSessionId]);

  // Auto-dismiss toasts
  useEffect(() => {
    if (showSuccessToast) {
      const t = setTimeout(() => setShowSuccessToast(false), 5000);
      return () => clearTimeout(t);
    }
  }, [showSuccessToast]);

  useEffect(() => {
    if (attendanceToast) {
      const t = setTimeout(() => setAttendanceToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [attendanceToast]);

  // Update live stats whenever logEntries changes
  useEffect(() => {
    const entered = logEntries.filter((e) => e.status === "entered").length;
    const exited = logEntries.filter((e) => e.status === "exited").length;
    setLiveStats({
      totalEntered: entered,
      currentlyInside: Math.max(0, entered - exited),
      leftEarly: exited,
    });
  }, [logEntries]);

  const startCamera = useCallback(async () => {
    // Media stream no longer needed for frontend processing.
    // The backend VideoCapture process handles the streams natively using OpenCV indices.
    setCameraError(null);
  }, []);

  // Camera teardown is handled automatically by the server closing the HTTP streams when the img is removed
  const stopCamera = useCallback(() => {
    if (captureTimerRef.current) {
      clearInterval(captureTimerRef.current);
      captureTimerRef.current = null;
    }
  }, []);

  // Capture + recognise
  const captureAndRecognize = useCallback(async () => {
    const video = entranceVideoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || isProcessing) return;

    const W = video.videoWidth || 640;
    const H = video.videoHeight || 480;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, W, H);

    setIsProcessing(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
          "image/jpeg",
          0.85,
        ),
      );

      const form = new FormData();
      form.append("file", blob, "frame.jpg");
      form.append("debounce_min", "1");

      const token = localStorage.getItem("lecturerToken");
      const res = await fetch(`${API_BASE}/api/attendance`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data: ApiAttendanceResponse = await res.json();

      // Update the annotated frame stream from backend
      if ((data as any).annotated_frame_base64) {
        setAnnotatedFrame((data as any).annotated_frame_base64);
      }

      // Prepend new log entries
      if (data.logs.length > 0) {
        const newEntries: LogEntry[] = data.logs.map((log) => ({
          id: _logIdCounter++,
          studentName: log.student?.name ?? `Student #${log.student_id}`,
          indexNumber: log.student?.index_number,
          time: nowTimeString(),
          status: log.status,
        }));

        setLogEntries((prev) => [...newEntries, ...prev].slice(0, 100));

        // Show attendance toast for the first recognised person
        const firstName = newEntries[0].studentName;
        const firstStatus =
          newEntries[0].status === "entered" ? "Entered" : "Exited";
        setAttendanceToast(`Attendance Marked — ${firstName} (${firstStatus})`);
      }
    } catch (err: any) {
      // silently swallow network errors between captures; show nothing to avoid spam
      console.warn("[FaceRecognition] capture error:", err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  // Session lifecycle
  const handleStartSession = async () => {
    if (!selectedSession) {
      setCameraError("Please select a Course Session to begin tracking.");
      return;
    }

    try {
      // 1. Resolve dynamic IDs for foreign key constraints
      const currentLecturerId = lecturerId || 5; // Fallback to 5 for testing if profile fetch fails
      
      if (!selectedSubject) {
        setCameraError("Please select a Course Subject to begin tracking.");
        return;
      }

      // 2. Initialize session in backend
      const res = await fetch(`${API_BASE}/api/attendance/start_session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lecturer_id: currentLecturerId,
          subject_id: selectedSubject,
          batch_id: selectedSession,
          session_type: sessionDetails.type,
          location: sessionDetails.location,
        }),
      });

      if (!res.ok) throw new Error("Failed to start backend session");
      const data = await res.json();
      setCurrentSessionId(data.id);

      // 2. Start frontend camera hardware
      await startCamera();
      setSessionActive(true);
      setAttendanceToast(null);

      // Optionally start neither, but let's start entrance by default if specified
      if (inCameraId) setIsEntranceActive(true);
    } catch (err: any) {
      setCameraError(`Session Error: ${err.message}`);
    }
  };

  const toggleEntranceCamera = async (start: boolean) => {
    if (start) {
      setIsExitActive(false);
      setIsEntranceActive(true);
    } else {
      setIsEntranceActive(false);
      try {
        await fetch(`${API_BASE}/api/attendance/stop_cameras`, {
          method: "POST",
        });
      } catch (err) {}
    }
  };

  const toggleExitCamera = async (start: boolean) => {
    if (start) {
      setIsEntranceActive(false);
      setIsExitActive(true);
    } else {
      setIsExitActive(false);
      try {
        await fetch(`${API_BASE}/api/attendance/stop_cameras`, {
          method: "POST",
        });
      } catch (err) {}
    }
  };

  // No longer polling the frontend React camera canvas! Wait for backend to perform attendance via stream.

  const handleEndSession = useCallback(async () => {
    stopCamera();
    setSessionActive(false);
    setIsEntranceActive(false);
    setIsExitActive(false);
    setMediaStream(null); // prevent the attach-effect from re-running
    setAnnotatedFrame(null);
    setShowEndSessionModal(false);
    setShowSuccessToast(true);

    try {
      // 1. Close session in backend
      if (currentSessionId) {
        await fetch(
          `${API_BASE}/api/attendance/end_session/${currentSessionId}`,
          { method: "POST" }
        );
        setCurrentSessionId(null);
      }

      // 2. Force backend hardware teardown explicitly
      await fetch(`${API_BASE}/api/attendance/stop_cameras`, {
        method: "POST",
      });
    } catch (err) {
      console.error("Failed to release cameras gracefully", err);
    }
  }, [stopCamera, currentSessionId]);

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  // Edit modal helpers (unchanged logic)
  const handleEditEntry = (entry: LogEntry) => {
    setSelectedEntry(entry);
    setEditStatus(entry.status === "entered" ? "Present" : "Absent");
    setEditTime(entry.time);
    setEditReason("");
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (selectedEntry) {
      const updated: LogEntry = {
        ...selectedEntry,
        status: editStatus === "Present" ? "entered" : "exited",
        time: editTime,
      };
      setLogEntries((prev) =>
        prev.map((e) => (e.id === selectedEntry.id ? updated : e)),
      );
      setShowEditModal(false);
    }
  };

  // RENDER
  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      {/* Hidden canvas used for frame capture — never rendered visibly */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-4">
            {/* Subject Selector */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Subject
              </label>
              <select
                aria-label="Select Course Subject"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                disabled={sessionActive}
                className="w-full px-4 cursor-pointer py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="">Select Subject...</option>
                <option value="CS-101">
                  Database Management Systems (CS-101)
                </option>
                <option value="CS-102">
                  Data Structures &amp; Algorithms (CS-102)
                </option>
                <option value="CS-201">Operating Systems (CS-201)</option>
                <option value="CS-202">Computer Networks (CS-202)</option>
              </select>
            </div>

            {/* Session Selector */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Session
              </label>
              <select
                aria-label="Select Course Session"
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                disabled={sessionActive}
                className="w-full cursor-pointer px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500  transition-all disabled:opacity-75"
              >
                <option value="">Select Session/Batch...</option>
                <option value="session1">
                  Today 9:00 AM - Year 2 Semester 1
                </option>
                <option value="session2">
                  Today 11:00 AM - Year 2 Semester 2
                </option>
                <option value="session3">
                  Today 2:00 PM - Year 3 Semester 1
                </option>
                <option value="session4">
                  Today 4:00 PM - Year 3 Semester 2
                </option>
              </select>
            </div>

            {/* Session Type */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Session Type
              </label>
              <select
                value={sessionDetails.type}
                onChange={(e) =>
                  setSessionDetails({ ...sessionDetails, type: e.target.value })
                }
                disabled={sessionActive}
                className="w-full cursor-pointer px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-75"
              >
                <option value="Lecture">Lecture</option>
                <option value="Practical/Lab">Practical/Lab</option>
                <option value="Tutorial">Tutorial</option>
                <option value="Examination">Examination</option>
              </select>
            </div>

            {/* Location */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Location
              </label>
              <select
                value={sessionDetails.location}
                onChange={(e) =>
                  setSessionDetails({
                    ...sessionDetails,
                    location: e.target.value,
                  })
                }
                disabled={sessionActive}
                className="w-full cursor-pointer px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-75"
              >
                <option value="Main Auditorium">Main Auditorium</option>
                <option value="Lab 01">Lab 01</option>
                <option value="Lab 02">Lab 02</option>
                <option value="Hall A">Hall A</option>
                <option value="Hall B">Hall B</option>
              </select>
            </div>

            {/* Session Controls */}
            <div className="flex items-end pl-2">
              <div className="flex items-center gap-3">
                {/* Session Button & Timer */}
                {sessionActive ? (
                  <div className="flex items-center gap-3">
                    <LiveTimer isSessionActive={sessionActive} />
                    <button
                      onClick={() => setShowEndSessionModal(true)}
                      className="px-5 py-2.5 cursor-pointer bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition"
                    >
                      End Session
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleStartSession}
                    disabled={!inCameraId}
                    className={`px-5 py-2.5 cursor-pointer text-white rounded-lg font-bold text-sm transition flex items-center gap-2 whitespace-nowrap ${
                      !inCameraId
                        ? "bg-green-400 cursor-not-allowed opacity-70"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    <Play className="w-4 h-4 fill-white" /> Start Live Session
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 pb-2 text-xs text-gray-500 font-medium italic flex items-center space-x-1">
            <span>
              Note: If hardware feeds are swapped, simply reverse your
              selections in the IN/OUT dropdowns (Browser and OS hardware
              enumeration order can occasionally differ).
            </span>
          </div>

          {/* Camera permission error banner */}
          {cameraError && (
            <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
              <CameraOff className="w-4 h-4 flex-shrink-0" />
              <span>{cameraError}</span>
              <button
                onClick={() => setCameraError(null)}
                className="ml-auto hover:text-red-900"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Main Content - Dual Camera Grid + Log Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Camera Grid Section */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="grid grid-cols-2 gap-6 h-full">
              {/* Entrance Camera Feed */}
              <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 overflow-hidden flex flex-col">
                <div className="bg-green-600 text-white px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold">
                    <Video className="w-5 h-5" /> Entrance Camera (IN)
                    {/* Processing indicator */}
                    {sessionActive && isProcessing && (
                      <span className="ml-2 text-xs text-white animate-pulse font-bold">
                        Scanning…
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Status Indicator Dot */}
                    <span className="relative flex h-2.5 w-2.5">
                      {inCameraId && sessionActive ? (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                        </>
                      ) : inCameraId ? (
                        <span
                          className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white/60"
                          title="Standby"
                        ></span>
                      ) : (
                        <span
                          className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-900"
                          title="Offline"
                        ></span>
                      )}
                    </span>

                    {/* Styled Select Dropdown */}
                    <select
                      value={inCameraId}
                      onChange={(e) => setInCameraId(e.target.value)}
                      disabled={sessionActive}
                      className="bg-transparent text-white font-semibold text-sm border-none focus:ring-0 cursor-pointer outline-none min-w-[150px]"
                    >
                      <option value="" className="text-gray-900 bg-white">
                        Select Camera...
                      </option>
                      {videoDevices
                        .filter((cam) => cam.deviceId !== outCameraId)
                        .map((cam) => (
                          <option
                            key={`in-${cam.deviceId}`}
                            value={cam.deviceId}
                            className="text-gray-900 bg-white"
                          >
                            {cam.label ||
                              `Camera ${cam.deviceId.substring(0, 5)}`}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {!sessionActive ? (
                  /* Offline State */
                  <div className="flex-1 bg-gray-800 relative overflow-hidden flex items-center justify-center">
                    <div className="text-center">
                      <CameraOff className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400 font-medium text-lg">
                        Session Not Started
                      </p>
                      <p className="text-gray-500 text-sm mt-2">
                        Waiting for signal...
                      </p>
                    </div>
                  </div>
                ) : !isEntranceActive ? (
                  /* Standby Overlay */
                  <div className="flex-1 bg-gray-800 relative overflow-hidden flex items-center justify-center">
                    <div className="text-center">
                      <Video className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400 font-medium text-lg mb-4">
                        Feed Paused
                      </p>
                      <button
                        onClick={() => toggleEntranceCamera(true)}
                        className="bg-green-600 cursor-pointer hover:bg-green-500 text-white font-bold py-2 px-6 rounded-full transition-colors flex items-center gap-2 mx-auto"
                      >
                        <Play className="w-4 h-4" /> Start Camera
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Live Webcam State */
                  <div className="flex-1 bg-gray-800 relative overflow-hidden min-h-[300px]">
                    {/* Backend-Streamed Annotated Frame */}
                    <img
                      src={`${API_BASE}/api/attendance/video_feed/in?session_id=${currentSessionId}&cam_id=0`}
                      className="w-full h-full object-cover rounded-b-lg block"
                      alt="Live IN Feed"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />

                    {/* Live Indicator */}
                    <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black bg-opacity-70 px-3 py-1.5 rounded-full z-20">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-white text-xs font-medium">
                        LIVE ({inCamIndex})
                      </span>
                    </div>

                    {/* Stop Camera Button Over Live Feed */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
                      <button
                        onClick={() => toggleEntranceCamera(false)}
                        className="bg-black/80 cursor-pointer hover:bg-black text-white text-sm font-bold py-2 px-6 rounded-full transition-colors border border-gray-600 flex items-center gap-2"
                      >
                        <Square className="w-4 h-4 text-red-500 fill-current" />{" "}
                        Stop Camera
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Exit Camera Feed */}
              <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 overflow-hidden flex flex-col">
                <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold">
                    <Video className="w-5 h-5" /> Exit Camera (OUT)
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Status Indicator Dot */}
                    <span className="relative flex h-2.5 w-2.5">
                      {outCameraId && sessionActive ? (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                        </>
                      ) : outCameraId ? (
                        <span
                          className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white/60"
                          title="Standby"
                        ></span>
                      ) : (
                        <span
                          className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-900"
                          title="Offline"
                        ></span>
                      )}
                    </span>

                    {/* Styled Select Dropdown */}
                    <select
                      value={outCameraId}
                      onChange={(e) => setOutCameraId(e.target.value)}
                      disabled={sessionActive}
                      className="bg-transparent text-white font-semibold text-sm border-none focus:ring-0 cursor-pointer outline-none min-w-[150px]"
                    >
                      <option value="" className="text-gray-900 bg-white">
                        Select Camera...
                      </option>
                      {videoDevices
                        .filter((cam) => cam.deviceId !== inCameraId)
                        .map((cam) => (
                          <option
                            key={`out-${cam.deviceId}`}
                            value={cam.deviceId}
                            className="text-gray-900 bg-white"
                          >
                            {cam.label ||
                              `Camera ${cam.deviceId.substring(0, 5)}`}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {!sessionActive ? (
                  /* Offline State */
                  <div className="flex-1 bg-gray-800 relative overflow-hidden flex items-center justify-center">
                    <div className="text-center">
                      <CameraOff className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400 font-medium text-lg">
                        Session Not Started
                      </p>
                      <p className="text-gray-500 text-sm mt-2">
                        Waiting for signal...
                      </p>
                    </div>
                  </div>
                ) : !isExitActive ? (
                  /* Standby Overlay */
                  <div className="flex-1 bg-gray-800 relative overflow-hidden flex items-center justify-center">
                    <div className="text-center">
                      <Video className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400 font-medium text-lg mb-4">
                        Feed Paused
                      </p>
                      <button
                        onClick={() => toggleExitCamera(true)}
                        className="bg-red-600 cursor-pointer hover:bg-red-500 text-white font-bold py-2 px-6 rounded-full transition-colors flex items-center gap-2 mx-auto"
                      >
                        <Play className="w-4 h-4" /> Start Camera
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Live Webcam State */
                  <div className="flex-1 bg-gray-800 relative overflow-hidden min-h-[300px]">
                    {/* Backend-Streamed Annotated Frame */}
                    <img
                      src={`${API_BASE}/api/attendance/video_feed/out?session_id=${currentSessionId}&cam_id=0`}
                      className="w-full h-full object-cover rounded-b-lg block"
                      alt="Live OUT Feed"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />

                    {/* Live Indicator */}
                    <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black bg-opacity-70 px-3 py-1.5 rounded-full z-20">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-white text-xs font-medium">
                        LIVE ({outCamIndex})
                      </span>
                    </div>

                    {/* Stop Camera Button Over Live Feed */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
                      <button
                        onClick={() => toggleExitCamera(false)}
                        className="bg-black/80 cursor-pointer hover:bg-black text-white text-sm font-bold py-2 px-6 rounded-full transition-colors border border-gray-600 flex items-center gap-2"
                      >
                        <Square className="w-4 h-4 text-red-500 fill-current" />{" "}
                        Stop Camera
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Real-Time Log Panel - Right Sidebar */}
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200 bg-blue-50">
              <h3 className="font-bold text-gray-900">Live Entry/Exit Log</h3>
              <p className="text-xs text-gray-600 mt-1">
                Real-time activity tracking
              </p>
            </div>

            {/* Manual Override */}
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Manual Override
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Index (e.g. CS2026)"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase font-medium"
                />
                <button className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow-sm">
                  Mark
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {!sessionActive ? (
                <div className="flex items-center justify-center h-full px-5 py-20">
                  <div className="text-center">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">
                      Waiting for live data...
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Start a session to begin tracking
                    </p>
                  </div>
                </div>
              ) : logEntries.length === 0 ? (
                <div className="flex items-center justify-center h-full px-5 py-20">
                  <div className="text-center">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">
                      Scanning for faces…
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Entries will appear here
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {logEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="px-5 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900 text-sm">
                          {entry.studentName}
                        </span>
                        <div className="flex items-center gap-2">
                          {entry.status === "entered" ? (
                            <ArrowUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <ArrowDown className="w-4 h-4 text-red-600" />
                          )}
                          <button
                            className="hover:bg-gray-200 p-1 rounded transition-colors"
                            title="Edit entry"
                            onClick={() => handleEditEntry(entry)}
                          >
                            <Pencil className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {entry.time}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            entry.status === "entered"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {entry.status === "entered" ? "Entered" : "Exited"}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Stats Bar */}
        <div className="bg-white border-t-2 border-gray-200 px-6 py-4 shadow-lg">
          <div className="grid grid-cols-3 gap-6">
            <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Currently Inside
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  {sessionActive ? liveStats.currentlyInside : 0}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="p-3 bg-green-600 rounded-lg">
                <ArrowUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Total Entered
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {sessionActive ? liveStats.totalEntered : 0}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="p-3 bg-red-600 rounded-lg">
                <UserMinus className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Left Early</p>
                <p className="text-3xl font-bold text-red-600">
                  {sessionActive ? liveStats.leftEarly : 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* End Session Confirmation Modal */}
      {showEndSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowEndSessionModal(false)}
          />
          <div className="relative bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 animate-fade-in">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                End Class Session?
              </h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700 text-base mb-5">
                Are you sure you want to end this session? Attendance for{" "}
                <span className="font-bold">
                  {liveStats.totalEntered} students
                </span>{" "}
                will be saved.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Session Summary
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm text-gray-700">Present:</span>
                    <span className="text-sm font-bold text-gray-900">
                      {liveStats.currentlyInside}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    <span className="text-sm text-gray-700">Left Early:</span>
                    <span className="text-sm font-bold text-gray-900">
                      {liveStats.leftEarly}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEndSessionModal(false)}
                className="px-6 py-2.5 border-2 cursor-pointer border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEndSession}
                className="px-6 py-2.5 cursor-pointer bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md"
              >
                Confirm &amp; Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Entry Modal */}
      {showEditModal && selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowEditModal(false)}
          />
          <div className="relative bg-white rounded-lg shadow-2xl max-w-lg w-full mx-4 animate-fade-in">
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Edit Attendance Log
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Manual correction for system entry
                  </p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="bg-blue-50 rounded-lg p-4 mb-5 border border-blue-200">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Student Information
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">
                      {selectedEntry.studentName}
                    </p>
                    <p className="text-sm text-gray-600">
                      Index: {selectedEntry.indexNumber || "CS/2021/001"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    aria-label="Select Status"
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Left Early">Left Early</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Time Entry
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    placeholder="09:05 AM"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reason for change
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="System error / Forgot ID card"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md"
              >
                Update Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session-ended success toast (existing) */}
      {showSuccessToast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 border-2 border-green-700 min-w-[400px]">
            <div className="flex-shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <p className="flex-1 font-medium">
              Session ended successfully. Attendance records saved.
            </p>
            <button
              onClick={() => setShowSuccessToast(false)}
              className="flex-shrink-0 hover:bg-green-700 rounded p-1 transition-colors"
              aria-label="Close notification"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Attendance-marked toast (new — appears below the session toast) */}
      {attendanceToast && (
        <div className="fixed top-6 right-6 z-50 animate-fade-in">
          <div className="bg-blue-700 text-white px-5 py-3.5 rounded-lg shadow-2xl flex items-center gap-3 border-2 border-blue-800 max-w-sm">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <p className="flex-1 font-medium text-sm">{attendanceToast}</p>
            <button
              onClick={() => setAttendanceToast(null)}
              className="flex-shrink-0 hover:bg-blue-800 rounded p-0.5 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
