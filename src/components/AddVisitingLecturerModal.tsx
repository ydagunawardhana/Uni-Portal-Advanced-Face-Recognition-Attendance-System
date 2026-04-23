import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, UserPlus, GraduationCap, Building2 } from "lucide-react";

interface AddVisitingLecturerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; faculty: string; department: string }) => void;
  isSaving: boolean;
}

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

export default function AddVisitingLecturerModal({
  isOpen,
  onClose,
  onSave,
  isSaving,
}: AddVisitingLecturerModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    faculty: "",
    department: "",
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />
      
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden transform transition-all animate-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
          <div className="flex items-center gap-2 text-blue-700">
            <UserPlus className="w-6 h-6" />
            <h3 className="font-bold text-xl">Add Visiting Lecturer</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100  cursor-pointer rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserPlus className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Dr. Jane Smith"
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Faculty */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Faculty
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <GraduationCap className="w-5 h-5 text-gray-400" />
                </div>
                <select
                  required
                  value={formData.faculty}
                  onChange={(e) => setFormData({ ...formData, faculty: e.target.value, department: "" })}
                  className="w-full pl-10 pr-4 py-2 cursor-pointer border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-all appearance-none bg-white"
                >
                  <option value="">Select Faculty</option>
                  {Object.keys(universityData).map((fac) => (
                    <option key={fac} value={fac}>{fac}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Department
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="w-5 h-5 text-gray-400" />
                </div>
                <select
                  required
                  disabled={!formData.faculty}
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 cursor-pointer border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-all appearance-none bg-white disabled:bg-gray-50"
                >
                  <option value="">Select Department</option>
                  {formData.faculty && universityData[formData.faculty]?.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 border-2 border-gray-200 cursor-pointer text-gray-600 rounded-xl font-bold hover:bg-gray-100 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white cursor-pointer rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Visiting Lecturer"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
