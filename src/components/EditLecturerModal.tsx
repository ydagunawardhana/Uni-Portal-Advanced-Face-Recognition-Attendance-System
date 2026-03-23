import { useState } from "react";
import { X } from "lucide-react";

interface EditLecturerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lecturerData: any) => void;
  lecturer?: {
    name: string;
    employeeId: string;
    email: string;
    department: string;
    status: "Active" | "On Leave";
  } | null;
}

export default function EditLecturerModal({
  isOpen,
  onClose,
  onSave,
  lecturer,
}: EditLecturerModalProps) {
  const [fullName, setFullName] = useState(
    lecturer?.name || "Dr. Emily Watson"
  );
  const [email, setEmail] = useState(
    lecturer?.email || "emily.watson@uni.ac.lk"
  );
  const [department, setDepartment] = useState(
    lecturer?.department || "Computer Science"
  );
  const [isActive, setIsActive] = useState(lecturer?.status === "Active");
  const employeeId = lecturer?.employeeId || "LEC-001";

  if (!isOpen) return null;

  const handleSave = () => {
    // Validate required fields
    if (!fullName || !email || !department) {
      alert("Please fill in all required fields");
      return;
    }

    const updatedData = {
      fullName,
      employeeId,
      email,
      department,
      isActive,
    };

    onSave(updatedData);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleCancel}
      ></div>

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Edit Lecturer Details
          </h2>
          <button
            aria-label="Close"
            onClick={handleCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <div className="px-6 py-6 space-y-5">
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
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="lecturer@university.edu"
            />
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

          {/* Status Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Status
            </label>
            <div className="flex items-center justify-between bg-gray-50 px-5 py-4 rounded-lg border border-gray-200">
              <div>
                <p className="font-medium text-gray-900">Account Active</p>
                <p className="text-sm text-gray-600 mt-1">
                  {isActive
                    ? "Lecturer can access the system"
                    : "Lecturer account is deactivated"}
                </p>
              </div>
              <button
                aria-label="Toggle Status"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                  isActive ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    isActive ? "translate-x-8" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleCancel}
            className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
