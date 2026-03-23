import { useState } from "react";
import { X, Lock } from "lucide-react";

interface Subject {
  id: number;
  name: string;
  code: string;
  schedule: string;
  studentCount: number;
  color: string;
}

interface EditSubjectModalProps {
  subject: Subject;
  onClose: () => void;
  onSave: (subject: Subject) => void;
  onRemove: (subjectId: number) => void;
}

export default function EditSubjectModal({
  subject,
  onClose,
  onSave,
  onRemove,
}: EditSubjectModalProps) {
  const [formData, setFormData] = useState({
    name: subject.name,
    code: subject.code,
    day: "Monday",
    time: "09:00 AM",
    description: "Bring your laptops for practical sessions",
  });

  const handleSave = () => {
    const updatedSubject = {
      ...subject,
      name: formData.name,
      code: formData.code,
      schedule: `${formData.day} - ${formData.time}`,
    };
    onSave(updatedSubject);
    onClose();
  };

  const handleRemove = () => {
    if (
      confirm(
        "Are you sure you want to remove this subject? This action cannot be undone."
      )
    ) {
      onRemove(subject.id);
      onClose();
    }
  };

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const times = [
    "08:00 AM",
    "08:30 AM",
    "09:00 AM",
    "09:30 AM",
    "10:00 AM",
    "10:30 AM",
    "11:00 AM",
    "11:30 AM",
    "12:00 PM",
    "12:30 PM",
    "01:00 PM",
    "01:30 PM",
    "02:00 PM",
    "02:30 PM",
    "03:00 PM",
    "03:30 PM",
    "04:00 PM",
    "04:30 PM",
    "05:00 PM",
    "05:30 PM",
    "06:00 PM",
  ];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              Edit Subject Details
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form Fields */}
          <div className="px-6 py-6 space-y-5">
            {/* Read-Only Section Header */}
            <div className="pb-3 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" />
                Basic Information (Locked)
              </p>
            </div>

            {/* Subject Name (Read-Only) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-400" />
                Subject Name
              </label>
              <input
                type="text"
                aria-label="Subject Name"
                value={formData.name}
                readOnly
                disabled
                className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 cursor-not-allowed"
              />
            </div>

            {/* Subject Code (Read-Only) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-400" />
                Subject Code
              </label>
              <input
                type="text"
                aria-label="Subject Code"
                value={formData.code}
                readOnly
                disabled
                className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 cursor-not-allowed"
              />
            </div>

            {/* Editable Section Header */}
            <div className="pb-3 border-b border-gray-200 pt-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Editable Information
              </p>
            </div>

            {/* Class Schedule (Editable) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Class Schedule
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Day Dropdown */}
                <select
                  aria-label="Select Session Day"
                  value={formData.day}
                  onChange={(e) =>
                    setFormData({ ...formData, day: e.target.value })
                  }
                  className="px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-gray-900"
                >
                  {days.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>

                {/* Time Dropdown */}
                <select
                  aria-label="Select Session Time"
                  value={formData.time}
                  onChange={(e) =>
                    setFormData({ ...formData, time: e.target.value })
                  }
                  className="px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-gray-900"
                >
                  {times.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Current: {formData.day}, {formData.time}
              </p>
            </div>

            {/* Description/Note (Editable) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description / Note for Students
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                placeholder="Add notes for students (e.g., 'Bring your laptops')"
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none text-gray-900"
              />
              <p className="text-xs text-gray-500 mt-1">
                This note will be visible to all students enrolled in this
                subject.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <button
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
