import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Video,
  ArrowUp,
  ArrowDown,
  Clock,
  Users,
  UserMinus,
  UserPlus,
  Pencil,
  Square,
  CameraOff,
  Play,
  CheckCircle,
  X,
  User,
  ArrowLeft,
  Info,
  VideoOff,
  AlertTriangle,
  UserCheck,
  LogOut,
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
    student_name?: string;
    student_index?: string;
    time?: string;
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

// Helper to calculate MM:SS or HH:MM:SS format
const formatElapsedTime = (startMillis: number) => {
  const diff = Date.now() - startMillis;
  if (diff < 0) return "00:00:00";
  const h = Math.floor(diff / 3600000)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((diff % 3600000) / 60000)
    .toString()
    .padStart(2, "0");
  const s = Math.floor((diff % 60000) / 1000)
    .toString()
    .padStart(2, "0");

  // Hide hours if it's less than 1 hour for a cleaner look
  return h === "00" ? `${m}:${s}` : `${h}:${m}:${s}`;
};

const LiveTimer = ({
  isSessionActive,
  displayTime,
  isOvertime,
}: {
  isSessionActive: boolean;
  displayTime: string;
  isOvertime?: boolean;
}) => {
  if (!isSessionActive) return null;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-2 h-2 rounded-full animate-pulse ${isOvertime ? "bg-orange-500" : "bg-red-600"}`}
      ></span>
      <span
        className={`font-bold ${isOvertime ? "text-orange-600" : "text-red-600"}`}
      >
        Live: {displayTime} {isOvertime ? "(Over Time)" : ""}
      </span>
    </div>
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
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const sessionIdParam = searchParams.get("sessionId");
  const isAdminRoute = location.pathname.includes("/admin");
  const storageKey = isAdminRoute
    ? "admin_activeSession"
    : "lecturer_activeSession";

  // FIX: Rely strictly on the route path to determine the active role context, avoiding localStorage token confusion
  const role = isAdminRoute ? "Admin" : "Lecturer";
  // UI state
  const [activeTab, setActiveTab] = useState<"camera" | "manual">(
    isAdminRoute ? "manual" : "camera",
  );
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [sessionLocation, setSessionLocation] = useState("");
  const [sessionTime, setSessionTime] = useState("");
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
    date: "" as string | undefined,
    end_time: "" as string | undefined,
    enrolled_count: undefined as number | undefined,
  });
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);

  // Face box state – now driven by live annotated frames
  const [annotatedFrame, setAnnotatedFrame] = useState<string | null>(null);

  // Attendance log state
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);

  // Attendance notification toast
  const [attendanceToast, setAttendanceToast] = useState<string | null>(null);

  // Live Elapsed Timer state
  const [elapsedTime, setElapsedTime] = useState("00:00:00");

  // Camera / recognition refs & state
  const entranceVideoRef = useRef<HTMLVideoElement>(null);
  const exitVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [inCameraId, setInCameraId] = useState("");
  const [outCameraId, setOutCameraId] = useState("");
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [manualIndex, setManualIndex] = useState("");
  const [manualAction, setManualAction] = useState("IN");

  const inCamIndex = videoDevices.findIndex(
    (cam) => cam.deviceId === inCameraId,
  );
  const outCamIndex = videoDevices.findIndex(
    (cam) => cam.deviceId === outCameraId,
  );

  // Dynamic status logic
  const selectedSessionDetails = (todaySessions || []).find(
    (s) => String(s.id) === String(selectedSession),
  );
  // Determine if current user is the host
  // Check if current user is the owner. Fallback to currentSessionId if selectedSession is pending.
  const isOwner =
    localStorage.getItem(storageKey) ===
    String(selectedSession || currentSessionId);

  // Track which session this admin is actively hosting to prevent View-Only flashes during teardown
  const hostedSessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (isOwner) hostedSessionIdRef.current = String(selectedSession);
  }, [isOwner, selectedSession]);

  // Robust View-Only state
  const [isViewOnly, setIsViewOnly] = useState(false);

  useEffect(() => {
    // 1. STRONGEST OVERRIDE: If the dashboard explicitly says this is NOT view-only (Resume Session clicked)
    if (location.state?.viewOnly === false) {
      setIsViewOnly(false);
      return;
    }

    // 2. Check memory ownership
    const isTearingDownOwnSession =
      hostedSessionIdRef.current === String(selectedSession) && !isOwner;
    if (!isAdminRoute || isOwner || isTearingDownOwnSession) {
      setIsViewOnly(false);
      return;
    }

    // 3. Fallback for actual viewers
    const isLiveSession =
      location.state?.viewOnly === true ||
      location.state?.isLive === true ||
      selectedSessionDetails?.is_live === true;

    setIsViewOnly(!!isLiveSession);
  }, [
    isAdminRoute,
    isOwner,
    selectedSession,
    selectedSessionDetails?.is_live,
    location.state,
  ]);

  // Bulletproof lock to prevent multiple toasts natively
  const toastShownRef = useRef(false);

  // Trigger notification when arriving from Dashboard securely
  useEffect(() => {
    if (location.state?.sessionStarted && !toastShownRef.current) {
      toastShownRef.current = true; // Lock it immediately so it never fires twice

      const moduleName = location.state?.moduleName || "Class";

      toast.success(`${moduleName} session started successfully!`, {
        duration: 6000,
        position: "top-right",
        style: {
          background: "#1e3b8adc", // Dark blue
          color: "#fff",
          fontWeight: "bold",
        },
      });

      // Safely strip 'sessionStarted' from the React Router state
      const currentState = { ...location.state };
      delete currentState.sessionStarted;

      navigate(location.pathname + location.search, {
        replace: true,
        state: currentState,
      });
    }
  }, [location.state, navigate, location.pathname, location.search]);

  // --- CRITICAL FIX: Smart Memory Management on Exit ---
  const isHostingRef = useRef(false);

  useEffect(() => {
    // Keep track of whether we are the active host
    isHostingRef.current =
      sessionActive &&
      localStorage.getItem(storageKey) === String(selectedSession);
  }, [sessionActive, selectedSession, storageKey]);

  useEffect(() => {
    return () => {
      // This runs whenever the component is unmounted (leaving the page)
      // ONLY clear memory if the Admin is just VIEWING. If they are HOSTING, keep memory to resume later!
      if (isAdminRoute && !isHostingRef.current) {
        // SAFE: Only remove the Admin's own session marker.
        // DO NOT remove 'activeAttendanceSession' or 'sessionStartTime' — these belong
        // to the Lecturer's live session and clearing them would break their active monitoring!
        localStorage.removeItem("admin_activeSession");
      }
    };
  }, [isAdminRoute]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const localStartTime = localStorage.getItem("sessionStartTime");
    const dbTimeStr =
      selectedSessionDetails?.created_at ||
      selectedSessionDetails?.started_at ||
      selectedSessionDetails?.start_time;

    let startTimeMs = 0;

    if (localStartTime && !isViewOnly) {
      startTimeMs = parseInt(localStartTime, 10);
    } else if (dbTimeStr) {
      const tStr = String(dbTimeStr);
      if (tStr.includes("-")) {
        const cleanStr = tStr.split(".")[0].replace(" ", "T");
        const finalStr = cleanStr.endsWith("Z") ? cleanStr : `${cleanStr}Z`;
        startTimeMs = new Date(finalStr).getTime();
      } else if (tStr.includes(":")) {
        const d = new Date();
        const [h, m, s] = tStr.split(":");
        d.setHours(parseInt(h), parseInt(m), parseInt(s || "0"));
        startTimeMs = d.getTime();
      }
    }

    // 1. Calculate Scheduled Duration in MS
    const parseTimeToMs = (timeStr: string) => {
      const match = timeStr.match(/(\d+):(\d+)\s*([AP]M)/i);
      if (!match) return 0;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const isPM = match[3].toUpperCase() === "PM";
      if (isPM && h !== 12) h += 12;
      if (!isPM && h === 12) h = 0;
      return (h * 60 + m) * 60 * 1000;
    };

    let scheduledDurationMs = 0;
    if (
      selectedSessionDetails?.start_time &&
      selectedSessionDetails?.end_time
    ) {
      const startMs = parseTimeToMs(selectedSessionDetails.start_time);
      const endMs = parseTimeToMs(selectedSessionDetails.end_time);
      scheduledDurationMs = endMs - startMs;
      if (scheduledDurationMs < 0) scheduledDurationMs += 24 * 60 * 60 * 1000; // Handle overnight sessions
    }

    // 2. Set Interval
    if ((sessionActive || isViewOnly) && startTimeMs && !isNaN(startTimeMs)) {
      setElapsedTime(formatElapsedTime(startTimeMs)); // Immediate tick
      interval = setInterval(() => {
        const now = new Date().getTime();
        const diff = Math.max(0, now - startTimeMs); // Elapsed time in MS

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setElapsedTime(
          `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
        );
      }, 1000);
    } else {
      setElapsedTime("00:00:00");
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionActive, isViewOnly, selectedSessionDetails]);

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

  // Proactive Camera Check on Component Mount
  useEffect(() => {
    const checkCameraPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        // Permission granted, stop the stream immediately (we just wanted to check)
        stream.getTracks().forEach((track) => track.stop());
      } catch (error) {
        toast.error(
          "Camera access is required! Please allow camera permissions in your browser to use the camera",
          {
            duration: 6000,
            style: {
              background: "#fee2e2",
              color: "#991b1b",
              fontWeight: "bold",
            },
          },
        );
      }
    };

    checkCameraPermissions();
  }, []);

  // Absolute cleanup to prevent memory/hardware leaks when navigating away
  useEffect(() => {
    return () => {
      // 1. Stop frontend capture polling
      if (captureTimerRef.current) {
        clearInterval(captureTimerRef.current);
      }

      // 2. Stop frontend webcam tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        window.dispatchEvent(
          new CustomEvent("camera-status", { detail: "Offline" }),
        );
      }

      // 3. SMART BACKEND CLEANUP:
      // ONLY stop the backend OpenCV stream if this user is the HOST.
      // If an Admin (Viewer) navigates away, they exit silently without freezing the Lecturer's feed.
      if (isHostingRef.current) {
        fetch(`${API_BASE}/api/attendance/stop_cameras`, {
          method: "POST",
          keepalive: true,
        }).catch(() => console.error("Failed to stop backend cameras"));
      }
    };
  }, []);

  // Comprehensive Initialization: Restore active session OR load targeted session
  useEffect(() => {
    const navSessionData = location.state?.sessionData;
    const navSessionId = navSessionData
      ? String(navSessionData.batch_id || navSessionData.id)
      : null;

    const saved = localStorage.getItem("activeAttendanceSession");
    let restoredFromMemory = false;

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const savedSessionId = String(parsed.selectedSession);

        // RESTORE CONDITION: If there's no specific navigation target, OR the target matches the saved session
        if (
          parsed.sessionId &&
          (!navSessionId || navSessionId === savedSessionId)
        ) {
          setCurrentSessionId(parsed.sessionId);
          setSessionActive(true);

          // Explicitly disable camera states on return to prevent frozen streams
          setIsEntranceActive(false);
          setIsExitActive(false);

          if (parsed.selectedSession)
            setSelectedSession(parsed.selectedSession);
          if (parsed.selectedSubject)
            setSelectedSubject(parsed.selectedSubject);
          if (parsed.sessionDetails) setSessionDetails(parsed.sessionDetails);

          console.log(`[SESSION RESTORED] ID: ${parsed.sessionId}.`);
          restoredFromMemory = true;
        }
      } catch (e) {
        console.error("[SESSION RESTORE] Failed to parse:", e);
      }
    }

    // LOAD NEW TARGET: If we didn't restore (e.g., viewing a different session), load from navigation state safely
    if (!restoredFromMemory && navSessionData) {
      setSelectedSession(navSessionId || "");
      setSelectedSubject(
        navSessionData.subject_id || navSessionData.moduleCode || "",
      );
      setSessionDetails(navSessionData);
      // Note: sessionActive is NOT set to true here. isViewOnly handles live states for viewers.
    }
  }, [location.state]);

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

  // Fetch Today's Sessions (Admin or Lecturer)
  useEffect(() => {
    const fetchSessions = async () => {
      setIsLoadingSessions(true);
      try {
        const token =
          role === "Admin"
            ? localStorage.getItem("adminToken")
            : localStorage.getItem("lecturerToken");
        const endpoint =
          role === "Admin"
            ? `${API_BASE}/api/admin/timetable/today`
            : `${API_BASE}/api/lecturer/timetable`; // Existing lecturer timetable

        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          // For lecturer, filter for today only if not already done by backend
          if (role === "Lecturer") {
            const getLocalDateString = () => {
              const d = new Date();
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, "0");
              const day = String(d.getDate()).padStart(2, "0");
              return `${year}-${month}-${day}`;
            };
            const today = getLocalDateString();
            const sessionsArray = Array.isArray(data)
              ? data
              : data?.sessions || [];
            setTodaySessions(
              sessionsArray.filter((s: any) => s.date === today),
            );
          } else {
            // Admin endpoint returns { stats, sessions }
            const sessionsArray =
              data?.sessions || (Array.isArray(data) ? data : []);
            setTodaySessions(sessionsArray);
          }
        }
      } catch (err) {
        console.error("Failed to fetch sessions", err);
      } finally {
        setIsLoadingSessions(false);
      }
    };
    fetchSessions();
  }, [role]);

  // Auto-select session from URL param
  useEffect(() => {
    if (
      Array.isArray(todaySessions) &&
      todaySessions.length > 0 &&
      sessionIdParam
    ) {
      const sess = todaySessions.find(
        (s) => s.id.toString() === sessionIdParam,
      );
      if (sess) {
        setSelectedSession(sessionIdParam);
        setSelectedSubject(sess.module_name || sess.module_code);
        setSessionDetails((prev) => ({
          ...prev,
          location: sess.location || prev.location,
        }));
        setSessionLocation(sess.location || "");
        setSessionTime(`${sess.start_time || ""} - ${sess.end_time || ""}`);

        // Optional: Auto-start if it's Live?
        // For now just pre-selecting is safer.
      }
    }
  }, [todaySessions, sessionIdParam]);

  // Restore session active state if we are the owner
  useEffect(() => {
    const savedActiveId = localStorage.getItem(storageKey);
    if (savedActiveId && String(savedActiveId) === String(selectedSession)) {
      setSessionActive(true);
    }
  }, [selectedSession, storageKey]);

  const handleManualMark = async () => {
    if (!manualIndex.trim()) {
      toast.error("Please enter a student index.");
      return;
    }

    // Safely extract the ID regardless of whether the backend sends it as 'id' or 'timetable_id'
    // Fallback to the selectedSession string if the object lookup fails
    const sessIdToUse =
      selectedSessionDetails?.id ||
      selectedSessionDetails?.timetable_id ||
      selectedSession;

    if (!sessIdToUse) {
      toast.error(
        "Error: Could not identify the current session ID. Please re-select the session.",
      );
      return;
    }

    // 1. Camera Dependency Check
    if (manualAction === "IN" && !isEntranceActive) {
      toast.error("Entrance Camera must be ON to mark an IN attendance.");
      return;
    }
    if (manualAction === "OUT" && !isExitActive) {
      toast.error("Exit Camera must be ON to mark an OUT attendance.");
      return;
    }

    try {
      // Use the generic token or fallback to role-specific ones
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("adminToken") ||
        localStorage.getItem("lecturerToken");

      const res = await fetch(`${API_BASE}/api/attendance/manual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: parseInt(String(sessIdToUse)),
          student_index: manualIndex.trim().toUpperCase(),
          action_type: manualAction,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || `Attendance marked for ${manualIndex}`);
        setManualIndex("");
        // The polling useEffect will pick up the new log entry automatically
      } else {
        toast.error(data.detail || "Marking failed.");
      }
    } catch (error) {
      toast.error("Network error occurred.");
    }
  };

  // Live Data Polling for Logs and Stats
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const targetId =
      currentSessionId ||
      (isViewOnly && selectedSession ? selectedSession : null);

    const fetchLiveData = async () => {
      if (!targetId) return;

      let fetchedLogsData = null;

      try {
        // 1. SMART FETCH: Try multiple common endpoint patterns to guarantee we hit the right logs API
        const logEndpoints = [
          `${API_BASE}/api/attendance/session_logs/${targetId}`,
          `${API_BASE}/api/attendance/live_logs/${targetId}`,
          `${API_BASE}/api/attendance/logs/${targetId}`,
        ];

        for (const endpoint of logEndpoints) {
          try {
            const res = await fetch(endpoint);
            if (res.ok) {
              fetchedLogsData = await res.json();
              break; // Found the correct endpoint, exit the loop!
            }
          } catch (e) {
            // Ignore network errors for incorrect endpoints and try the next one
          }
        }

        // 2. Fetch Stats
        const statsRes = await fetch(
          `${API_BASE}/api/attendance/session_stats/${targetId}`,
        );

        if (statsRes.ok) {
          const statsData = await statsRes.json();

          // Fallback: If the backend bundles logs directly inside the stats response, use them!
          if (!fetchedLogsData && statsData.logs) {
            fetchedLogsData = statsData.logs;
          }
        } else if (statsRes.status === 404 || statsRes.status === 400) {
          // Session was ended remotely by the host
          if (isViewOnly) {
            toast.error("The Host has ended this live session.", {
              duration: 5000,
            });
            navigate("/admin/live-sessions");
          }
        }

        // 3. Safely map and set the log entries if we successfully retrieved them
        if (fetchedLogsData) {
          const logsArray = Array.isArray(fetchedLogsData)
            ? fetchedLogsData
            : fetchedLogsData.logs || [];

          setLogEntries(
            logsArray.map((d: any, idx: number) => ({
              id: d.id || `${idx}-${d.timestamp || d.time || Date.now()}`,
              studentName:
                d.name || d.student_name || d.student?.name || "Unknown",
              indexNumber:
                d.index_number ||
                d.student_index ||
                d.student?.index_number ||
                d.student_id ||
                "N/A",
              time: d.timestamp || d.time || new Date().toISOString(),
              status: d.status || "entered",
            })),
          );
        }
      } catch (error) {
        console.error("Live polling error:", error);
      }
    };

    const pollData = () => {
      fetchLiveData();
      interval = setInterval(fetchLiveData, 5000); // Poll every 5 seconds for stability
    };

    if (sessionActive || isViewOnly) {
      pollData();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionActive, currentSessionId, isViewOnly, selectedSession]);

  // Step 1: Calculate precise stats from the latest logEntries

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

  // Strictly calculate derived stats to count UNIQUE students
  const derivedStats = useMemo(() => {
    let currentlyInside = 0;
    let currentlyExited = 0;

    if (!logEntries || !Array.isArray(logEntries) || logEntries.length === 0) {
      return { currentlyInside: 0, totalEntered: 0, currentlyExited: 0 };
    }

    const latestStatusMap = new Map();
    const uniqueEnteredStudents = new Set();

    logEntries.forEach((log) => {
      // Use indexNumber as the unique key
      const uniqueKey = log.indexNumber || log.studentName || log.id;
      if (!uniqueKey) return;

      const cleanId = String(uniqueKey).trim().toLowerCase();
      const status = String(log.status).toLowerCase();

      if (status === "entered" || status === "in") {
        uniqueEnteredStudents.add(cleanId);
      }

      // CRITICAL FIX: Since logEntries is newest-first, we only set the status
      // if it hasn't been added to the map yet. This ensures we keep the LATEST state.
      if (!latestStatusMap.has(cleanId)) {
        latestStatusMap.set(cleanId, status);
      }
    });

    latestStatusMap.forEach((status) => {
      if (status === "entered" || status === "in") currentlyInside++;
      if (status === "exited" || status === "out") currentlyExited++;
    });

    return {
      currentlyInside,
      totalEntered: uniqueEnteredStudents.size,
      currentlyExited,
    };
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
        const newEntries: LogEntry[] = data.logs.map((log: any) => ({
          id: _logIdCounter++,
          studentName:
            log.student?.name ||
            log.student_name ||
            `Student #${log.student_id}`,
          indexNumber:
            log.student?.index_number || log.student_index || log.student_id,
          time: log.timestamp || log.time || nowTimeString(),
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
    if (!selectedSubject) {
      setCameraError("Please select a Course Subject to begin tracking.");
      return;
    }
    if (!sessionLocation.trim()) {
      toast.error("Please enter a valid location for this session.");
      return;
    }

    // NEW: Camera Pre-check Logic
    try {
      // Request camera access to verify it's connected and permitted
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      // Stop the stream immediately, we just wanted to check permissions/hardware
      stream.getTracks().forEach((track) => track.stop());

      toast.success("Camera connected! Starting session...");

      // 1. Thoroughly extract the true Lecturer ID from possible data structures
      const extractedLecturerId =
        selectedSessionDetails?.lecturer_id ||
        selectedSessionDetails?.lecturerId ||
        selectedSessionDetails?.lecturer?.id ||
        (sessionDetails as any)?.lecturer_id ||
        (sessionDetails as any)?.lecturerId ||
        lecturerId;

      if (!extractedLecturerId) {
        console.error(
          "[START SESSION] Missing Lecturer ID in session details:",
          selectedSessionDetails,
        );
        toast.error(
          "Cannot start session: Lecturer ID is missing from the timetable data.",
          { duration: 5000 },
        );
        return; // Halt the function to prevent 500 Backend Error
      }

      // 2. Strictly format payload for FastAPI Pydantic validation
      const payload = {
        lecturer_id: Number(extractedLecturerId),
        subject_id: String(
          selectedSubject || selectedSessionDetails?.subject_id || "UNKNOWN",
        ),
        batch_id: String(
          selectedSession || selectedSessionDetails?.batch_id || "UNKNOWN",
        ),
        session_type: String(
          sessionDetails?.type ||
            selectedSessionDetails?.session_type ||
            "Lecture",
        ),
        location: String(
          sessionLocation ||
            sessionDetails?.location ||
            selectedSessionDetails?.location ||
            "Hall A",
        ),
      };

      console.log(
        "[START SESSION] Sending strictly validated payload:",
        payload,
      );

      // 3. Initialize session in backend
      const res = await fetch(`${API_BASE}/api/attendance/start_session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to start backend session");
      const data = await res.json();
      setCurrentSessionId(data.id);

      // Mark Admin as Host on Start
      localStorage.setItem("admin_hosted_session", String(selectedSession));

      // Persist session to localStorage for navigation resilience
      localStorage.setItem(storageKey, String(selectedSession));
      localStorage.setItem(
        "activeAttendanceSession",
        JSON.stringify({
          sessionId: data.id,
          selectedSession,
          selectedSubject,
          sessionDetails: { ...sessionDetails, location: sessionLocation },
        }),
      );
      // Save absolute start time so the timer survives navigation
      localStorage.setItem("sessionStartTime", Date.now().toString());

      // 2. Start frontend camera hardware
      await startCamera();

      // SYNC: Mark timetable session as live for real-time dashboard updates
      try {
        await fetch(`${API_BASE}/api/timetable/${selectedSession}/start`, {
          method: "POST",
        });
      } catch (err) {
        console.error("Failed to sync session start:", err);
      }

      setSessionActive(true);
      setAttendanceToast(null);

      // Dispatch explicitly for global Layout
      window.dispatchEvent(
        new CustomEvent("camera-status", { detail: "Online" }),
      );

      // Optionally start neither, but let's start entrance by default if specified
      if (inCameraId) setIsEntranceActive(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      const isPermError =
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError";
      toast.error(
        isPermError
          ? "Camera permission denied! Please allow camera access in your browser."
          : `Session Error: ${err.message}`,
        {
          duration: 6000,
          style: {
            background: "#fee2e2",
            color: "#991b1b",
            fontWeight: "bold",
          },
        },
      );
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
    if (isViewOnly) return;

    setIsEndingSession(true);
    const loadingToast = toast.loading(
      "Calculating final attendance and processing logs...",
    );

    try {
      // 1. Mark session as inactive in local state
      stopCamera();
      setSessionActive(false);
      setIsEntranceActive(false);
      setIsExitActive(false);
      setMediaStream(null);
      setAnnotatedFrame(null);

      // 2. Clear persisted session
      localStorage.removeItem(storageKey);
      localStorage.removeItem("activeAttendanceSession");
      localStorage.removeItem("sessionStartTime");
      localStorage.removeItem("admin_hosted_session");

      // 3. Close session in backend & Trigger Calculation
      if (currentSessionId) {
        const res = await fetch(
          `${API_BASE}/api/attendance/end_session/${currentSessionId}`,
          {
            method: "POST",
          },
        );
        if (!res.ok) throw new Error("Failed to end session");
      }

      // 4. Release hardware
      await fetch(`${API_BASE}/api/attendance/stop_cameras`, {
        method: "POST",
      });

      // 5. Sync timetable status
      if (selectedSession) {
        await fetch(`${API_BASE}/api/timetable/${selectedSession}/stop`, {
          method: "POST",
        });
      }

      // Artificial delay for UX
      await new Promise((resolve) => setTimeout(resolve, 3500));

      toast.success("Attendance processed successfully!", { id: loadingToast });
      setShowEndSessionModal(false);

      // 6. Navigate to review
      const targetSessionId = currentSessionId || selectedSession;
      if (targetSessionId) {
        localStorage.setItem("pendingReviewSessionId", String(targetSessionId));
      }

      // Delay navigation slightly so they see the success state
      setTimeout(() => {
        navigate(
          isAdminRoute
            ? `/admin/live-monitoring/review/${targetSessionId}`
            : "/lecturer/session-review",
          {
            state: { sessionId: targetSessionId },
          },
        );
      }, 1000);
    } catch (err) {
      console.error("End session error:", err);
      toast.error("An error occurred while ending the session.", {
        id: loadingToast,
      });
    } finally {
      setIsEndingSession(false);
    }
  }, [
    stopCamera,
    currentSessionId,
    selectedSession,
    isAdminRoute,
    storageKey,
    isViewOnly,
  ]);

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

  // Bulletproof synchronous Overtime calculation based on the stable elapsedTime string
  const isOvertime = useMemo(() => {
    if (
      !selectedSessionDetails?.start_time ||
      !selectedSessionDetails?.end_time ||
      !elapsedTime ||
      elapsedTime === "00:00:00"
    ) {
      return false;
    }

    const parseToMins = (timeStr: string) => {
      const match = timeStr.match(/(\d+):(\d+)\s*([AP]M)/i);
      if (!match) return 0;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const isPM = match[3].toUpperCase() === "PM";
      if (isPM && h !== 12) h += 12;
      if (!isPM && h === 12) h = 0;
      return h * 60 + m;
    };

    const startMins = parseToMins(selectedSessionDetails.start_time);
    const endMins = parseToMins(selectedSessionDetails.end_time);
    let durationMins = endMins - startMins;
    if (durationMins <= 0) durationMins += 24 * 60; // Handle overnight

    const [eh, em, es] = elapsedTime.split(":").map(Number);
    const elapsedSecs = eh * 3600 + em * 60 + (es || 0);
    const durationSecs = durationMins * 60;

    return elapsedSecs > durationSecs;
  }, [elapsedTime, selectedSessionDetails]);

  // RENDER
  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {/* Admin Back Button */}
      {isAdminRoute && (
        <div className="bg-white border-b border-gray-100 px-4 py-2">
          <button
            onClick={() => navigate("/admin/live-sessions")}
            className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-blue-600 font-bold cursor-pointer rounded-lg transition-all group text-md"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Sessions Dashboard
          </button>
        </div>
      )}

      {/* Lecturer Back Button */}
      {!isAdminRoute && (
        <div className="bg-white border-b border-gray-100 px-4 py-2">
          <button
            onClick={() => navigate("/lecturer/mark-attendances")}
            className="flex items-center gap-2 px-2 mt-2 text-gray-800 hover:text-blue-600 font-bold cursor-pointer rounded-lg transition-all group text-sm"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Sessions Dashboard
          </button>
        </div>
      )}

      {/* View-Only Mode Banner for Admin */}
      {isViewOnly && (
        <div className="mx-4 mt-2 bg-blue-50 border-2 border-blue-200 border-dashed rounded-xl p-3 flex items-start gap-3 shadow-sm">
          <div className="bg-blue-100 p-2 rounded-lg shrink-0 mt-1">
            <Info className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <h4 className="text-blue-800 font-bold text-md">View-Only Mode</h4>
            <p className="text-blue-600 text-sm mt-0.5 leading-relaxed font-medium">
              This session is currently being managed by the Lecturer. You are
              viewing the live attendance stream but cannot modify or end the
              session.
            </p>
          </div>
        </div>
      )}
      {/* Hidden canvas used for frame capture — never rendered visibly */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-4">
            {/* Subject Selector */}
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-700 mb-1.5 tracking-wide">
                Subject / Module
              </label>
              <input
                type="text"
                value={selectedSubject}
                readOnly
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-500 font-semibold text-sm bg-gray-50 focus:outline-none cursor-not-allowed transition-all"
                placeholder="Module Name will appear here"
              />
            </div>

            {/* Session Selector */}
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-700 mb-1.5 tracking-wide">
                Session
              </label>
              <select
                aria-label="Select Course Session"
                value={selectedSession}
                onChange={(e) => {
                  const sessId = e.target.value;
                  setSelectedSession(sessId);
                  const sess = todaySessions.find(
                    (s) => s.id.toString() === sessId,
                  );
                  if (sess) {
                    setSelectedSubject(sess.module_name || sess.module_code);
                    setSessionDetails((prev) => ({
                      ...prev,
                      location: sess.location || prev.location,
                    }));
                    setSessionLocation(sess.location || "");
                    setSessionTime(
                      `${sess.start_time || ""} - ${sess.end_time || ""}`,
                    );
                  }
                }}
                disabled={sessionActive || isLoadingSessions || isViewOnly}
                className={`w-full cursor-pointer px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-semibold text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500  transition-all disabled:opacity-75 ${
                  isViewOnly ? "opacity-70 cursor-not-allowed bg-gray-50" : ""
                }`}
              >
                <option value="">
                  {isLoadingSessions
                    ? "Loading sessions..."
                    : "Select Session/Batch..."}
                </option>
                {Array.isArray(todaySessions) &&
                  todaySessions.map((sess) => (
                    <option key={sess.id} value={sess.id}>
                      {sess.batch} -{" "}
                      {role === "Admin" ? sess.module_name : sess.module_code}
                      {role === "Admin" ? ` (${sess.lecturer_name})` : ""}
                    </option>
                  ))}
              </select>
            </div>

            {/* Session Type */}
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-700 mb-1.5 tracking-wide">
                Session Type
              </label>
              <select
                value={sessionDetails.type}
                onChange={(e) =>
                  setSessionDetails({ ...sessionDetails, type: e.target.value })
                }
                disabled={sessionActive}
                className="w-full cursor-pointer px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-semibold text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-75"
              >
                <option value="Lecture">Lecture</option>
                <option value="Practical/Lab">Practical/Lab</option>
                <option value="Tutorial">Tutorial</option>
                <option value="Examination">Examination</option>
              </select>
            </div>

            {/* Location */}
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-700 mb-1.5 tracking-wide">
                Location
              </label>
              <input
                type="text"
                value={sessionLocation}
                onChange={(e) => setSessionLocation(e.target.value)}
                disabled={sessionActive}
                placeholder="e.g. Hall A"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-semibold text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-75"
              />
            </div>

            {/* Read-only Time Field */}
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-700 mb-1.5 tracking-wide">
                Time
              </label>
              <input
                type="text"
                value={sessionTime}
                readOnly
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-500 font-semibold text-sm bg-gray-50 focus:outline-none cursor-not-allowed transition-all"
                placeholder="Start - End Time"
              />
            </div>

            {/* Session Controls */}
            <div className="flex items-end pl-2">
              <div className="flex items-center gap-3 mt-6">
                {/* START: Only show if NOT view-only and NOT active */}
                {!isViewOnly && !sessionActive && (
                  <button
                    onClick={handleStartSession}
                    className="px-5 py-2.5 bg-green-600 hover:bg-green-700 shadow-md cursor-pointer text-white rounded-lg font-bold text-sm transition flex items-center gap-2 whitespace-nowrap"
                  >
                    <Play className="w-4 h-4 fill-white" /> Start Live Session
                  </button>
                )}

                {/* STOP: Only show if NOT view-only AND active */}
                {!isViewOnly && sessionActive && (
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end justify-center min-h-[40px]">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full animate-pulse ${isOvertime ? "bg-orange-500" : "bg-red-600"}`}
                        ></span>
                        <span
                          className={`font-bold text-md ${isOvertime ? "text-orange-600" : "text-red-600"}`}
                        >
                          Live: {elapsedTime}
                        </span>
                      </div>

                      {isOvertime && (
                        <span className="text-sm font-bold text-white bg-orange-500 uppercase tracking-wider px-2 py-0.5 rounded-xl shadow-sm mt-0.5">
                          OVER TIME
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setShowEndSessionModal(true)}
                      className="px-6 py-2.5 cursor-pointer bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition shadow-md"
                    >
                      End Session
                    </button>
                  </div>
                )}

                {/* VIEW-ONLY Badge: For admins joining an existing session */}
                {isViewOnly && (
                  <div className="flex items-center gap-3 mt-2">
                    <div className="bg-blue-50 text-blue-600 border border-blue-200 px-5 py-2 rounded-lg font-bold flex items-center gap-3 shadow-sm cursor-default">
                      <span className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></span>
                      Viewing Live Stream
                    </div>

                    {/* NEW: Admin Live Timer */}
                    <div className="bg-red-50 text-gray-800 border-2 border-red-200 px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm">
                      <Clock className="w-4 h-4 text-red-500 animate-pulse" />
                      <span className="text-red-700 mr-1">Live:</span>{" "}
                      {elapsedTime}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Camera permission error banner */}
          {cameraError && (
            <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
              <CameraOff className="w-4 h-4 flex-shrink-0" />
              <span>{cameraError}</span>
              <button
                onClick={() => setCameraError(null)}
                className="ml-auto hover:text-red-900 cursor-pointer"
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
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col">
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
                      disabled={sessionActive || isViewOnly}
                      className={`bg-transparent text-white font-semibold text-sm border-none focus:ring-0 cursor-pointer outline-none min-w-[150px] ${
                        isViewOnly ? "opacity-50 cursor-not-allowed" : ""
                      }`}
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

                {!(sessionActive || isViewOnly) ? (
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
                ) : !isEntranceActive && !isViewOnly ? (
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
                  <div className="flex-1 bg-gray-900 relative overflow-hidden min-h-[300px] flex items-center justify-center">
                    {isViewOnly ? (
                      /* ADMIN VIEW-ONLY PLACEHOLDER (No Video) */
                      <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center text-center p-6 rounded-lg z-10 m-2">
                        <div className="relative flex h-16 w-16 mb-4 mt-8">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-16 w-16 bg-blue-500 items-center justify-center">
                            <VideoOff className="w-8 h-8 text-white" />
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                          Host Camera is Active
                        </h3>
                        <p className="text-gray-400 max-w-sm mb-8 font-medium text-sm">
                          Live video feed is disabled for monitoring. Real-time
                          attendance logs are updating on the right panel.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Backend-Streamed Annotated Frame (Lecturer Only) */}
                        <img
                          src={`${API_BASE}/api/attendance/video_feed/in?session_id=${currentSessionId || selectedSession}&cam_id=0`}
                          className="w-full h-full object-cover rounded-b-lg block relative z-10"
                          alt="Live IN Feed"
                          onError={(e) =>
                            (e.currentTarget.style.display = "none")
                          }
                        />

                        {/* Live Indicator */}
                        <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black bg-opacity-70 px-3 py-1.5 rounded-full z-20">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-white text-xs font-medium">
                            LIVE ({inCamIndex})
                          </span>
                        </div>
                      </>
                    )}

                    {/* Stop Camera Button Over Live Feed (Hidden for View-Only) */}
                    {!isViewOnly && (
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
                        <button
                          onClick={() => toggleEntranceCamera(false)}
                          className="bg-black/80 cursor-pointer hover:bg-black text-white text-sm font-bold py-2 px-6 rounded-full transition-colors border border-gray-600 flex items-center gap-2"
                        >
                          <Square className="w-4 h-4 text-red-500 fill-current" />{" "}
                          Stop Camera
                        </button>
                      </div>
                    )}
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
                      disabled={sessionActive || isViewOnly}
                      className={`bg-transparent text-white font-semibold text-sm border-none focus:ring-0 cursor-pointer outline-none min-w-[150px] ${
                        isViewOnly ? "opacity-50 cursor-not-allowed" : ""
                      }`}
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

                {!(sessionActive || isViewOnly) ? (
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
                ) : !isExitActive && !isViewOnly ? (
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
                  <div className="flex-1 bg-gray-900 relative overflow-hidden min-h-[300px] flex items-center justify-center">
                    {isViewOnly ? (
                      /* ADMIN VIEW-ONLY PLACEHOLDER (No Video) */
                      <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center text-center p-6 rounded-lg z-10 m-2">
                        <div className="relative flex h-16 w-16 mb-4 mt-8">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-16 w-16 bg-red-500 items-center justify-center">
                            <VideoOff className="w-8 h-8 text-white" />
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                          Host Camera is Active
                        </h3>
                        <p className="text-gray-400 max-w-sm mb-8 font-medium text-sm">
                          Live video feed is disabled for monitoring. Real-time
                          attendance logs are updating on the right panel.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Backend-Streamed Annotated Frame (Lecturer Only) */}
                        <img
                          src={`${API_BASE}/api/attendance/video_feed/out?session_id=${currentSessionId || selectedSession}&cam_id=0`}
                          className="w-full h-full object-cover rounded-b-lg block relative z-10"
                          alt="Live OUT Feed"
                          onError={(e) =>
                            (e.currentTarget.style.display = "none")
                          }
                        />

                        {/* Live Indicator */}
                        <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black bg-opacity-70 px-3 py-1.5 rounded-full z-20">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-white text-xs font-medium">
                            LIVE ({outCamIndex})
                          </span>
                        </div>
                      </>
                    )}

                    {/* Stop Camera Button Over Live Feed (Hidden for View-Only) */}
                    {!isViewOnly && (
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
                        <button
                          onClick={() => toggleExitCamera(false)}
                          className="bg-black/80 cursor-pointer hover:bg-black text-white text-sm font-bold py-2 px-6 rounded-full transition-colors border border-gray-600 flex items-center gap-2"
                        >
                          <Square className="w-4 h-4 text-red-500 fill-current" />{" "}
                          Stop Camera
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Real-Time Log Panel - Right Sidebar */}
          <div className="w-80 bg-white border border-gray-1200 flex flex-col">
            <div className="px-5 py-4  border-gray-300 bg-gray-200">
              <h3 className="font-bold text-gray-900">Live Entry/Exit Log</h3>
              <p className="text-xs text-gray-600 mt-1">
                Real-time activity tracking
              </p>
            </div>

            {/* Manual Override (Hidden for View-Only) */}
            {!isViewOnly && (
              <div className="px-5 py-4 border-b border-gray-300 bg-gray-50">
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Manual Override
                </label>
                <div className="flex gap-2">
                  <select
                    value={manualAction}
                    onChange={(e) => setManualAction(e.target.value)}
                    className="px-2 py-1.5 text-sm cursor-pointer border border-gray-300 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="IN">IN</option>
                    <option value="OUT">OUT</option>
                  </select>
                  <input
                    type="text"
                    placeholder="e.g. CS202601"
                    value={manualIndex}
                    onChange={(e) =>
                      setManualIndex(e.target.value.toUpperCase())
                    }
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase font-semibold transition-all"
                  />
                  <button
                    onClick={handleManualMark}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer rounded-xl text-sm font-bold transition shadow-sm"
                  >
                    Mark
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {!(sessionActive || isViewOnly) ? (
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
                        <div className="flex items-center gap-2">
                          <span
                            className="font-bold text-gray-800 text-sm truncate max-w-[140px]"
                            title={entry.studentName}
                          >
                            {entry.studentName}
                          </span>
                          <span className="text-gray-800 font-bold text-xs bg-gray-100 px-2 py-0.5 rounded-full border-2 border-gray-200">
                            {entry.indexNumber || "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {entry.status === "entered" ? (
                            <ArrowUp className="w-5 h-5 text-green-600" />
                          ) : (
                            <ArrowDown className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-800">
                          {entry.time
                            ? (() => {
                                const t = String(entry.time);

                                // Scenario A: Backend sent formatted UTC (e.g., "09:52 PM")
                                // We must manually add 5.5 hours (330 mins) for local time
                                if (t.match(/[AP]M/i) && !t.includes("-")) {
                                  const match = t.match(
                                    /(\d+):(\d+)\s*([AP]M)/i,
                                  );
                                  if (match) {
                                    let h = parseInt(match[1]);
                                    const m = parseInt(match[2]);
                                    const isPM =
                                      match[3].toUpperCase() === "PM";
                                    if (isPM && h !== 12) h += 12;
                                    if (!isPM && h === 12) h = 0;

                                    const totalMinutes = h * 60 + m + 330; // +5.5 hours
                                    let newH =
                                      Math.floor(totalMinutes / 60) % 24;
                                    const newM = totalMinutes % 60;

                                    const newAmPm = newH >= 12 ? "PM" : "AM";
                                    newH = newH % 12;
                                    if (newH === 0) newH = 12;

                                    return `${newH.toString().padStart(2, "0")}:${newM.toString().padStart(2, "0")} ${newAmPm}`;
                                  }
                                }

                                // Scenario B: Backend sent raw DB timestamp (e.g., "2026-04-23 21:18:15.643787")
                                let cleanStr = t
                                  .split(".")[0]
                                  .replace(" ", "T");
                                if (
                                  cleanStr.includes("-") &&
                                  !cleanStr.endsWith("Z")
                                )
                                  cleanStr += "Z";

                                const d = new Date(cleanStr);

                                // If still invalid, fallback to raw string
                                if (isNaN(d.getTime())) return t;

                                return d.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                });
                              })()
                            : "N/A"}
                        </span>
                        <span
                          className={`text-sm font-bold ${
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
        <div className="bg-white border-t-2 border-gray-200 px-6 py-4 shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-6">
            <div className="flex items-center space-x-4 p-4 bg-purple-100 rounded-xl border-2 border-purple-200">
              <div className="p-3 bg-purple-500 rounded-lg">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-md text-gray-700 font-bold">
                  Total Enrolled
                </p>
                <p className="text-3xl font-bold text-purple-600">
                  {selectedSessionDetails?.enrolled_count ||
                    sessionDetails?.enrolled_count ||
                    0}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-blue-100 rounded-xl border-2 border-blue-200">
              <div className="p-3 bg-blue-600 rounded-lg">
                <UserPlus className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-md text-gray-700 font-bold">
                  Currently Inside
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  {sessionActive || isViewOnly
                    ? derivedStats.currentlyInside
                    : 0}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-green-100 rounded-xl border-2 border-green-200">
              <div className="p-3 bg-green-600 rounded-lg">
                <ArrowUp className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-md text-gray-700 font-bold">Total Entered</p>
                <p className="text-3xl font-bold text-green-600">
                  {sessionActive || isViewOnly ? derivedStats.totalEntered : 0}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-red-100 rounded-xl border-2 border-red-200">
              <div className="p-3 bg-red-600 rounded-lg">
                <UserMinus className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-md text-gray-700 font-bold">Total Exited</p>
                <p className="text-3xl font-bold text-red-600">
                  {sessionActive || isViewOnly
                    ? derivedStats.currentlyExited
                    : 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* End Session Confirmation Modal */}
      {showEndSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 animate-in fade-in duration-200 ease-out"
            style={{
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(6px)",
            }}
            onClick={() => setShowEndSessionModal(false)}
          ></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 ease-out">
            {/* Header & Warning Context */}
            <div className="p-6 pb-4 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4 ring-4 ring-red-50/50">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                End Class Session?
              </h2>
              <p className="text-gray-700 mt-2 text-sm px-2 leading-relaxed">
                You are about to finalize the{" "}
                <span className="font-bold text-gray-800">
                  {selectedSessionDetails?.module_name || "current"}
                </span>{" "}
                session. This action cannot be undone and attendance records
                will be permanently saved.
              </p>
            </div>

            <div className="px-6 pb-6">
              <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
                <h4 className="text-[11px] font-bold text-gray-500 tracking-wider mb-3">
                  Final Session Summary
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-md font-bold text-purple-600">
                        Enrolled
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {selectedSessionDetails?.enrolled_count ||
                          sessionDetails?.enrolled_count ||
                          0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <UserCheck className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-md font-bold text-green-600 ">
                        Present
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {derivedStats.totalEntered || 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <UserMinus className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-md font-bold text-red-600">Absent</p>
                      <p className="text-lg font-bold text-gray-900">
                        {Math.max(
                          0,
                          (selectedSessionDetails?.enrolled_count ||
                            sessionDetails?.enrolled_count ||
                            0) - (derivedStats.totalEntered || 0),
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-300">
              <button
                onClick={() => setShowEndSessionModal(false)}
                className="px-5 py-2.5 text-md font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 hover:text-gray-900 transition-colors shadow-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleEndSession}
                disabled={isEndingSession}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 text-md font-bold text-white rounded-xl transition-all shadow-sm ${
                  isEndingSession
                    ? "bg-red-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700 active:bg-red-800 cursor-pointer"
                }`}
              >
                {isEndingSession ? (
                  <>
                    <svg
                      className="w-4 h-4 text-white animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Finalize & Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session-ended success toast (existing) */}
      {showSuccessToast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in bg-black">
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
