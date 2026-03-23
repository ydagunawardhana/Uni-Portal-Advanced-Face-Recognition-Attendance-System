import { useState } from "react";
import { Search, Plus, Calendar, Users, BarChart3, Edit2 } from "lucide-react";
import EditSubjectModal from "./EditSubjectModal";
import AddSubjectModal from "./AddSubjectModal";
import AttendanceReports from "./AttendanceReports";

interface Subject {
  id: number;
  name: string;
  code: string;
  schedule: string;
  studentCount: number;
  color: string;
}

export default function LecturerMySubjects() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const subjects: Subject[] = [
    {
      id: 1,
      name: "Database Management Systems",
      code: "CS-101",
      schedule: "Mon, Wed, Fri - 09:00 AM",
      studentCount: 45,
      color: "bg-blue-500",
    },
    {
      id: 2,
      name: "Data Structures & Algorithms",
      code: "CS-201",
      schedule: "Tue, Thu - 11:00 AM",
      studentCount: 38,
      color: "bg-purple-500",
    },
    {
      id: 3,
      name: "Artificial Intelligence & Machine Learning",
      code: "CS-301",
      schedule: "Mon, Wed - 02:00 PM",
      studentCount: 42,
      color: "bg-green-500",
    },
    {
      id: 4,
      name: "Software Engineering Principles",
      code: "CS-202",
      schedule: "Tue, Thu - 03:30 PM",
      studentCount: 50,
      color: "bg-orange-500",
    },
    {
      id: 5,
      name: "Web Development Technologies",
      code: "CS-102",
      schedule: "Mon, Fri - 01:00 PM",
      studentCount: 35,
      color: "bg-pink-500",
    },
    {
      id: 6,
      name: "Computer Networks",
      code: "CS-203",
      schedule: "Wed, Fri - 10:30 AM",
      studentCount: 40,
      color: "bg-indigo-500",
    },
  ];

  const handleAddSubject = () => {
    setShowAddModal(true);
  };

  const handleViewAttendance = (subjectName: string) => {
    const subject = subjects.find((s) => s.name === subjectName);
    if (subject) {
      setSelectedSubject(subject);
    }
  };

  const handleEditSubject = (subjectName: string) => {
    const subject = subjects.find((s) => s.name === subjectName);
    if (subject) {
      setEditingSubject(subject);
    }
  };

  const handleSaveSubject = (updatedSubject: Subject) => {
    alert(`Subject "${updatedSubject.name}" has been updated successfully!`);
    console.log("Updated subject:", updatedSubject);
  };

  const handleCreateSubject = (newSubject: {
    name: string;
    code: string;
    day: string;
    time: string;
    department: string;
  }) => {
    alert(`Subject "${newSubject.name}" has been created successfully!`);
    console.log("New subject:", newSubject);
  };

  const handleRemoveSubject = (subjectId: number) => {
    alert(`Subject has been removed successfully!`);
    console.log("Removed subject ID:", subjectId);
  };

  {
    // If a subject is selected, show the attendance record screen
    if (selectedSubject) {
      return (
        <AttendanceReports
          subject={selectedSubject}
          onBack={() => setSelectedSubject(null)}
        />
      );
    }
  }

  // Otherwise, show the subjects grid
  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subjects..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Subject Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject) => (
          <div
            key={subject.id}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-200"
          >
            {/* Card Header with Color Bar */}
            <div className={`${subject.color} h-2`}></div>

            {/* Card Content */}
            <div className="p-6">
              {/* Subject Name and Code */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {subject.name}
                </h3>
                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                  {subject.code}
                </span>
              </div>

              {/* Schedule Information */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-3 text-gray-600">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <span className="text-sm">{subject.schedule}</span>
                </div>

                {/* Student Count */}
                <div className="flex items-center space-x-3 text-gray-600">
                  <Users className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium">
                    {subject.studentCount} Students Enrolled
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleViewAttendance(subject.name)}
                  className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>View Attendance</span>
                </button>

                <button
                  onClick={() => handleEditSubject(subject.name)}
                  className="p-2 border-2 border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                  title="Edit Subject"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State (shown when no subjects match search) */}
      {subjects.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No subjects found
            </h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search or add a new subject to get started.
            </p>
            <button
              onClick={handleAddSubject}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Add New Subject</span>
            </button>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {editingSubject && (
        <EditSubjectModal
          subject={editingSubject}
          onClose={() => setEditingSubject(null)}
          onSave={handleSaveSubject}
          onRemove={handleRemoveSubject}
        />
      )}

      {/* Add Subject Modal */}
      {showAddModal && (
        <AddSubjectModal
          onClose={() => setShowAddModal(false)}
          onCreate={handleCreateSubject}
        />
      )}
    </div>
  );
}
