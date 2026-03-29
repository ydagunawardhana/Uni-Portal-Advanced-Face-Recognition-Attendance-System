import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Camera,
  Clock,
  User,
  CheckCircle,
  X,
  Save,
  Trash,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = "http://localhost:8000";
const TOTAL_FRAMES = 50;
const FRAME_INTERVAL_MS = 300;

interface StudentData {
  id: number;
  name: string;
  index_number: string;
  department: string;
  academic_year: string;
  intake: string;
  mobile: string;
  email: string;
  nic_number: string;
  gender: string;
  profile_picture?: string | null;
  retrain_requested?: boolean;
}

interface FaceStatus {
  isError: boolean;
  message: string;
}

interface ManageStudentsProps {
  onRegisterNew?: () => void;
}

export default function ManageStudents({
  onRegisterNew,
}: ManageStudentsProps = {}) {
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [selectedIntake, setSelectedIntake] = useState("all");

  // Data
  const [students, setStudents] = useState<StudentData[]>([]);
  const [pendingRetrains, setPendingRetrains] = useState<StudentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentData | null>(
    null,
  );
  const [editForm, setEditForm] = useState({
    name: "",
    mobile: "",
    department: "",
    academic_year: "",
    intake: "",
    nic_number: "",
    gender: "",
    index_number: "",
    email: "",
  });

  // Delete Modal State
  const [studentToDelete, setStudentToDelete] = useState<StudentData | null>(
    null,
  );

  // Recapture Modal State
  const [studentToCapture, setStudentToCapture] = useState<StudentData | null>(
    null,
  );
  const [camActive, setCamActive] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imagesCaptured, setImagesCaptured] = useState(0);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [faceStatus, setFaceStatus] = useState<FaceStatus | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureActiveRef = useRef(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token =
      localStorage.getItem("adminToken") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [studentsRes, pendingRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/students`, { headers }),
        fetch(`${API_BASE}/api/admin/pending-retrains`, { headers }),
      ]);

      if (studentsRes.ok && pendingRes.ok) {
        const studentsData = await studentsRes.json();
        const pendingData = await pendingRes.json();
        setStudents(studentsData);
        setPendingRetrains(pendingData);
      } else {
        console.error(
          "Fetch students failed:",
          studentsRes.status,
          pendingRes.status,
        );
        toast.error("Failed to fetch student data from server.");
      }
    } catch (error: any) {
      console.error("Error fetching students:", error);
      toast.error(error.message || "Network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const getImageUrl = (path?: string | null, name?: string) => {
    if (path) return `${API_BASE}${path}?t=${Date.now()}`;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name || "Unknown",
    )}&background=random`;
  };

  // --- RECAPTURE LOGIC ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCamActive(true);
      setFaceStatus(null);
    } catch (error) {
      console.error("Camera access error:", error);
      toast.error("Could not access webcam. Please check permissions.");
    }
  };

  const stopCamera = () => {
    captureActiveRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCamActive(false);
    setCapturing(false);
  };

  const closeCaptureModal = () => {
    stopCamera();
    setStudentToCapture(null);
    setImagesCaptured(0);
    setCapturedFrames([]);
    setFaceStatus(null);
  };

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    return dataUrl.split(",")[1];
  }, []);

  const handleStartCapture = async () => {
    if (!camActive) {
      toast.error("Start camera first!");
      return;
    }
    if (capturing || !studentToCapture) return;

    setCapturing(true);
    setImagesCaptured(0);
    setFaceStatus(null);
    captureActiveRef.current = true;

    let currentFrames: string[] = [];
    const toastId = toast.loading("Capturing face… (0/50)");

    const captureLoop = async () => {
      while (captureActiveRef.current && currentFrames.length < TOTAL_FRAMES) {
        const b64 = captureFrame();
        if (b64) {
          try {
            const token =
              localStorage.getItem("adminToken") ||
              localStorage.getItem("access_token") ||
              localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/api/admin/validate-face`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ frame_b64: b64 }),
            });
            const data = await res
              .json()
              .catch(() => ({ face_detected: false, reason: "Server Error" }));

            if (data.face_detected) {
              currentFrames.push(b64);
              setImagesCaptured(currentFrames.length);
              setFaceStatus({ isError: false, message: "Face Detected" });
              toast.loading(
                `Capturing face… (${currentFrames.length}/${TOTAL_FRAMES})`,
                { id: toastId },
              );
            } else {
              setFaceStatus({
                isError: true,
                message: data.reason || "Invalid Pose",
              });
            }
          } catch (error: any) {
            console.error("Validation API error:", error);
            setFaceStatus({ isError: true, message: "Validation error" });
          }
        }
        await new Promise((r) => setTimeout(r, FRAME_INTERVAL_MS));
      }

      if (currentFrames.length >= TOTAL_FRAMES && captureActiveRef.current) {
        toast.success("All 50 images captured! Ready for upload.", {
          id: toastId,
          duration: 3000,
        });
        setCapturedFrames(currentFrames);
        setCapturing(false);
        captureActiveRef.current = false;
        stopCamera();
      } else {
        toast.dismiss(toastId);
        setCapturing(false);
      }
    };

    captureLoop();
  };

  const handleConfirmUpload = async () => {
    if (!studentToCapture || capturedFrames.length < TOTAL_FRAMES) return;
    setIsUploading(true);

    const token =
      localStorage.getItem("adminToken") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token");
    const toastId = toast.loading(
      `Uploading dataset for ${studentToCapture.name}...`,
    );

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/students/${studentToCapture.id}/recapture`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ images: capturedFrames }),
        },
      );

      if (res.ok) {
        toast.success("Face Recapture Updated successfully!", { id: toastId });

        // Update states
        setPendingRetrains((prev) =>
          prev.filter((s) => s.id !== studentToCapture.id),
        );
        setStudents((prev) =>
          prev.map((s) =>
            s.id === studentToCapture.id
              ? { ...s, retrain_requested: false }
              : s,
          ),
        );

        setStudentToCapture(null);
        setCapturedFrames([]);
        setImagesCaptured(0);
      } else {
        const data = await res
          .json()
          .catch(() => ({ detail: "Upload failed" }));
        toast.error(data.detail || "Upload failed", { id: toastId });
      }
    } catch (error: any) {
      console.error("Upload Error:", error);
      toast.error(error.message || "Network error during upload", {
        id: toastId,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetakeImages = () => {
    setCapturedFrames([]);
    setImagesCaptured(0);
    setFaceStatus(null);
    startCamera();
  };

  // --- DELETE LOGIC ---
  const confirmDelete = async () => {
    if (!studentToDelete) return;

    const student = studentToDelete;
    const token =
      localStorage.getItem("adminToken") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token");
    const toastId = toast.loading(`Deleting ${student.name}...`);

    try {
      const res = await fetch(`${API_BASE}/api/admin/students/${student.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast.success("Student deleted successfully", { id: toastId });
        setStudents((prev) => prev.filter((s) => s.id !== student.id));
        setPendingRetrains((prev) => prev.filter((s) => s.id !== student.id));
        setStudentToDelete(null);
      } else {
        const data = await res
          .json()
          .catch(() => ({ detail: "Delete failed" }));
        toast.error(data.detail || "Failed to delete student", { id: toastId });
      }
    } catch (error: any) {
      console.error("Delete Error:", error);
      toast.error(error.message || "Network error", { id: toastId });
    }
  };

  // --- EDIT LOGIC ---
  const openEditModal = (student: StudentData) => {
    setEditingStudent(student);
    setEditForm({
      name: student.name,
      mobile: student.mobile || "",
      department: student.department || "",
      academic_year: student.academic_year || "",
      intake: student.intake || "",
      nic_number: student.nic_number || "",
      gender: student.gender || "",
      index_number: student.index_number,
      email: student.email || "",
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingStudent) return;

    const token =
      localStorage.getItem("adminToken") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token");
    const toastId = toast.loading("Updating student details...");

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/students/${editingStudent.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: editForm.name,
            mobile: editForm.mobile,
            department: editForm.department,
            academic_year: editForm.academic_year,
            intake: editForm.intake,
            nic_number: editForm.nic_number,
            gender: editForm.gender,
          }),
        },
      );

      if (res.ok) {
        const updatedStudent = await res.json();
        toast.success("Student updated successfully", { id: toastId });

        // Update local state
        setStudents((prev) =>
          prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)),
        );
        setPendingRetrains((prev) =>
          prev.map((s) =>
            s.id === updatedStudent.id ? { ...s, ...updatedStudent } : s,
          ),
        );

        setIsEditModalOpen(false);
      } else {
        const data = await res
          .json()
          .catch(() => ({ detail: "Update failed" }));
        toast.error(data.detail || "Update failed", { id: toastId });
      }
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error.message || "Network error", { id: toastId });
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.index_number.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDepartment =
      selectedDepartment === "all" || student.department === selectedDepartment;

    const matchesBatch =
      selectedBatch === "all" || student.academic_year === selectedBatch;

    const matchesIntake =
      selectedIntake === "all" ||
      selectedIntake === "" ||
      student.intake?.toLowerCase().includes(selectedIntake.toLowerCase());

    return matchesSearch && matchesDepartment && matchesBatch && matchesIntake;
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="hidden" />

      {/* Control Bar */}
      <div className="bg-white rounded-lg shadow-md p-5 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by Name or Index Number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Filter by Department"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white min-w-[180px]"
            >
              <option value="all">All Departments</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Electrical Engineering">
                Electrical Engineering
              </option>
              <option value="Mechanical Engineering">
                Mechanical Engineering
              </option>
              <option value="Civil Engineering">Civil Engineering</option>
              <option value="Business Administration">
                Business Administration
              </option>
              <option value="Architecture">Architecture</option>
            </select>

            <select
              aria-label="Filter by Batch"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white min-w-[140px]"
            >
              <option value="all">All Batches</option>
              <option value="Year 1">Year 1</option>
              <option value="Year 2">Year 2</option>
              <option value="Year 3">Year 3</option>
              <option value="Year 4">Year 4</option>
            </select>

            <input
              type="text"
              placeholder="Filter by Intake (e.g. 26.1)"
              value={selectedIntake === "all" ? "" : selectedIntake}
              onChange={(e) => setSelectedIntake(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white min-w-[180px]"
            />
          </div>

          <button
            onClick={() => onRegisterNew && onRegisterNew()}
            className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md font-medium whitespace-nowrap ml-auto"
          >
            <Plus className="w-5 h-5" />
            <span>Register New Student</span>
          </button>
        </div>
      </div>

      {/* Pending Re-training Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-8">
        <div className="bg-yellow-50 border-b border-yellow-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-yellow-800 flex items-center gap-2">
              <Clock className="w-6 h-6 text-yellow-600" />
              Pending Face Re-training Requests
            </h2>
            <p className="text-yellow-700 mt-1">
              Students requiring immediate face model updates
            </p>
          </div>
          <div className="bg-yellow-100 text-yellow-800 font-bold px-4 py-2 rounded-lg">
            {pendingRetrains.length} Pending
          </div>
        </div>

        <div className="p-6">
          {pendingRetrains.length === 0 ? (
            <div className="text-center py-8 text-gray-500 flex flex-col items-center">
              <CheckCircle className="w-12 h-12 text-green-400 mb-3" />
              <p className="text-lg">All caught up!</p>
              <p className="text-sm">
                No pending face re-training requests at this time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingRetrains.map((student) => (
                <div
                  key={student.id}
                  className="bg-white border-2 border-yellow-200 rounded-lg p-5 flex flex-col transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <img
                      src={getImageUrl(student.profile_picture, student.name)}
                      alt={student.name}
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-yellow-400 shadow-sm"
                    />
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {student.name}
                      </h3>
                      <p className="text-sm font-medium text-red-600">
                        {student.index_number}
                      </p>
                      <p className="text-xs text-gray-500">
                        {student.department || "N/A"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setStudentToCapture(student)}
                    className="mt-auto w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Recapture Face
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All Registered Students */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-10">
        <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <User className="w-6 h-6 text-blue-600" />
              All Registered Students
            </h2>
            <p className="text-gray-600 mt-1">
              Complete directory of all registered profiles
            </p>
          </div>

          <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 font-bold text-gray-700">
            Total: {filteredStudents.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold w-16 text-center">Profile</th>
                <th className="p-4 font-semibold">Student Name</th>
                <th className="p-4 font-semibold">Index Number</th>
                <th className="p-4 font-semibold">Department</th>
                <th className="p-4 font-semibold">Batch</th>
                <th className="p-4 font-semibold">Intake</th>
                <th className="p-4 font-semibold">Mobile</th>
                <th className="p-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    No students matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="p-4 text-center">
                      <img
                        src={getImageUrl(student.profile_picture, student.name)}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover shadow-sm mx-auto"
                      />
                    </td>
                    <td className="p-4 font-bold text-gray-900">
                      {student.name}
                    </td>
                    <td className="p-4 text-red-600 font-medium">
                      {student.index_number}
                    </td>
                    <td className="p-4 text-gray-700">
                      {student.department || "-"}
                    </td>
                    <td className="p-4 text-gray-700 text-sm">
                      {student.academic_year || "-"}
                    </td>
                    <td className="p-4 text-gray-700 text-sm">
                      {student.intake || "-"}
                    </td>
                    <td className="p-4 text-gray-700 text-sm">
                      {student.mobile || "-"}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => openEditModal(student)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Student"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setStudentToDelete(student)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Student"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            onClick={() => setIsEditModalOpen(false)}
          ></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl relative z-[1000] overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                Edit Student Details
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto text-left">
              {/* Read-only Identifiers */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-500 mb-1">
                    Index Number (Read-only)
                  </label>
                  <input
                    type="text"
                    value={editForm.index_number}
                    disabled
                    className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-500 mb-1">
                    Email Address (Read-only)
                  </label>
                  <input
                    type="text"
                    value={editForm.email}
                    disabled
                    className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Editable Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      value={editForm.mobile}
                      onChange={(e) =>
                        setEditForm({ ...editForm, mobile: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      NIC Number
                    </label>
                    <input
                      type="text"
                      value={editForm.nic_number}
                      onChange={(e) =>
                        setEditForm({ ...editForm, nic_number: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Department
                    </label>
                    <select
                      value={editForm.department}
                      onChange={(e) =>
                        setEditForm({ ...editForm, department: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="Computer Science">Computer Science</option>
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
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Gender
                    </label>
                    <select
                      value={editForm.gender}
                      onChange={(e) =>
                        setEditForm({ ...editForm, gender: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Batch (Year)
                    </label>
                    <select
                      value={editForm.academic_year}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          academic_year: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="Year 1">Year 1</option>
                      <option value="Year 2">Year 2</option>
                      <option value="Year 3">Year 3</option>
                      <option value="Year 4">Year 4</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Intake
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 26.1"
                      value={editForm.intake}
                      onChange={(e) =>
                        setEditForm({ ...editForm, intake: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recapture Modal - PORTED STRICT LOGIC */}
      {studentToCapture && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={closeCaptureModal}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-[1000] overflow-hidden transform transition-all">
            {/* Modal Header */}
            <div className="bg-blue-100 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Camera className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-black">
                    Face Recapture
                  </h3>
                  <p className="text-sm text-gray-700">
                    Refreshing dataset for {studentToCapture.name}
                  </p>
                </div>
              </div>
              <button
                onClick={closeCaptureModal}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-800" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 bg-white grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Live Feed with Overlay */}
              <div className="space-y-6">
                <div className="aspect-video w-full min-h-[320px] bg-gray-100 rounded-xl overflow-hidden relative border-2 border-gray-500 shadow-xl">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover absolute inset-0"
                  />

                  {/* Green Guide Overlay */}
                  {camActive && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                      <div
                        className="w-[220px] h-[280px] z-10 rounded-[30px] border-2 border-green-500/20 relative flex items-center justify-center transition-all duration-300"
                        style={{ boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.2)" }}
                      >
                        <div className="absolute -top-0.5 -left-0.5 w-10 h-10 border-t-4 border-l-4 border-green-500 rounded-tl-[30px]"></div>
                        <div className="absolute -top-0.5 -right-0.5 w-10 h-10 border-t-4 border-r-4 border-green-500 rounded-tr-[30px]"></div>
                        <div className="absolute -bottom-0.5 -left-0.5 w-10 h-10 border-b-4 border-l-4 border-green-500 rounded-bl-[30px]"></div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-10 h-10 border-b-4 border-r-4 border-green-500 rounded-br-[30px]"></div>

                        <span className="absolute -bottom-14 text-white text-xs font-bold bg-black/60 px-4 py-1.5 rounded-full whitespace-nowrap">
                          Center face in frame
                        </span>
                      </div>
                    </div>
                  )}

                  {!camActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-400 space-y-4">
                      <Camera className="w-16 h-16 text-gray-300 animate-pulse" />
                      <p className="text-sm font-medium">Webcam Inactive</p>
                    </div>
                  )}

                  {(capturing || isUploading) && (
                    <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1.5 rounded flex items-center gap-2 z-20">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {isUploading ? "Uploading..." : "Capturing..."}
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => (camActive ? stopCamera() : startCamera())}
                    disabled={isUploading || capturing}
                    className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                      camActive
                        ? "border-2 border-red-500 text-red-500 hover:bg-red-50"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    <Camera className="w-5 h-5" />
                    {camActive ? "Turn Off Camera" : "Start Camera"}
                  </button>
                </div>
              </div>

              {/* Right Column: Progress & Status */}
              <div className="flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-gray-900">
                        Registration Info
                      </h4>
                      <span className="text-xs font-mono text-gray-500 uppercase">
                        {studentToCapture.index_number}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 flex justify-between">
                        <span>Email:</span>
                        <span className="font-medium text-gray-900">
                          {studentToCapture.email}
                        </span>
                      </p>
                      <p className="text-sm text-gray-600 flex justify-between">
                        <span>Department:</span>
                        <span className="font-medium text-gray-900">
                          {studentToCapture.department || "N/A"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold text-gray-700">
                        Capture Progress
                      </label>
                      {faceStatus && (
                        <span
                          className={`text-[11px] font-bold uppercase ${
                            faceStatus.isError
                              ? "text-red-500"
                              : "text-green-600"
                          }`}
                        >
                          {faceStatus.message}
                        </span>
                      )}
                    </div>

                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          imagesCaptured === TOTAL_FRAMES
                            ? "bg-green-500"
                            : "bg-blue-600 shadow-lg"
                        }`}
                        style={{
                          width: `${(imagesCaptured / TOTAL_FRAMES) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold text-gray-400 mt-2">
                      <span>0%</span>
                      <span>
                        {imagesCaptured} OF {TOTAL_FRAMES} FRAMES
                      </span>
                      <span>100%</span>
                    </div>

                    {imagesCaptured >= TOTAL_FRAMES && (
                      <p className="text-sm text-green-600 mt-2 font-medium flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        All images captured successfully!
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-6">
                  {imagesCaptured < TOTAL_FRAMES ? (
                    <button
                      onClick={handleStartCapture}
                      disabled={!camActive || capturing || isUploading}
                      className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 transition-all ${
                        camActive && !capturing && !isUploading
                          ? "bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.02]"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {capturing ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          Validating Face...
                        </>
                      ) : (
                        <>
                          <Camera className="w-6 h-6" />
                          Start Capture Sequence
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex gap-4">
                      <button
                        onClick={handleRetakeImages}
                        disabled={isUploading}
                        className="flex-1 py-4 bg-gray-200 text-gray-700 rounded-xl font-bold text-lg shadow-md hover:bg-gray-300 transition-all flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-5 h-5" />
                        Retake
                      </button>
                      <button
                        onClick={handleConfirmUpload}
                        disabled={isUploading}
                        className="flex-1 py-4 bg-green-600 text-white rounded-xl font-bold text-lg shadow-xl shadow-green-200 hover:bg-green-700 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {isUploading ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <Save className="w-6 h-6" />
                        )}
                        {isUploading ? "Uploading..." : "Confirm & Save"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            onClick={() => setStudentToDelete(null)}
          ></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative z-[1000] overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="p-8 flex flex-col items-center text-center">
              {/* Warning Icon Cluster */}
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Delete Student Profile?
              </h3>
              <p className="text-gray-600 mb-8 px-2">
                Are you sure you want to delete{" "}
                <span className="font-bold text-gray-900">
                  {studentToDelete.name}
                </span>
                ? This action cannot be undone and will permanently remove their
                data and face records from the system.
              </p>

              <div className="grid grid-cols-2 gap-4 w-full text-center">
                <button
                  onClick={() => setStudentToDelete(null)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                >
                  <Trash className="w-4 h-4" />
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
