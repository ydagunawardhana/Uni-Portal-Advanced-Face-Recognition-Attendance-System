import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertTriangle,
  Trash,
  ChevronDown,
  BookOpen,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = "http://localhost:8000";

interface Module {
  id: number;
  module_code: string;
  module_name: string;
  faculty: string;
  department: string;
  level?: string;
  degree?: string;
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

const degreeMapping: Record<string, string[]> = {
  "Department of Software Engineering & Computer Security": [
    "BSc (Hons) in Software Engineering",
    "BSc (Hons) in Computer Networks",
    "BSc (Hons) Computer Security",
    "BSc (Hons) Technology Management",
    "Bachelor of Information Technology (Major in Cyber Security)",
    "Foundation Programme for Bachelor's Degree",
  ],
  "Department of Computer and Data Science": [
    "BSc (Hons) in Computer Science",
    "BSc (Hons) in Data Science",
    "BSc (Hons) Artificial Intelligence",
    "BSc in Management Information Systems (Special)",
  ],
  "Department of Management": [
    "BM (Honors) in Business Analytics",
    "BM (Honors) in Applied Economics",
    "BSc in Business Management (Industrial Management) (Special)",
    "BSc in Business Management (Project Management) (Special)",
    "BSc in Business Management (Human Resource Management) (Special)",
    "BSc (Hons) International Management and Business",
    "BSc (Hons) Business Communication",
    "BA in Business Communication",
    "BSc in Multimedia",
    "Bachelor of Business",
    "Bachelor of Science in Business Administration (BSBA)",
    "Foundation Programme for Bachelor's Degree",
  ],
  "Department of Accounting and Finance": [
    "BM (Hons) in Accounting and Finance",
    "BSc (Hons) Accounting and Finance",
  ],
  "Department of Marketing and Tourism": [
    "BM (Hons) in Marketing Management",
    "BBM (Hons) Tourism, Hospitality & Events",
    "BSc (Hons) Marketing Management",
    "BSc (Hons) Events, Tourism and Hospitality Management",
  ],
  "Department of Operations and Logistics": [
    "BSc in Business Management (Logistics Management) (Special)",
    "BSc (Hons) Operations and Logistics Management",
    "Bachelor of Business: Management and Innovation & Supply Chain and Logistics Management",
  ],
  "Department of Legal Studies": [
    "Bachelor of Laws (Honours)",
    "BM (Hons) in Law and Business Studies",
    "BM (Hons.) in Law and International Trade",
    "BM (Hons) in Law and E-Commerce",
    "LLB (Hons) Law",
  ],
  "Department of Electrical, Electronic & Systems Engineering": [
    "Bachelor of Science of Engineering Honours in Electrical and Electronic Engineering",
    "Bachelor of Science of Engineering Honours in Computer Engineering",
    "BEng (Hons) Electrical, Electronics, and Communication Engineering",
    "Foundation Programme for Bachelor's Degree",
  ],
  "Department of Mechatronic and Industrial Engineering": [
    "Bachelor of Science of Engineering Honours in Mechatronic Engineering",
    "BEng (Hons) Mechanical and Mechatronics",
    "BEng (Hons) Robotics and Automation Engineering",
    "BEng (Hons) Civil and Structural Engineering",
    "BSc (Hons) Quantity Surveying",
  ],
  "Department of Design Studies": [
    "Bachelor of Interior Design",
    "BA (Hons) in Interior Design",
  ],
  "Department of Health Sciences": [
    "BSc (Hons) in Biomedical Science",
    "BSc (Hons) Biomedical Science",
    "BSc (Honours) in Pharmaceutical Science",
    "BSc (Hons) Nutrition and Health",
    "BSc (Hons) Nursing",
    "Foundation Programme for Bachelor's Degree",
  ],
  "Department of Life Sciences": ["BSc (Hons) Psychology"],
};

export default function ManageModules() {
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("All Faculties");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API_BASE}/api/admin/modules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setModules(data);
      } else {
        toast.error("Failed to load modules list.");
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error("Failed to fetch modules");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveModule = async (payload: any, isEdit: boolean) => {
    setIsSaving(true);
    const toastId = toast.loading(
      isEdit ? "Updating module..." : "Registering modules...",
    );
    try {
      // Artificial delay for UX feedback
      await new Promise((resolve) => setTimeout(resolve, 800));

      const token = localStorage.getItem("adminToken");
      const url = isEdit
        ? `${API_BASE}/api/admin/modules/${selectedModule?.id}`
        : `${API_BASE}/api/admin/modules`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(
          isEdit
            ? "Module updated successfully!"
            : data.message || "Modules registered successfully!",
          { id: toastId },
        );
        setIsModalOpen(false);
        setIsEditModalOpen(false);
        fetchModules();
      } else {
        toast.error(data.detail || "Operation failed", { id: toastId });
      }
    } catch (error) {
      toast.error("Network error. Please try again.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteModule = async () => {
    if (!selectedModule) return;
    setIsSaving(true);
    const toastId = toast.loading("Deleting module...");
    try {
      // Artificial delay for UX feedback
      await new Promise((resolve) => setTimeout(resolve, 800));

      const token = localStorage.getItem("adminToken");
      const res = await fetch(
        `${API_BASE}/api/admin/modules/${selectedModule.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        toast.success("Module deleted successfully!", { id: toastId });
        setModules((prev) => prev.filter((m) => m.id !== selectedModule.id));
        setIsDeleteModalOpen(false);
      } else {
        toast.error("Delete operation failed", { id: toastId });
      }
    } catch (error) {
      toast.error("Network error", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredModules = modules.filter((mod) => {
    const matchesSearch =
      mod.module_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mod.module_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFaculty =
      facultyFilter === "All Faculties" || mod.faculty === facultyFilter;
    const matchesDepartment =
      departmentFilter === "All Departments" ||
      mod.department === departmentFilter;

    return matchesSearch && matchesFaculty && matchesDepartment;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {/* Control Bar */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Code or Name..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex gap-4">
            <select
              value={facultyFilter}
              onChange={(e) => {
                setFacultyFilter(e.target.value);
                setDepartmentFilter("All Departments");
              }}
              className="px-4 py-2.5 border cursor-pointer border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="All Faculties">All Faculties</option>
              {Object.keys(universityData).map((fac) => (
                <option key={fac} value={fac}>
                  {fac}
                </option>
              ))}
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              disabled={facultyFilter === "All Faculties"}
              className="px-4 py-2.5 border cursor-pointer border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-50"
            >
              <option value="All Departments">All Departments</option>
              {facultyFilter !== "All Faculties" &&
                universityData[facultyFilter]?.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
            </select>

            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center cursor-pointer space-x-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md"
            >
              <Plus className="w-5 h-5" />
              <span>Add Modules</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modules Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Module Code
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Module Name
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Faculty
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Department
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Degree
                </th>
                <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900">
                  Level
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                  </td>
                </tr>
              ) : filteredModules.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No modules found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredModules.map((mod) => (
                  <tr
                    key={mod.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-blue-600 font-bold">
                      {mod.module_code}
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-medium">
                      {mod.module_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                      {mod.faculty}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {mod.department}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {mod.degree || "N/A"}
                    </td>
                    <td className="px-8 py-4 text-sm font-bold text-gray-500">
                      {mod.level || "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedModule(mod);
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedModule(mod);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
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

      {/* Add Modal */}
      {isModalOpen && (
        <AddModuleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveModule}
          isSaving={isSaving}
        />
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedModule && (
        <EditModuleModal
          isOpen={isEditModalOpen}
          module={selectedModule}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedModule(null);
          }}
          onSave={handleSaveModule}
          isSaving={isSaving}
        />
      )}

      {/* Delete Confirmation */}
      {isDeleteModalOpen &&
        selectedModule &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 ease-out"
              onClick={() => setIsDeleteModalOpen(false)}
            ></div>
            <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md p-8 text-center animate-in fade-in zoom-in-95 duration-200 ease-out">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Delete Module?
              </h3>
              <p className="text-gray-600 mb-8">
                Are you sure you want to remove{" "}
                <span className="font-bold">
                  {selectedModule.module_code} {selectedModule.module_name}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-bold hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteModule}
                  disabled={isSaving}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:bg-red-400 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function AddModuleModal({ isOpen, onClose, onSave, isSaving }: any) {
  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState("");
  const [selectedDegrees, setSelectedDegrees] = useState<string[]>([]);
  const [level, setLevel] = useState("");

  // List of modules for bulk add
  const [modulesList, setModulesList] = useState([{ code: "", name: "" }]);

  const handleAddRow = () => {
    setModulesList([...modulesList, { code: "", name: "" }]);
  };

  const handleRemoveRow = (index: number) => {
    if (modulesList.length > 1) {
      setModulesList(modulesList.filter((_, i) => i !== index));
    }
  };

  const handleRowChange = (
    index: number,
    field: "code" | "name",
    value: string,
  ) => {
    const updatedList = [...modulesList];
    updatedList[index][field] = value;
    setModulesList(updatedList);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!faculty || !department || selectedDegrees.length === 0 || !level) {
      toast.error("Please fill in all general academic fields.");
      return;
    }

    const validModules = modulesList.filter(
      (m) => m.code.trim() && m.name.trim(),
    );
    if (validModules.length === 0) {
      toast.error("Please add at least one valid module (Code + Name).");
      return;
    }

    // For bulk add, we send an array of all modules with common metadata
    const payload = validModules.map((m) => ({
      module_code: m.code,
      module_name: m.name,
      faculty,
      department,
      level,
      degree: selectedDegrees.join(", "),
    }));
    onSave(payload, false);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 ease-out" 
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 ease-out">
        {/* Header */}
        <div className="px-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 className="text-2xl font-bold text-gray-900 pt-6">
            Register Modules
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 hover:text-gray-800 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          {/* Scrollable Body */}
          <div className="p-6 overflow-y-auto space-y-6">
            {/* 1. Common Metadata Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-blue-50/30 p-5 rounded-2xl border-2 border-blue-100/50">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Faculty Selection <span className="text-red-500">*</span>
                </label>
                <select
                  value={faculty}
                  onChange={(e) => {
                    setFaculty(e.target.value);
                    setDepartment("");
                    setSelectedDegrees([]);
                  }}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                >
                  <option value="">Choose a Faculty</option>
                  {Object.keys(universityData).map((fac) => (
                    <option key={fac} value={fac}>
                      {fac}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Academic Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    setSelectedDegrees([]);
                  }}
                  disabled={!faculty}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 cursor-pointer"
                >
                  <option value="">Select Department</option>
                  {faculty &&
                    universityData[faculty]?.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                </select>
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Target Degrees <span className="text-red-500">*</span>
                </label>
                <div className="border border-gray-300 rounded-xl text-sm font-semibold p-3 max-h-48 overflow-y-auto bg-white transition-all focus-within:ring-2 focus-within:ring-blue-500 shadow-inner">
                  {!department ? (
                    <span className="text-sm text-gray-400">
                      Select Department first
                    </span>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                      {(
                        degreeMapping[department] || ["BSc (Hons) Generic"]
                      ).map((deg) => (
                        <label
                          key={deg}
                          className="flex items-center space-x-2 p-1.5 hover:bg-gray-50 rounded-xl cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            value={deg}
                            checked={selectedDegrees.includes(deg)}
                            onChange={(e) => {
                              if (e.target.checked)
                                setSelectedDegrees([...selectedDegrees, deg]);
                              else
                                setSelectedDegrees(
                                  selectedDegrees.filter((d) => d !== deg),
                                );
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors font-medium">
                            {deg}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Academic Level / Year <span className="text-red-500">*</span>
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                >
                  <option value="">Select Level</option>
                  <option value="Year 1 - Semester 1">
                    Year 1 - Semester 1
                  </option>
                  <option value="Year 1 - Semester 2">
                    Year 1 - Semester 2
                  </option>
                  <option value="Year 2 - Semester 1">
                    Year 2 - Semester 1
                  </option>
                  <option value="Year 2 - Semester 2">
                    Year 2 - Semester 2
                  </option>
                  <option value="Year 3 - Semester 1">
                    Year 3 - Semester 1
                  </option>
                  <option value="Year 3 - Semester 2">
                    Year 3 - Semester 2
                  </option>
                </select>
              </div>
            </div>

            {/* 2. Dynamic Modules List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-xl font-bold text-gray-800">
                  Modules to Register
                </h3>
                <span className="text-sm font-medium border-2 border-blue-100 text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  {modulesList.length} Module{modulesList.length > 1 ? "s" : ""}
                </span>
              </div>

              {modulesList.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-11 gap-3 items-end group animate-in slide-in-from-left-2 duration-200"
                >
                  <div className="md:col-span-4">
                    <label className="block text-sm font-bold text-gray-500 mb-1 ml-1">
                      Module Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.code}
                      onChange={(e) =>
                        handleRowChange(index, "code", e.target.value)
                      }
                      placeholder="e.g. PUSL2022, CS101"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div className="md:col-span-6">
                    <label className="block text-sm font-bold text-gray-500 mb-1 ml-1">
                      Module Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) =>
                        handleRowChange(index, "name", e.target.value)
                      }
                      placeholder="e.g. Introduction to Programming"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div className="md:col-span-1 pb-1">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      disabled={modulesList.length === 1}
                      className="p-2 text-red-500 bg-gray-100 hover:bg-red-50 border-2 border-red-100 rounded-lg transition-colors disabled:opacity-0 cursor-pointer"
                      title="Remove Row"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddRow}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 font-medium hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                Add Another Module
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-200 rounded-xl transition-colors cursor-pointer border-2 border-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-xl transition-colors shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <span>Register {modulesList.length} Modules</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function EditModuleModal({ isOpen, module, onClose, onSave, isSaving }: any) {
  const [faculty, setFaculty] = useState(module?.faculty || "");
  const [department, setDepartment] = useState(module?.department || "");
  const [selectedDegrees, setSelectedDegrees] = useState<string[]>(
    module?.degree ? module.degree.split(", ") : [],
  );
  const [level, setLevel] = useState(module?.level || "");
  const [moduleCode, setModuleCode] = useState(module?.module_code || "");
  const [moduleName, setModuleName] = useState(module?.module_name || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !faculty ||
      !department ||
      selectedDegrees.length === 0 ||
      !level ||
      !moduleCode ||
      !moduleName
    ) {
      toast.error("Please fill in all module details.");
      return;
    }

    const payload = {
      module_code: moduleCode.toUpperCase(),
      module_name: moduleName,
      faculty,
      department,
      level,
      degree: selectedDegrees.join(", "),
    };

    onSave(payload, true);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 ease-out" 
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 ease-out">
        <div className="px-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 className="text-2xl font-bold text-gray-900 pt-6">
            Update Module Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 hover:text-gray-800 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-blue-50/30 p-5 rounded-2xl border-2 border-blue-100/50">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Faculty Selection <span className="text-red-500">*</span>
                </label>
                <select
                  value={faculty}
                  onChange={(e) => {
                    setFaculty(e.target.value);
                    setDepartment("");
                    setSelectedDegrees([]);
                  }}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                >
                  <option value="">Choose a Faculty</option>
                  {Object.keys(universityData).map((fac) => (
                    <option key={fac} value={fac}>
                      {fac}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Academic Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    setSelectedDegrees([]);
                  }}
                  disabled={!faculty}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 cursor-pointer"
                >
                  <option value="">Select Department</option>
                  {faculty &&
                    universityData[faculty]?.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                </select>
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Target Degrees <span className="text-red-500">*</span>
                </label>
                <div className="border border-gray-300 rounded-xl text-sm font-semibold p-3 max-h-48 overflow-y-auto bg-white transition-all focus-within:ring-2 focus-within:ring-blue-500 shadow-inner">
                  {!department ? (
                    <span className="text-sm text-gray-400">
                      Select Department first
                    </span>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                      {(
                        degreeMapping[department] || ["BSc (Hons) Generic"]
                      ).map((deg) => (
                        <label
                          key={deg}
                          className="flex items-center space-x-2 p-1.5 hover:bg-gray-50 rounded-lg cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            value={deg}
                            checked={selectedDegrees.includes(deg)}
                            onChange={(e) => {
                              if (e.target.checked)
                                setSelectedDegrees([...selectedDegrees, deg]);
                              else
                                setSelectedDegrees(
                                  selectedDegrees.filter((d) => d !== deg),
                                );
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors font-medium">
                            {deg}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Academic Level / Year <span className="text-red-500">*</span>
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                >
                  <option value="">Select Level</option>
                  <option value="Year 1 - Semester 1">
                    Year 1 - Semester 1
                  </option>
                  <option value="Year 1 - Semester 2">
                    Year 1 - Semester 2
                  </option>
                  <option value="Year 2 - Semester 1">
                    Year 2 - Semester 1
                  </option>
                  <option value="Year 2 - Semester 2">
                    Year 2 - Semester 2
                  </option>
                  <option value="Year 3 - Semester 1">
                    Year 3 - Semester 1
                  </option>
                  <option value="Year 3 - Semester 2">
                    Year 3 - Semester 2
                  </option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800">
                Module Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-500 mb-1 ml-1">
                    Module Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={moduleCode}
                    onChange={(e) => setModuleCode(e.target.value)}
                    placeholder="e.g. CS101"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-500 mb-1 ml-1">
                    Module Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={moduleName}
                    onChange={(e) => setModuleName(e.target.value)}
                    placeholder="e.g. Introduction to Programming"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-200 rounded-xl transition-colors cursor-pointer border-2 border-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-blue-600 text-white font-medium hover:bg-blue-700 text-sm font-semibold rounded-xl transition-colors shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Update Module</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
