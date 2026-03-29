import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function DashboardOverview() {
  // Sample Data
  const attendancePercentage = 85;
  const [animatedChartData, setAnimatedChartData] = useState([
    { name: 'Present', value: 0 }, 
    { name: 'Absent', value: 100 }
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedChartData([
        { name: 'Present', value: 85 },
        { name: 'Absent', value: 15 }
      ]);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const studentInfo = {
    name: 'Alex Thompson',
    indexNumber: 'CS/2021/045',
    batch: '2021',
    department: 'Computer Science',
  };
  const attendanceData = [
    { name: 'Present', value: 85 },
    { name: 'Absent', value: 15 }
  ];
  const COLORS = ['#10b981', '#ef4444']; 
  const classHistory = [
    {
      id: 1,
      className: 'CS301 - Database Systems',
      date: '2026-02-06',
      time: '09:00 AM',
      status: 'Present',
    },
    {
      id: 2,
      className: 'CS302 - Algorithms',
      date: '2026-02-06',
      time: '11:00 AM',
      status: 'Present',
    },
    {
      id: 3,
      className: 'CS304 - AI & ML',
      date: '2026-02-05',
      time: '09:00 AM',
      status: 'Absent',
    },
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            My Profile
          </h2>
          <div className="text-center">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <User className="w-16 h-16 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {studentInfo.name}
            </h3>
            <p className="text-sm text-gray-600 mb-1">
              {studentInfo.indexNumber}
            </p>
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-3 text-left">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  Batch:
                </span>
                <span className="text-sm font-medium">
                  {studentInfo.batch}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  Attendance:
                </span>
                <span className="text-sm font-medium text-green-600">
                  {attendancePercentage}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="col-span-1 md:col-span-2 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Attendance Summary
          </h2>
          {/* Attendance Donut Chart Container */}
          <div className="flex flex-col items-center justify-center py-6 w-full">

            {/* Chart & Center Text Wrapper */}
            <div className="relative w-[220px] h-[220px] flex items-center justify-center">
              
              {/* Bulletproof fixed-size PieChart */}
              <PieChart width={230} height={230}>
                <Pie
                  data={animatedChartData}
                  cx={115} // Exactly half of width
                  cy={115} // Exactly half of height
                  innerRadius={75}
                  outerRadius={105}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive={true}
                  animationDuration={1500}
                >
                  <Cell fill="#10b77fff" /> {/* Tailwind emerald-500 */}
                  <Cell fill="#ef4444" /> {/* Tailwind red-500 */}
                </Pie>
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              </PieChart>

              {/* Absolute Centered Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[12px] text-gray-800 font-bold uppercase tracking-wider">Overall</span>
                <span className="text-3xl font-bold text-gray-900 mt-1">85%</span>
              </div>
            </div>

            {/* Custom HTML Legend (Guaranteed to render beautifully) */}
            <div className="flex items-center gap-6 mt-8">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium text-gray-600">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-600"></div>
                <span className="text-sm font-medium text-gray-600">Absent</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Recent Class History
          </h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold">
                Class Name
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold">
                Date
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {classHistory.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium">
                  {record.className}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {record.date} • {record.time}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full ${record.status === 'Present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {record.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
