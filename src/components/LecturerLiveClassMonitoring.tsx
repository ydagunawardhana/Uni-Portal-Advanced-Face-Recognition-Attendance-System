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

// ─── Constants ────────────────────────────────────────────────
const API_BASE = "http://localhost:8000";
const CAPTURE_INTERVAL_MS = 3000; // send a frame every 3 seconds

// ─── Props / Data Interfaces ──────────────────────────────────
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

// ─── API Response shapes ──────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────
let _logIdCounter = 1000; // local counter for unique log entry ids

function nowTimeString(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Convert a raw LBPH bbox {x,y,w,h} (pixel coords in the captured image)
 * into CSS percentage strings relative to the video container.
 */
function bboxToPercent(
  bbox: { x: number; y: number; w: number; h: number },
  frameW: number,
  frameH: number
): { left: string; top: string; width: string; height: string } {
  return {
    left: `${((bbox.x / frameW) * 100).toFixed(1)}%`,
    top: `${((bbox.y / frameH) * 100).toFixed(1)}%`,
    width: `${((bbox.w / frameW) * 100).toFixed(1)}%`,
    height: `${((bbox.h / frameH) * 100).toFixed(1)}%`,
  };
}

// ─── Component ────────────────────────────────────────────────
export default function LecturerLiveClassMonitoring({
  onLogout,
  onNavigate,
}: LecturerLiveClassMonitoringProps) {
  // ── UI state (unchanged from original) ──────────────────────
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const [editStatus, setEditStatus] = useState("Present");
  const [editTime, setEditTime] = useState("");
  const [editReason, setEditReason] = useState("");

  // ── Face box state – now driven by live API ──────────────────
  const [entranceFaces, setEntranceFaces] = useState<FaceBox[]>([]);
  const [unknownFaces, setUnknownFaces] = useState<FaceBox[]>([]);
  const [exitFaces, setExitFaces] = useState<FaceBox[]>([]);

  // ── Attendance log state ─────────────────────────────────────
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);

  // ── Live stats (derived from log entries) ───────────────────
  const [liveStats, setLiveStats] = useState({
    currentlyInside: 0,
    totalEntered: 0,
    leftEarly: 0,
  });

  // ── Attendance notification toast ───────────────────────────
  const [attendanceToast, setAttendanceToast] = useState<string | null>(null);

  // ── Camera / recognition refs & state ───────────────────────
  const entranceVideoRef = useRef<HTMLVideoElement>(null);
  const exitVideoRef     = useRef<HTMLVideoElement>(null);
  const canvasRef        = useRef<HTMLCanvasElement>(null);
  const streamRef        = useRef<MediaStream | null>(null);
  const captureTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cameraError,   setCameraError]   = useState<string | null>(null);
  const [isProcessing,  setIsProcessing]  = useState(false);
  // Storing the stream in state guarantees a re-render after acquisition,
  // so the useEffect below can safely attach srcObject to mounted <video> nodes.
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // ── Clock ─────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Auto-dismiss toasts ───────────────────────────────────────
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

  // ── Update live stats whenever logEntries changes ─────────────
  useEffect(() => {
    const entered = logEntries.filter((e) => e.status === "entered").length;
    const exited  = logEntries.filter((e) => e.status === "exited").length;
    setLiveStats({
      totalEntered:    entered,
      currentlyInside: Math.max(0, entered - exited),
      leftEarly:       exited,
    });
  }, [logEntries]);

  // ── Step 1: Acquire the MediaStream (does NOT touch video refs) ──
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      // Storing in state triggers a re-render → the useEffect below
      // fires AFTER the <video> elements are mounted in the DOM.
      setMediaStream(stream);
    } catch (err: any) {
      const msg =
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access and try again."
          : err.name === "NotFoundError"
          ? "No camera device found on this machine."
          : `Camera error: ${err.message}`;
      setCameraError(msg);
      setSessionActive(false); // roll back so UI shows offline state
    }
  }, []);

  // ── Step 2: Attach stream to <video> elements after DOM is ready ──
  // This runs every time mediaStream or sessionActive changes, which
  // guarantees the <video> tags are already mounted before we touch them.
  useEffect(() => {
    if (!mediaStream || !sessionActive) return;

    const attach = async () => {
      if (entranceVideoRef.current) {
        entranceVideoRef.current.srcObject = mediaStream;
        try { await entranceVideoRef.current.play(); } catch (_) {/* autoPlay policy */}
      }
      if (exitVideoRef.current) {
        exitVideoRef.current.srcObject = mediaStream;
        try { await exitVideoRef.current.play(); } catch (_) {}
      }
    };

    attach();
  }, [mediaStream, sessionActive]);

  // ── Camera teardown ───────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (captureTimerRef.current) {
      clearInterval(captureTimerRef.current);
      captureTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (entranceVideoRef.current) entranceVideoRef.current.srcObject = null;
    if (exitVideoRef.current)     exitVideoRef.current.srcObject     = null;
  }, []);

  // ── Capture + recognise ───────────────────────────────────────
  const captureAndRecognize = useCallback(async () => {
    const video  = entranceVideoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || isProcessing) return;

    const W = video.videoWidth  || 640;
    const H = video.videoHeight || 480;
    canvas.width  = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, W, H);

    setIsProcessing(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.85)
      );

      const form = new FormData();
      form.append("file", blob, "frame.jpg");
      form.append("debounce_min", "1");

      const res = await fetch(`${API_BASE}/api/attendance`, {
        method: "POST",
        body:   form,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data: ApiAttendanceResponse = await res.json();

      // ── Update face boxes ──────────────────────────────────
      const newEntered: FaceBox[] = [];
      const newUnknown: FaceBox[] = [];

      data.results.forEach((face, idx) => {
        const pos = bboxToPercent(face.bbox, W, H);
        const box: FaceBox = {
          id:     face.user_id || -(idx + 1),
          name:   face.label,
          ...pos,
        };
        if (face.is_known) newEntered.push(box);
        else               newUnknown.push(box);
      });

      setEntranceFaces(newEntered);
      setUnknownFaces(newUnknown);
      // exit panel shows previously exited people
      setExitFaces(
        data.results
          .filter((f) => {
            const matchingLog = data.logs.find(
              (l) => l.student?.name === f.label && l.status === "exited"
            );
            return !!matchingLog;
          })
          .map((face, idx) => ({
            id:   face.user_id || -(idx + 100),
            name: face.label,
            ...bboxToPercent(face.bbox, W, H),
          }))
      );

      // ── Prepend new log entries ────────────────────────────
      if (data.logs.length > 0) {
        const newEntries: LogEntry[] = data.logs.map((log) => ({
          id:          _logIdCounter++,
          studentName: log.student?.name ?? `Student #${log.student_id}`,
          indexNumber: log.student?.index_number,
          time:        nowTimeString(),
          status:      log.status,
        }));

        setLogEntries((prev) => [...newEntries, ...prev].slice(0, 100));

        // Show attendance toast for the first recognised person
        const firstName = newEntries[0].studentName;
        const firstStatus = newEntries[0].status === "entered" ? "Entered" : "Exited";
        setAttendanceToast(`✅ Attendance Marked — ${firstName} (${firstStatus})`);
      }
    } catch (err: any) {
      // silently swallow network errors between captures; show nothing to avoid spam
      console.warn("[FaceRecognition] capture error:", err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  // ── Session lifecycle ─────────────────────────────────────────
  const handleStartSession = useCallback(() => {
    // IMPORTANT: set sessionActive FIRST so React renders the <video> elements
    // into the DOM. Only then does startCamera() fire; when it resolves the
    // stream, setMediaStream triggers the attach-useEffect which finds the
    // now-mounted video refs and sets srcObject correctly.
    setSessionActive(true);
    startCamera();
  }, [startCamera]);

  useEffect(() => {
    if (sessionActive) {
      // Start periodic capture after a brief delay for the video to stabilise
      const delay = setTimeout(() => {
        captureTimerRef.current = setInterval(captureAndRecognize, CAPTURE_INTERVAL_MS);
      }, 1500);
      return () => clearTimeout(delay);
    } else {
      if (captureTimerRef.current) {
        clearInterval(captureTimerRef.current);
        captureTimerRef.current = null;
      }
    }
  }, [sessionActive, captureAndRecognize]);

  const handleEndSession = useCallback(() => {
    stopCamera();
    setMediaStream(null);  // prevent the attach-effect from re-running
    setSessionActive(false);
    setEntranceFaces([]);
    setUnknownFaces([]);
    setExitFaces([]);
    setShowEndSessionModal(false);
    setShowSuccessToast(true);
  }, [stopCamera]);

  // ── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── Edit modal helpers (unchanged logic) ──────────────────────
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
        time:   editTime,
      };
      setLogEntries((prev) => prev.map((e) => (e.id === selectedEntry.id ? updated : e)));
      setShowEditModal(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
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
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">Select Subject...</option>
                <option value="cs101">Database Management Systems (CS-101)</option>
                <option value="cs102">Data Structures &amp; Algorithms (CS-102)</option>
                <option value="cs201">Operating Systems (CS-201)</option>
                <option value="cs202">Computer Networks (CS-202)</option>
              </select>
            </div>

            {/* Session Selector */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Session
              </label>
              <select
                aria-label="Select Course Session"
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">Select Session/Batch...</option>
                <option value="session1">Today 9:00 AM - Year 2 Semester 1</option>
                <option value="session2">Today 11:00 AM - Year 2 Semester 2</option>
                <option value="session3">Today 2:00 PM - Year 3 Semester 1</option>
                <option value="session4">Today 4:00 PM - Year 3 Semester 2</option>
              </select>
            </div>

            {/* Start/End Session Button */}
            <div className="flex items-end">
              {!sessionActive ? (
                <button
                  onClick={handleStartSession}
                  className="flex items-center gap-2 px-8 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors shadow-md whitespace-nowrap"
                >
                  <Play className="w-5 h-5 fill-white" />
                  Start Live Session
                </button>
              ) : (
                <button
                  onClick={() => setShowEndSessionModal(true)}
                  className="flex items-center gap-2 px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors shadow-md whitespace-nowrap"
                >
                  <Square className="w-5 h-5 fill-white" />
                  End Session
                </button>
              )}
            </div>
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

              {/* ── Entrance Camera Feed ──────────────────────── */}
              <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 overflow-hidden flex flex-col">
                <div className="bg-green-600 px-4 py-3 flex items-center space-x-2">
                  <Video className="w-5 h-5 text-white" />
                  <span className="text-white font-bold">📷 Entrance Camera (IN)</span>
                  {/* Processing indicator */}
                  {sessionActive && isProcessing && (
                    <span className="ml-auto text-xs text-green-200 animate-pulse font-medium">
                      Scanning…
                    </span>
                  )}
                </div>

                {!sessionActive ? (
                  /* Offline State */
                  <div className="flex-1 bg-gray-800 relative overflow-hidden flex items-center justify-center">
                    <div className="text-center">
                      <CameraOff className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400 font-medium text-lg">Session Not Started</p>
                      <p className="text-gray-500 text-sm mt-2">Waiting for signal...</p>
                    </div>
                  </div>
                ) : (
                  /* Live Webcam State */
                  <div className="flex-1 bg-gray-800 relative overflow-hidden min-h-[300px]">
                    {/* Real webcam feed */}
                    <video
                      ref={(node) => {
                        entranceVideoRef.current = node;
                        if (node && mediaStream && node.srcObject !== mediaStream) {
                          node.srcObject = mediaStream;
                          node.play().catch(() => {});
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ transform: "scaleX(-1)" /* mirror effect */ }}
                    />

                    {/* Known face boxes – green */}
                    {entranceFaces.map((face) => (
                      <div
                        key={face.id}
                        className="absolute border-4 border-green-500 rounded-lg"
                        style={{ left: face.left, top: face.top, width: face.width, height: face.height }}
                      >
                        <div className="absolute -top-8 left-0 bg-green-500 text-white px-3 py-1 rounded text-xs font-bold shadow-lg whitespace-nowrap">
                          ✓ Marked IN
                        </div>
                        <div className="absolute -bottom-7 left-0 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                          {face.name}
                        </div>
                      </div>
                    ))}

                    {/* Unknown faces – amber */}
                    {unknownFaces.map((face) => (
                      <div
                        key={face.id}
                        className="absolute border-4 border-amber-500 rounded-lg"
                        style={{ left: face.left, top: face.top, width: face.width, height: face.height }}
                      >
                        <div className="absolute -top-8 left-0 bg-amber-500 text-white px-3 py-1 rounded text-xs font-bold shadow-lg whitespace-nowrap">
                          ⚠ Unidentified
                        </div>
                        <div className="absolute -bottom-7 left-0 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                          {face.name}
                        </div>
                      </div>
                    ))}

                    {/* Live Indicator */}
                    <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black bg-opacity-70 px-3 py-1.5 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-white text-xs font-medium">LIVE</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Exit Camera Feed ──────────────────────────── */}
              <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 overflow-hidden flex flex-col">
                <div className="bg-red-600 px-4 py-3 flex items-center space-x-2">
                  <Video className="w-5 h-5 text-white" />
                  <span className="text-white font-bold">📷 Exit Camera (OUT)</span>
                </div>

                {!sessionActive ? (
                  /* Offline State */
                  <div className="flex-1 bg-gray-800 relative overflow-hidden flex items-center justify-center">
                    <div className="text-center">
                      <CameraOff className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400 font-medium text-lg">Session Not Started</p>
                      <p className="text-gray-500 text-sm mt-2">Waiting for signal...</p>
                    </div>
                  </div>
                ) : (
                  /* Mirror of entrance camera (same stream, exit overlay) */
                  <div className="flex-1 bg-gray-800 relative overflow-hidden min-h-[300px]">
                    <video
                      ref={(node) => {
                        exitVideoRef.current = node;
                        if (node && mediaStream && node.srcObject !== mediaStream) {
                          node.srcObject = mediaStream;
                          node.play().catch(() => {});
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ transform: "scaleX(-1)" }}
                    />

                    {/* Exit face boxes – red */}
                    {exitFaces.map((face) => (
                      <div
                        key={face.id}
                        className="absolute border-4 border-red-500 rounded-lg"
                        style={{ left: face.left, top: face.top, width: face.width, height: face.height }}
                      >
                        <div className="absolute -top-8 left-0 bg-red-500 text-white px-3 py-1 rounded text-xs font-bold shadow-lg whitespace-nowrap">
                          ✓ Marked OUT
                        </div>
                        <div className="absolute -bottom-7 left-0 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                          {face.name}
                        </div>
                      </div>
                    ))}

                    {/* Live Indicator */}
                    <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black bg-opacity-70 px-3 py-1.5 rounded-full">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-white text-xs font-medium">LIVE</span>
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
              <p className="text-xs text-gray-600 mt-1">Real-time activity tracking</p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {!sessionActive ? (
                <div className="flex items-center justify-center h-full px-5 py-20">
                  <div className="text-center">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">Waiting for live data...</p>
                    <p className="text-gray-400 text-sm mt-1">Start a session to begin tracking</p>
                  </div>
                </div>
              ) : logEntries.length === 0 ? (
                <div className="flex items-center justify-center h-full px-5 py-20">
                  <div className="text-center">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">Scanning for faces…</p>
                    <p className="text-gray-400 text-sm mt-1">Entries will appear here</p>
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
                        <span className="font-semibold text-gray-900 text-sm">{entry.studentName}</span>
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
                        <span className="text-xs text-gray-500">{entry.time}</span>
                        <span
                          className={`text-xs font-bold ${
                            entry.status === "entered" ? "text-green-600" : "text-red-600"
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
                <p className="text-sm text-gray-600 font-medium">Currently Inside</p>
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
                <p className="text-sm text-gray-600 font-medium">Total Entered</p>
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
              <h2 className="text-2xl font-bold text-gray-900">End Class Session?</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700 text-base mb-5">
                Are you sure you want to end this session? Attendance for{" "}
                <span className="font-bold">{liveStats.totalEntered} students</span> will be saved.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Session Summary
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm text-gray-700">Present:</span>
                    <span className="text-sm font-bold text-gray-900">{liveStats.currentlyInside}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    <span className="text-sm text-gray-700">Left Early:</span>
                    <span className="text-sm font-bold text-gray-900">{liveStats.leftEarly}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEndSessionModal(false)}
                className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEndSession}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md"
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
                  <h2 className="text-2xl font-bold text-gray-900">Edit Attendance Log</h2>
                  <p className="text-sm text-gray-500 mt-1">Manual correction for system entry</p>
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
                    <p className="font-bold text-gray-900 text-lg">{selectedEntry.studentName}</p>
                    <p className="text-sm text-gray-600">
                      Index: {selectedEntry.indexNumber || "CS/2021/001"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Time Entry</label>
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
            <p className="flex-1 font-medium">Session ended successfully. Attendance records saved.</p>
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
