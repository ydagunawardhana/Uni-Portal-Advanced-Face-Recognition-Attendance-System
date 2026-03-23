import { useState } from 'react';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';

interface Student {
  id: number;
  name: string;
  indexNo: string;
  department: string;
  batch: string;
  mobile: string;
  email: string;
  status: 'Active' | 'Inactive';
  avatarColor: string;
}

interface ManageStudentsProps {
  onRegisterNew?: () => void;
}

export default function ManageStudents({ onRegisterNew }: ManageStudentsProps = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState('all');

  const students: Student[] = [
    {
      id: 1,
      name: 'Ashan Perera',
      indexNo: 'CS/2024/001',
      department: 'Computer Science',
      batch: 'Year 1',
      mobile: '+94 77 123 4567',
      email: 'ashan.perera@student.ac.lk',
      status: 'Active',
      avatarColor: 'bg-blue-500'
    },
    {
      id: 2,
      name: 'Sanduni Fernando',
      indexNo: 'CS/2024/012',
      department: 'Computer Science',
      batch: 'Year 1',
      mobile: '+94 76 234 5678',
      email: 'sanduni.fernando@student.ac.lk',
      status: 'Active',
      avatarColor: 'bg-purple-500'
    },
    {
      id: 3,
      name: 'Kamal Silva',
      indexNo: 'EE/2023/045',
      department: 'Electrical Engineering',
      batch: 'Year 2',
      mobile: '+94 75 345 6789',
      email: 'kamal.silva@student.ac.lk',
      status: 'Active',
      avatarColor: 'bg-green-500'
    },
    {
      id: 4,
      name: 'Nethmi Wijesinghe',
      indexNo: 'ME/2023/078',
      department: 'Mechanical Engineering',
      batch: 'Year 2',
      mobile: '+94 71 456 7890',
      email: 'nethmi.w@student.ac.lk',
      status: 'Inactive',
      avatarColor: 'bg-pink-500'
    },
    {
      id: 5,
      name: 'Ravindu Jayawardena',
      indexNo: 'CS/2022/123',
      department: 'Computer Science',
      batch: 'Year 3',
      mobile: '+94 77 567 8901',
      email: 'ravindu.j@student.ac.lk',
      status: 'Active',
      avatarColor: 'bg-orange-500'
    },
    {
      id: 6,
      name: 'Dilini Rajapaksha',
      indexNo: 'BA/2022/089',
      department: 'Business Administration',
      batch: 'Year 3',
      mobile: '+94 76 678 9012',
      email: 'dilini.r@student.ac.lk',
      status: 'Active',
      avatarColor: 'bg-teal-500'
    },
    {
      id: 7,
      name: 'Chaminda Bandara',
      indexNo: 'CE/2021/156',
      department: 'Civil Engineering',
      batch: 'Year 4',
      mobile: '+94 75 789 0123',
      email: 'chaminda.b@student.ac.lk',
      status: 'Active',
      avatarColor: 'bg-indigo-500'
    },
    {
      id: 8,
      name: 'Imesha Gamage',
      indexNo: 'AR/2024/007',
      department: 'Architecture',
      batch: 'Year 1',
      mobile: '+94 71 890 1234',
      email: 'imesha.gamage@student.ac.lk',
      status: 'Active',
      avatarColor: 'bg-red-500'
    },
    {
      id: 9,
      name: 'Tharindu Dissanayake',
      indexNo: 'CS/2023/067',
      department: 'Computer Science',
      batch: 'Year 2',
      mobile: '+94 77 901 2345',
      email: 'tharindu.d@student.ac.lk',
      status: 'Inactive',
      avatarColor: 'bg-yellow-500'
    },
    {
      id: 10,
      name: 'Hansini Wickramasinghe',
      indexNo: 'EE/2024/023',
      department: 'Electrical Engineering',
      batch: 'Year 1',
      mobile: '+94 76 012 3456',
      email: 'hansini.w@student.ac.lk',
      status: 'Active',
      avatarColor: 'bg-cyan-500'
    }
  ];

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.indexNo.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = 
      selectedDepartment === 'all' || student.department === selectedDepartment;
    
    const matchesBatch = 
      selectedBatch === 'all' || student.batch === selectedBatch;

    return matchesSearch && matchesDepartment && matchesBatch;
  });

  const handleEdit = (student: Student) => {
    console.log('Edit student:', student);
    alert(`Edit student: ${student.name}`);
  };

  const handleDelete = (student: Student) => {
    if (confirm(`Are you sure you want to delete ${student.name}?`)) {
      console.log('Delete student:', student);
      alert(`Student ${student.name} deleted successfully!`);
    }
  };

  const handleRegisterNew = () => {
    if (onRegisterNew) {
      onRegisterNew();
    } else {
      console.log('Register new student clicked');
      alert('Navigate to Student Registration screen');
    }
  };

  return (
    <div>
      {/* Control Bar */}
      <div className="bg-white rounded-lg shadow-md p-5 mb-6">
        <div className="flex items-center space-x-4">
          {/* Search Field */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by Name or Index Number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Filter by Department */}
          <select
            aria-label="Filter by Department"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-w-[200px]"
          >
            <option value="all">All Departments</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Electrical Engineering">Electrical Engineering</option>
            <option value="Mechanical Engineering">Mechanical Engineering</option>
            <option value="Civil Engineering">Civil Engineering</option>
            <option value="Business Administration">Business Administration</option>
            <option value="Architecture">Architecture</option>
          </select>

          {/* Filter by Batch */}
          <select
            aria-label="Filter by Batch"
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-w-[160px]"
          >
            <option value="all">All Batches</option>
            <option value="Year 1">Year 1</option>
            <option value="Year 2">Year 2</option>
            <option value="Year 3">Year 3</option>
            <option value="Year 4">Year 4</option>
          </select>

          {/* Register New Student Button */}
          <button
            onClick={handleRegisterNew}
            className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md font-medium whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span>Register New Student</span>
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Index No
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Batch
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  {/* Student (Avatar + Name) */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full ${student.avatarColor} flex items-center justify-center text-white font-semibold mr-3`}>
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="font-medium text-gray-900">{student.name}</div>
                    </div>
                  </td>

                  {/* Index No */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-700">{student.indexNo}</div>
                  </td>

                  {/* Department */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{student.department}</div>
                  </td>

                  {/* Batch */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{student.batch}</div>
                  </td>

                  {/* Contact (Two lines) */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700">{student.mobile}</div>
                    <div className="text-sm text-gray-500 mt-0.5">{student.email}</div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        student.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {student.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => handleEdit(student)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Student"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(student)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Student"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* No Results Message */}
        {filteredStudents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No students found matching your criteria.</p>
            <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filters.</p>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredStudents.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">1-{filteredStudents.length}</span> of <span className="font-medium">1245</span> students
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                Previous
              </button>
              <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium">
                1
              </button>
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                2
              </button>
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                3
              </button>
              <span className="px-2 text-gray-500">...</span>
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                125
              </button>
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}