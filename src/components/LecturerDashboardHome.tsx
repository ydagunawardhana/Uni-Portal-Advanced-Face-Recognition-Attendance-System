import { BookOpen, Users, TrendingUp, PlayCircle, Calendar, Clock, CheckCircle } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ClassHistory {
  id: number;
  date: string;
  subject: string;
  time: string;
  attendancePercentage: number;
}

export default function LecturerDashboardHome() {
  const stats = {
    totalClasses: 42,
    averageAttendance: 87,
    totalStudents: 156,
  };

  const currentSession = {
    subject: 'CS301 - Database Systems',
    topic: 'Database Management Systems',
    schedule: 'Monday, Wednesday, Friday - 9:00 AM',
    todaySchedule: 'Today, 9:00 AM - 11:00 AM',
    enrolledStudents: 45,
  };

  const recentClasses: ClassHistory[] = [
    { id: 1, date: '2026-02-06', subject: 'CS 101 - Database Systems', time: '09:00 AM', attendancePercentage: 89 },
    { id: 2, date: '2026-02-05', subject: 'CS 201 - Algorithms', time: '11:00 AM', attendancePercentage: 92 },
    { id: 3, date: '2026-02-05', subject: 'CS 101 - Database Systems', time: '09:00 AM', attendancePercentage: 85 },
    { id: 4, date: '2026-02-04', subject: 'CS 301 - AI & Machine Learning', time: '02:00 PM', attendancePercentage: 78 },
    { id: 5, date: '2026-02-04', subject: 'CS 201 - Algorithms', time: '11:00 AM', attendancePercentage: 94 },
    { id: 6, date: '2026-02-03', subject: 'CS 101 - Database Systems', time: '09:00 AM', attendancePercentage: 88 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Total Classes Conducted */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
            <span className="text-3xl font-bold text-gray-900">{stats.totalClasses}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Total Classes Conducted</h3>
          <p className="text-xs text-gray-500 mt-1">This semester</p>
        </div>

        {/* Average Attendance */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
            <span className="text-3xl font-bold text-gray-900">{stats.averageAttendance}%</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Average Attendance</h3>
          <p className="text-xs text-gray-500 mt-1">Across all classes</p>
        </div>

        {/* Total Students Assigned */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <span className="text-3xl font-bold text-gray-900">{stats.totalStudents}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Total Students Assigned</h3>
          <p className="text-xs text-gray-500 mt-1">Active enrollment</p>
        </div>
      </div>

      {/* Main Action Section - Current Session */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="inline-flex items-center space-x-2 bg-blue-500 bg-opacity-50 px-3 py-1 rounded-full mb-4">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Current Session</span>
            </div>
            <h2 className="text-3xl font-bold mb-2">{currentSession.subject}</h2>
            <p className="text-blue-100 mb-4">{currentSession.topic}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-200" />
                <span className="text-sm text-blue-100">{currentSession.todaySchedule}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-200" />
                <span className="text-sm text-blue-100">{currentSession.enrolledStudents} students enrolled</span>
              </div>
            </div>

            <button className="inline-flex items-center space-x-3 bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-50 transition-all transform hover:scale-105 shadow-xl">
              <PlayCircle className="w-6 h-6" />
              <span>Start Live Class</span>
            </button>
          </div>

          <div className="hidden lg:block ml-8">
            <div className="w-48 h-48 bg-white bg-opacity-20 rounded-full overflow-hidden flex items-center justify-center backdrop-blur-sm">
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1646579886135-068c73800308?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwcHJvZmVzc29yJTIwdGVhY2hpbmclMjBzbWFydCUyMGNsYXNzcm9vbSUyMHByZXNlbnRhdGlvbnxlbnwxfHx8fDE3NzA0NjczNTJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Professor teaching in smart classroom"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Recent Class History</h2>
          <p className="text-sm text-gray-600 mt-1">Your latest conducted classes</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Subject</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Time</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Attendance Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentClasses.map((classItem) => (
                <tr key={classItem.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{classItem.date}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{classItem.subject}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{classItem.time}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{classItem.attendancePercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              classItem.attendancePercentage >= 90
                                ? 'bg-green-500'
                                : classItem.attendancePercentage >= 75
                                ? 'bg-blue-500'
                                : 'bg-orange-500'
                            }`}
                            style={{ width: `${classItem.attendancePercentage}%` }}
                          ></div>
                        </div>
                      </div>
                      {classItem.attendancePercentage >= 85 && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {recentClasses.length} recent classes
          </p>
        </div>
      </div>
    </div>
  );
}