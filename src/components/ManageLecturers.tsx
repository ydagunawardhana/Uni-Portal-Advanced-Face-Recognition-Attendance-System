import { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, Loader2, AlertTriangle, Trash, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import AddLecturerModal from "./AddLecturerModal";
import EditLecturerModal from "./EditLecturerModal";

const API_BASE = "http://localhost:8000";

interface Lecturer {
  id: number;
  name: string;
  employee_id: string;
  department: string;
  faculty?: string;
  email: string;
  assigned_subjects?: string;
  is_active: boolean;
  avatarColor?: string; // Optional local UI state
}

const universityData: Record<string, string[]> = {
  "Faculty of Computing": [
    "Department of Software Engineering & Computer Security",
    "Department of Computer and Data Science",
  ],
  "Faculty of Business": [
    "Department of Accounting & Finance",
    "Department of Business Management"
  ],
  "Faculty of Engineering": [
    "Department of Civil Engineering",
    "Department of Mechanical Engineering",
    "Department of Electronic & Electrical Engineering"
  ],
  "Faculty of Health and Life Science": [
    "Department of Health Sciences",
    "Department of Life Sciences"
  ]
};

const subjectsByDepartment: Record<string, string[]> = {
  "Department of Software Engineering & Computer Security": [
    "Programming",
    "Database Systems",
    "Software Engineering",
    "Cyber Security",
  ],
  "Department of Computer and Data Science": [
    "Data Science",
    "Artificial Intelligence",
    "Machine Learning",
    "Data Mining",
    "Mathematics",
  ],
  "Department of Accounting & Finance": [
    "Financial Accounting",
    "Corporate Finance",
    "Taxation",
    "Audit",
  ],
  "Department of Business Management": [
    "Marketing",
    "HR Management",
    "Business Strategy",
    "Economics",
  ],
  "Department of Civil Engineering": [
    "Structural Design",
    "Fluid Mechanics",
    "Geotechnical Engineering",
  ],
  "Department of Mechanical Engineering": [
    "Thermodynamics",
    "Robotics",
    "Manufacturing Systems",
  ],
  "Department of Electronic & Electrical Engineering": [
    "Circuits",
    "Signal Processing",
    "Power Systems",
  ],
  "Department of Health Sciences": [
    "Anatomy",
    "Pathology",
    "Nursing",
    "Biomedical Science",
    "Pharmacology",
  ],
  "Department of Life Sciences": [
    "Psychology",
    "Biology",
    "Chemistry",
    "Genetics",
  ],
};

export default function ManageLecturers() {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("All Faculties");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [subjectFilter, setSubjectFilter] = useState("All Subjects");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLecturer, setSelectedLecturer] = useState<Lecturer | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchLecturers();
  }, []);

  const parseApiError = (data: any) => {
    if (!data || !data.detail) return "An unexpected error occurred.";
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail.map((err: any) => err.msg).join(", ");
    }
    return JSON.stringify(data.detail);
  };

  const fetchLecturers = async () => {
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/admin/lecturers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Add random background colors for avatars since they aren't in DB
        const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500'];
        const mappedData = data.map((l: any, i: number) => ({
          ...l,
          avatarColor: colors[i % colors.length]
        }));
        setLecturers(mappedData);
      } else {
        const errorText = await res.text();
        console.error("Fetch lecturers failed:", errorText);
        toast.error("Failed to load lecturers list.");
      }
    } catch (error: any) {
      console.error("Fetch Error:", error);
      toast.error(error.message || "Failed to fetch lecturers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterLecturer = async (formData: any) => {
    // Frontend validation guard
    if (!formData.fullName?.trim() || !formData.employeeId?.trim() || !formData.email?.trim() || !formData.department?.trim()) {
      toast.error("Please fill in all required fields before saving.");
      return;
    }

    if (!formData.autoGeneratePassword) {
      toast.error("You must check the auto-generate password option to proceed.");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading("Registering lecturer...");
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("access_token");
      const payload = {
        name: formData.fullName,
        employee_id: formData.employeeId,
        email: formData.email,
        faculty: formData.faculty,
        department: formData.department,
        assigned_subjects: Array.isArray(formData.assignedSubjects) ? formData.assignedSubjects.join(", ") : (formData.assignedSubjects || ""),
        auto_generate_password: formData.autoGeneratePassword
      };

      const res = await fetch(`${API_BASE}/api/admin/lecturers`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("Lecturer registered successfully! Login credentials have been sent via email.", { 
          id: toastId,
          duration: 6000 
        });
        setIsModalOpen(false); // Move inside ok block
        fetchLecturers();
      } else {
        const data = await res.json().catch(() => ({ detail: "Malformed server error" }));
        toast.error(parseApiError(data), { id: toastId });
      }
    } catch (error: any) {
      console.error("Registration Error:", error);
      toast.error(error.message || "Network error", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateLecturer = async (formData: any) => {
    if (!selectedLecturer) return;
    setIsSaving(true);
    const toastId = toast.loading("Updating lecturer...");
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("access_token");
      const payload = {
        name: formData.fullName,
        email: formData.email,
        faculty: formData.faculty,
        department: formData.department,
        assigned_subjects: Array.isArray(formData.assignedSubjects) ? formData.assignedSubjects.join(", ") : (formData.assignedSubjects || ""),
        is_active: formData.isActive
      };

      const res = await fetch(`${API_BASE}/api/admin/lecturers/${selectedLecturer.id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("Profile updated successfully!", { id: toastId });
        setIsEditModalOpen(false); // Move inside ok block
        fetchLecturers();
      } else {
        const data = await res.json().catch(() => ({ detail: "Malformed server error" }));
        toast.error(parseApiError(data), { id: toastId });
      }
    } catch (error: any) {
      console.error("Update Error:", error);
      toast.error(error.message || "Network error", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedLecturer) return;
    setIsSaving(true);
    const toastId = toast.loading("Deleting lecturer...");
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/admin/lecturers/${selectedLecturer.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success("Lecturer deleted successfully!", { id: toastId });
        setLecturers(prev => prev.filter(l => l.id !== selectedLecturer.id));
        setIsDeleteModalOpen(false);
      } else {
        const data = await res.json().catch(() => ({ detail: "Delete operation failed" }));
        toast.error(parseApiError(data), { id: toastId });
      }
    } catch (error: any) {
      console.error("Delete Error:", error);
      toast.error(error.message || "Network error", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLecturer = () => {
    setIsModalOpen(true);
  };

  const handleEditLecturer = (lecturer: Lecturer) => {
    setSelectedLecturer(lecturer);
    setIsEditModalOpen(true);
  };

  const handleDeleteLecturer = (lecturer: Lecturer) => {
    setSelectedLecturer(lecturer);
    setIsDeleteModalOpen(true);
  };

  const handleToggleStatus = (lecturer: Lecturer) => {
    const updatedStatus = !lecturer.is_active;
    // We can call the PUT endpoint directly for a quick toggle if needed
    toast.promise(
      handleUpdateLecturerStatus(lecturer.id, updatedStatus),
      {
        loading: 'Updating status...',
        success: 'Status updated!',
        error: 'Failed to update status',
      }
    );
  };

  const handleUpdateLecturerStatus = async (id: number, active: boolean) => {
    const token = localStorage.getItem("adminToken") || localStorage.getItem("access_token");
    const res = await fetch(`${API_BASE}/api/admin/lecturers/${id}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        // We need the rest of the data, so let's find the lecturer
        ...lecturers.find(l => l.id === id),
        is_active: active,
        // Map fields used by PUT payload
        assigned_subjects: lecturers.find(l => l.id === id)?.assigned_subjects || ""
      })
    });
    if (!res.ok) throw new Error("Update failed");
    fetchLecturers();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredLecturers = lecturers.filter((lecturer) => {
    const matchesSearch =
      lecturer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lecturer.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFaculty =
      facultyFilter === "All Faculties" ||
      lecturer.faculty === facultyFilter;
    const matchesDepartment =
      departmentFilter === "All Departments" ||
      lecturer.department === departmentFilter;
    const matchesSubject =
      subjectFilter === "All Subjects" ||
      (lecturer.assigned_subjects &&
        lecturer.assigned_subjects.includes(subjectFilter));

    return matchesSearch && matchesFaculty && matchesDepartment && matchesSubject;
  });

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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Name or ID..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Faculty Filter */}
          <div className="relative w-48 font-light">
            <select
              aria-label="Filter by Faculty"
              value={facultyFilter}
              onChange={(e) => {
                setFacultyFilter(e.target.value);
                setDepartmentFilter("All Departments"); // Reset department cascade 
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white truncate appearance-none cursor-pointer"
            >
              <option value="All Faculties">All Faculties</option>
              {Object.keys(universityData).map(fac => (
                <option key={fac} value={fac}>{fac}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-800">
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>

          {/* Department Filter */}
          <div className="relative w-48 font-light">
            <select
              aria-label="Filter by Department"
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setSubjectFilter("All Subjects"); // Reset subject cascade
              }}
              disabled={facultyFilter !== "All Faculties" && !universityData[facultyFilter]}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white truncate disabled:bg-gray-100 disabled:text-gray-400 appearance-none cursor-pointer"
            >
              <option value="All Departments">All Departments</option>
              {facultyFilter === "All Faculties" 
                ? Object.values(universityData).flat().map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))
                : (universityData[facultyFilter] || []).map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))
              }
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-800">
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>

          {/* Subject Filter */}
          <div className="relative w-48 font-light">
            <select
              aria-label="Filter by Subject"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              disabled={departmentFilter !== "All Departments" && !subjectsByDepartment[departmentFilter]}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white truncate disabled:bg-gray-100 disabled:text-gray-400 appearance-none cursor-pointer"
            >
              <option value="All Subjects">All Subjects</option>
              {departmentFilter === "All Departments"
                ? Array.from(new Set(Object.values(subjectsByDepartment).flat())).map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))
                : (subjectsByDepartment[departmentFilter] || []).map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))
              }
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-800">
              <ChevronDown className="w-5 h-5" />
            </div>
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
                  Faculty
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
              {filteredLecturers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Search className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-lg font-medium">No lecturers found matching your filters</p>
                      <p className="text-sm">Try adjusting your search terms or filters.</p>
                      <button 
                        onClick={() => {
                          setSearchTerm("");
                          setFacultyFilter("All Faculties");
                          setDepartmentFilter("All Departments");
                          setSubjectFilter("All Subjects");
                        }}
                        className="mt-4 text-blue-600 font-bold hover:underline"
                      >
                        Clear all filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLecturers.map((lecturer) => (
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

                  {/* Faculty */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900 font-medium whitespace-nowrap">
                      {lecturer.faculty || "Not Assigned"}
                    </span>
                  </td>

                  {/* Employee ID */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 font-mono">
                      {lecturer.employee_id}
                    </span>
                  </td>

                  {/* Department */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900 font-medium">
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
                      onClick={() => handleToggleStatus(lecturer)}
                      className={`inline-flex px-3 py-1 text-sm font-bold rounded-full cursor-pointer transition-all ${
                        lecturer.is_active
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-red-100 text-red-700 hover:bg-red-200"
                      }`}
                    >
                      {lecturer.is_active ? "Active" : "Inactive"}
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
                        onClick={() => handleDeleteLecturer(lecturer)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Lecturer"
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

        {/* Table Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredLecturers.length} lecturers
          </div>
          <div className="text-sm text-gray-600">
            Total Academic Staff: {lecturers.length}
          </div>
        </div>
      </div>

      {/* Add Lecturer Modal */}
      <AddLecturerModal
        key={isModalOpen ? 'open' : 'closed'}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleRegisterLecturer}
        isSaving={isSaving}
      />

      {/* Edit Lecturer Modal */}
      <EditLecturerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        isSaving={isSaving}
        lecturer={selectedLecturer ? {
          name: selectedLecturer.name,
          employeeId: selectedLecturer.employee_id,
          email: selectedLecturer.email,
          faculty: selectedLecturer.faculty || "",
          department: selectedLecturer.department,
          assigned_subjects: selectedLecturer.assigned_subjects || "",
          status: selectedLecturer.is_active ? "Active" : "On Leave"
        } : null}
        onSave={handleUpdateLecturer}
      />

      {/* Custom Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedLecturer && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setIsDeleteModalOpen(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative z-[1000] overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="p-8 flex flex-col items-center text-center">
              {/* Warning Icon Cluster */}
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-3">Remove Lecturer Access?</h3>
              <p className="text-gray-600 mb-8 px-2">
                Are you sure you want to delete <span className="font-bold text-gray-900">{selectedLecturer.name}</span>? 
                This will permanently remove their academic profile and revoke all portal access rights.
              </p>

              <div className="grid grid-cols-2 gap-4 w-full text-center">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isSaving}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  disabled={isSaving}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash className="w-4 h-4" />}
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
