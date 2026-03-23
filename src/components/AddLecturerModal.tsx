import { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';

interface AddLecturerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lecturerData: any) => void;
}

export default function AddLecturerModal({ isOpen, onClose, onSave }: AddLecturerModalProps) {
  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([]);
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Available subjects list
  const availableSubjects = [
    'Database Systems',
    'Web Development',
    'Data Structures',
    'Computer Networks',
    'Software Engineering',
    'Operating Systems',
    'Artificial Intelligence',
    'Machine Learning',
    'Mobile App Development',
    'Cybersecurity',
    'Cloud Computing',
    'Algorithm Design',
    'Object-Oriented Programming',
    'Discrete Mathematics',
    'Computer Architecture',
  ];

  if (!isOpen) return null;

  const handleRemoveSubject = (subject: string) => {
    setAssignedSubjects(assignedSubjects.filter(s => s !== subject));
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

  const handleSave = () => {
    // Validate required fields
    if (!fullName || !employeeId || !email || !department) {
      alert('Please fill in all required fields');
      return;
    }

    const lecturerData = {
      fullName,
      employeeId,
      email,
      department,
      assignedSubjects,
      autoGeneratePassword,
    };

    onSave(lecturerData);
    handleCancel();
  };

  const handleCancel = () => {
    // Reset form
    setFullName('');
    setEmployeeId('');
    setEmail('');
    setDepartment('');
    setAssignedSubjects([]);
    setAutoGeneratePassword(false);
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
          <h2 className="text-2xl font-bold text-gray-900">Register New Lecturer</h2>
          <button
            onClick={handleCancel}
            title="Close modal"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <div className="px-6 py-6 space-y-5">
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
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

          {/* Employee ID */}
          <div>
            <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-2">
              Employee ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="employeeId"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="e.g., LEC-009"
            />
          </div>

          {/* Email Address */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
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
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
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
              <option value="Business Administration">Business Administration</option>
              <option value="Architecture">Architecture</option>
            </select>
          </div>

          {/* Assigned Subjects - Multi-Select Dropdown */}
          <div className="relative">
            <label htmlFor="subjects" className="block text-sm font-medium text-gray-700 mb-2">
              Assigned Subjects
            </label>
            
            {/* Tag Input Field with Dropdown */}
            <div 
              className="w-full min-h-[42px] px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent cursor-pointer bg-white"
              onClick={toggleDropdown}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  {/* Subject Tags Inside Input */}
                  {assignedSubjects.length > 0 ? (
                    assignedSubjects.map((subject, index) => (
                      <div
                        key={index}
                        className="inline-flex items-center space-x-1.5 bg-blue-100 text-blue-700 px-2.5 py-1 rounded text-sm font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>{subject}</span>
                        <button
                          title={`Remove ${subject}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSubject(subject);
                          }}
                          className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-gray-400 text-sm">Select subjects from list...</span>
                  )}
                </div>
                
                {/* Chevron Icon */}
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
              </div>
            </div>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {availableSubjects
                  .filter(subject => !assignedSubjects.includes(subject))
                  .map((subject) => (
                    <div
                      key={subject}
                      className="px-4 py-2.5 cursor-pointer hover:bg-blue-50 transition-colors text-sm text-gray-700 border-b border-gray-100 last:border-b-0"
                      onClick={() => handleSelectSubject(subject)}
                    >
                      {subject}
                    </div>
                  ))}
                {availableSubjects.filter(subject => !assignedSubjects.includes(subject)).length === 0 && (
                  <div className="px-4 py-2.5 text-sm text-gray-400 text-center">
                    All subjects have been selected
                  </div>
                )}
              </div>
            )}
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
              <label htmlFor="autoGeneratePassword" className="ml-3 text-sm text-gray-700 cursor-pointer">
                Auto-generate password and send login credentials via email to the lecturer.
              </label>
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
            Save Lecturer
          </button>
        </div>
      </div>
    </div>
  );
}