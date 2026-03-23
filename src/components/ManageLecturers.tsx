import { useState } from "react";
import { Search, Plus, Edit2, Trash2 } from "lucide-react";
import AddLecturerModal from "./AddLecturerModal";
import EditLecturerModal from "./EditLecturerModal";

interface Lecturer {
  id: number;
  name: string;
  employeeId: string;
  department: string;
  email: string;
  status: "Active" | "On Leave";
  avatarColor: string;
}

export default function ManageLecturers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLecturer, setSelectedLecturer] = useState<Lecturer | null>(
    null
  );

  const lecturers: Lecturer[] = [
    {
      id: 1,
      name: "Dr. Michael Johnson",
      employeeId: "LEC-001",
      department: "Computer Science",
      email: "m.johnson@university.edu",
      status: "Active",
      avatarColor: "bg-blue-500",
    },
    {
      id: 2,
      name: "Prof. Sarah Williams",
      employeeId: "LEC-002",
      department: "Computer Science",
      email: "s.williams@university.edu",
      status: "Active",
      avatarColor: "bg-purple-500",
    },
    {
      id: 3,
      name: "Dr. James Anderson",
      employeeId: "LEC-003",
      department: "Mathematics",
      email: "j.anderson@university.edu",
      status: "On Leave",
      avatarColor: "bg-green-500",
    },
    {
      id: 4,
      name: "Dr. Emily Brown",
      employeeId: "LEC-004",
      department: "Computer Science",
      email: "e.brown@university.edu",
      status: "Active",
      avatarColor: "bg-orange-500",
    },
    {
      id: 5,
      name: "Prof. Robert Taylor",
      employeeId: "LEC-005",
      department: "Physics",
      email: "r.taylor@university.edu",
      status: "Active",
      avatarColor: "bg-pink-500",
    },
    {
      id: 6,
      name: "Dr. Lisa Martinez",
      employeeId: "LEC-006",
      department: "Computer Science",
      email: "l.martinez@university.edu",
      status: "Active",
      avatarColor: "bg-indigo-500",
    },
    {
      id: 7,
      name: "Dr. David Wilson",
      employeeId: "LEC-007",
      department: "Engineering",
      email: "d.wilson@university.edu",
      status: "On Leave",
      avatarColor: "bg-teal-500",
    },
    {
      id: 8,
      name: "Prof. Jennifer Davis",
      employeeId: "LEC-008",
      department: "Mathematics",
      email: "j.davis@university.edu",
      status: "Active",
      avatarColor: "bg-red-500",
    },
  ];

  const handleAddLecturer = () => {
    setIsModalOpen(true);
  };

  const handleEditLecturer = (lecturer: Lecturer) => {
    setSelectedLecturer(lecturer);
    setIsEditModalOpen(true);
  };

  const handleDeleteLecturer = (name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      alert(`Deleting lecturer: ${name}`);
    }
  };

  const handleToggleStatus = (name: string, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "On Leave" : "Active";
    alert(`Changing ${name} status to: ${newStatus}`);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Name or ID..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Filter Dropdown */}
          <div className="w-64">
            <select
              aria-label="Filter by Department"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="all">All Departments</option>
              <option value="cs">Computer Science</option>
              <option value="math">Mathematics</option>
              <option value="physics">Physics</option>
              <option value="engineering">Engineering</option>
            </select>
          </div>

          {/* Add New Lecturer Button */}
          <button
            onClick={handleAddLecturer}
            className="inline-flex items-center space-x-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span>Add New Lecturer</span>
          </button>
        </div>
      </div>

      {/* Lecturer List Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Lecturer Name
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Employee ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Department
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Email Address
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lecturers.map((lecturer) => (
                <tr
                  key={lecturer.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Lecturer Name with Avatar */}
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-10 h-10 ${lecturer.avatarColor} rounded-full flex items-center justify-center text-white font-medium text-sm`}
                      >
                        {getInitials(lecturer.name)}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {lecturer.name}
                      </span>
                    </div>
                  </td>

                  {/* Employee ID */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {lecturer.employeeId}
                    </span>
                  </td>

                  {/* Department */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">
                      {lecturer.department}
                    </span>
                  </td>

                  {/* Email Address */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {lecturer.email}
                    </span>
                  </td>

                  {/* Status with Toggle */}
                  <td className="px-6 py-4">
                    <button
                      onClick={() =>
                        handleToggleStatus(lecturer.name, lecturer.status)
                      }
                      className={`inline-flex px-3 py-1 text-sm font-medium rounded-full cursor-pointer transition-colors ${
                        lecturer.status === "Active"
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                      }`}
                    >
                      {lecturer.status}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditLecturer(lecturer)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Lecturer"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteLecturer(lecturer.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Lecturer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {lecturers.length} lecturers
          </div>
          <div className="text-sm text-gray-600">
            Total Academic Staff: {lecturers.length}
          </div>
        </div>
      </div>

      {/* Add Lecturer Modal */}
      <AddLecturerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(lecturerData) => {
          console.log("New lecturer data:", lecturerData);
          alert(`Lecturer ${lecturerData.fullName} registered successfully!`);
        }}
      />

      {/* Edit Lecturer Modal */}
      <EditLecturerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        lecturer={selectedLecturer}
        onSave={(lecturerData) => {
          console.log("Updated lecturer data:", lecturerData);
          alert(`Lecturer ${lecturerData.fullName} updated successfully!`);
        }}
      />
    </div>
  );
}
