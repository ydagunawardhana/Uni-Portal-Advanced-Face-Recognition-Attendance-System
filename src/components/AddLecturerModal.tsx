import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../config";

interface AddLecturerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lecturerData: any) => void;
  isSaving?: boolean;
}

export default function AddLecturerModal({
  isOpen,
  onClose,
  onSave,
  isSaving,
}: AddLecturerModalProps) {
  const [fullName, setFullName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState("");
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([]);
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [availableModules, setAvailableModules] = useState<
    { module_code: string; module_name: string }[]
  >([]);
  const [isLoadingModules, setIsLoadingModules] = useState(false);

  const universityData: Record<string, string[]> = {
    "Faculty of Computing": [
      "Department of Software Engineering & Computer Security",
      "Department of Computer and Data Science",
    ],
    "Faculty of Business": [
      "Department of Accounting & Finance",
      "Department of Management",
      "Department of Marketing and Tourism",
      "Department of Operations and Logistics",
      "Department of Legal Studies",
    ],
    "Faculty of Engineering": [
      "Department of Mechatronic and Industrial Engineering",
      "Department of Design Studies",
      "Department of Electrical, Electronic & Systems Engineering",
    ],
    "Faculty of Health and Life Science": [
      "Department of Health Sciences",
      "Department of Life Sciences",
    ],
  };

  useEffect(() => {
    if (department) {
      const fetchModules = async () => {
        setIsLoadingModules(true);
        try {
          const res = await fetch(
            `${API_BASE_URL}/api/modules/?department=${encodeURIComponent(
              department
            )}`
          );
          if (res.ok) {
            const data = await res.json();
            setAvailableModules(data);
          }
        } catch (error) {
          console.error("Failed to fetch modules:", error);
        } finally {
          setIsLoadingModules(false);
        }
      };
      fetchModules();
    } else {
      setAvailableModules([]);
    }
  }, [department]);

  if (!isOpen) return null;

  const handleRemoveSubject = (subject: string) => {
    setAssignedSubjects(assignedSubjects.filter((s) => s !== subject));
  };

  const handleSelectSubject = (subject: string) => {
    if (!assignedSubjects.includes(subject)) {
      setAssignedSubjects([...assignedSubjects, subject]);
    }
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const autoEmail = employeeId
    ? `${employeeId.toLowerCase().replace(/\s+/g, "")}@university.edu`
    : "";

  const handleSave = () => {
    // Validate required fields
    if (!fullName || !employeeId || !personalEmail || !faculty || !department) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const lecturerData = {
      fullName,
      employeeId,
      email: autoEmail,
      personal_email: personalEmail,
      faculty,
      department,
      assignedSubjects,
      autoGeneratePassword,
    };

    onSave(lecturerData);
  };

  const handleCancel = () => {
    // Reset form
    setFullName("");
    setEmployeeId("");
    setPersonalEmail("");
    setFaculty("");
    setDepartment("");
    setAssignedSubjects([]);
    setAutoGeneratePassword(false);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with Blur Effect */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 ease-out"
        onClick={handleCancel}
      ></div>

      {/* Modal Card */}
      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl mx-auto max-h-[90vh] overflow-hidden flex flex-col transform transition-all animate-in fade-in zoom-in-95 duration-200 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Register New Lecturer
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Enroll academic staff into the university portal.
            </p>
          </div>
          <button
            onClick={handleCancel}
            title="Close modal"
            className="p-2 text-gray-400 cursor-pointer hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <div className="px-6 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
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
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Enter lecturer's full name"
            />
          </div>

          {/* Employee ID */}
          <div>
            <label
              htmlFor="employeeId"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Employee ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="employeeId"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="e.g. LEC001"
            />
          </div>

          {/* Personal Email Address */}
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
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="e.g. john.doe@gmail.com"
            />
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
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold bg-gray-100 text-gray-900 font-medium outline-none cursor-not-allowed"
              placeholder="lecturer@university.edu"
            />
          </div>

          {/* Faculty & Department Cascade Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Faculty <span className="text-red-500">*</span>
              </label>
              <select
                value={faculty}
                onChange={(e) => {
                  setFaculty(e.target.value);
                  setDepartment("");
                  setAssignedSubjects([]); // Flush mismatch constraints
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Select Faculty</option>
                {Object.keys(universityData).map((fac) => (
                  <option key={fac} value={fac}>
                    {fac}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setAssignedSubjects([]); // Flush on cascade hop
                }}
                disabled={!faculty}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <option value="">Select Department</option>
                {faculty &&
                  universityData[faculty].map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Assigned Subjects - Badge Multi-select */}
          <div>
            <label
              htmlFor="subjects"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Assigned Subjects
            </label>

            {/* Selected Subjects Badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              {assignedSubjects.map((subject, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full border border-blue-200 group transition-all hover:bg-blue-100"
                >
                  {subject}
                  <button
                    type="button"
                    onClick={() => handleRemoveSubject(subject)}
                    className="p-0.5 hover:bg-blue-200 rounded-full transition-colors text-blue-400 hover:text-blue-600"
                    title={`Remove ${subject}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              {assignedSubjects.length === 0 && (
                <p className="text-sm text-gray-400 italic">
                  No subjects selected yet.
                </p>
              )}
            </div>

            {/* Subject Selector */}
            <div className="relative">
              <select
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white appearance-none cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                value=""
                disabled={!department}
                onChange={(e) => {
                  if (e.target.value) {
                    handleSelectSubject(e.target.value);
                  }
                }}
              >
                <option value="" disabled>
                  {department
                    ? isLoadingModules
                      ? "Loading modules..."
                      : "Select a subject to add..."
                    : "Select a Department first"}
                </option>
                {availableModules
                  .filter((mod) => !assignedSubjects.includes(mod.module_code))
                  .map((mod) => (
                    <option key={mod.module_code} value={mod.module_code}>
                      {mod.module_code} - {mod.module_name}
                    </option>
                  ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                <ChevronDown className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Auto Generate Password Checkbox */}
          <div className="pt-2">
            <div className="flex items-start">
              <input
                type="checkbox"
                id="autoGeneratePassword"
                checked={autoGeneratePassword}
                onChange={(e) => setAutoGeneratePassword(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
              />
              <label
                htmlFor="autoGeneratePassword"
                className="ml-3 text-sm text-gray-700 cursor-pointer"
              >
                Auto-generate password and send login credentials via email to
                the lecturer. <span className="text-red-500">*</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleCancel}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg cursor-pointer font-medium hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg cursor-pointer font-medium hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving ? "Saving..." : "Save Lecturer"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
