import { useState, useEffect } from "react";
import { X, Loader2, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";

interface EditLecturerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lecturerData: any) => void;
  isSaving?: boolean;
  lecturer?: {
    name: string;
    employeeId: string;
    email: string;
    department: string;
    assigned_subjects?: string;
    status: "Active" | "On Leave";
  } | null;
}

const SUBJECT_OPTIONS = [
  "Object Oriented Programming",
  "Data Structures & Algorithms",
  "Database Management Systems",
  "Software Engineering",
  "Artificial Intelligence",
  "Machine Learning",
  "Computer Networks",
  "Operating Systems",
  "Cyber Security",
  "Cloud Computing"
];

export default function EditLecturerModal({
  isOpen,
  onClose,
  onSave,
  isSaving,
  lecturer,
}: EditLecturerModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [employeeId, setEmployeeId] = useState("");
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && lecturer) {
      setFullName(lecturer.name);
      setEmail(lecturer.email);
      setDepartment(lecturer.department);
      setIsActive(lecturer.status === "Active");
      setEmployeeId(lecturer.employeeId);
      
      // Safe initialization for subjects
      const subjectsStr = lecturer.assigned_subjects || "";
      setAssignedSubjects(subjectsStr ? subjectsStr.split(",").map(s => s.trim()).filter(Boolean) : []);
    }
  }, [isOpen, lecturer]);

  if (!isOpen) return null;

  const handleToggleSubject = (subject: string) => {
    setAssignedSubjects(prev => 
      prev.includes(subject) 
        ? prev.filter(s => s !== subject) 
        : [...prev, subject]
    );
  };

  const handleSave = () => {
    // Validate required fields
    if (!fullName || !email || !department) {
      toast.error("Please fill in all required fields");
      return;
    }

    const updatedData = {
      fullName,
      employeeId,
      email,
      department,
      isActive,
      assignedSubjects
    };

    onSave(updatedData);
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop with Blur Effect */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleCancel}
      ></div>

      {/* Modal Card */}
      <div className="relative z-[1000] bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto max-h-[90vh] overflow-hidden flex flex-col transform transition-all animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Edit Lecturer Details
            </h2>
            <p className="text-sm text-gray-500 mt-1">Update profile information and portal access.</p>
          </div>
          <button
            aria-label="Close"
            onClick={handleCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <div className="px-8 py-6 space-y-5 overflow-y-auto">
          {/* Full Name */}
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Enter lecturer's full name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Employee ID (Disabled) */}
            <div>
              <label
                htmlFor="employeeId"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Employee ID
              </label>
              <input
                type="text"
                id="employeeId"
                value={employeeId}
                disabled
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Employee ID cannot be changed
              </p>
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
                disabled
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed outline-none"
                placeholder="lecturer@university.edu"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email address is used as the login username and cannot be changed.
              </p>
            </div>
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
              <option value="Computer Science">Computer Science</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Physics">Physics</option>
              <option value="Engineering">Engineering</option>
              <option value="Business Administration">
                Business Administration
              </option>
              <option value="Architecture">Architecture</option>
            </select>
          </div>

          {/* Assigned Subjects - Badge Multi-select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assigned Subjects
            </label>
            
            {/* Selected Subjects Badges */}
            <div className="flex flex-wrap gap-2 mb-3 px-1">
              {assignedSubjects.map((subject, index) => (
                <span 
                  key={index} 
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full border border-blue-200 group transition-all hover:bg-blue-100"
                >
                  {subject}
                  <button
                    type="button"
                    onClick={() => setAssignedSubjects(prev => prev.filter(s => s !== subject))}
                    className="p-0.5 hover:bg-blue-200 rounded-full transition-colors text-blue-400 hover:text-blue-600"
                    title={`Remove ${subject}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              {assignedSubjects.length === 0 && (
                <p className="text-sm text-gray-400 italic px-1">No subjects assigned yet.</p>
              )}
            </div>

            {/* Subject Selector */}
            <div className="relative">
              <select
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white appearance-none cursor-pointer"
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && !assignedSubjects.includes(val)) {
                    setAssignedSubjects(prev => [...prev, val]);
                  }
                }}
              >
                <option value="" disabled>Select a subject to add...</option>
                {SUBJECT_OPTIONS
                  .filter(subject => !assignedSubjects.includes(subject))
                  .map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                <ChevronDown className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Status Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Status
            </label>
            <div className="flex items-center justify-between bg-white px-5 py-4 rounded-xl border border-gray-200 shadow-sm">
              <div>
                <p className="font-bold text-gray-900">{isActive ? "Account Active" : "Account Suspended"}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {isActive
                    ? "Lecturer has full portal access."
                    : "Access is currently restricted."}
                </p>
              </div>
              <button
                aria-label="Toggle Status"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-300 ${
                  isActive ? "bg-blue-600 shadow-lg shadow-blue-200" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${
                    isActive ? "translate-x-8" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-4 px-8 py-6 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={handleCancel}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center gap-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
