import {
  Users,
  GraduationCap,
  CheckCircle,
  ArrowRight,
  UserPlus,
  ClipboardCheck,
  UserCheck,
  Clock,
} from "lucide-react";

interface DashboardHomeProps {
  onTabChange?: (tab: string) => void;
}

export default function DashboardHome({ onTabChange }: DashboardHomeProps) {
  const stats = [
    {
      title: "Total Students",
      value: "1,245",
      icon: Users,
      color: "blue",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Total Lecturers",
      value: "87",
      icon: GraduationCap,
      color: "purple",
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      title: "Today's Attendance",
      value: "87.5%",
      icon: CheckCircle,
      color: "green",
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Dashboard Overview
        </h2>
        <p className="text-gray-600 mt-1">
          Welcome back! Here's what's happening today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`${stat.bgColor} p-4 rounded-lg`}
                >
                  <Icon
                    className={`w-8 h-8 ${stat.iconColor}`}
                  />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-2">
                {stat.title}
              </h3>
              <p className="text-4xl font-bold text-gray-900">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Additional Content Area */}
      <div className="grid grid-cols-2 gap-6 mt-8">
        {/* Recent Activity Card - Redesigned */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header with Today Badge */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
            <h3 className="text-xl font-bold text-gray-900">
              Recent Activity
            </h3>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
              Today
            </span>
          </div>

          {/* Activity List */}
          <div className="px-6 py-4 space-y-4">
            {/* Event 1: New Student Registered */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  New student registered
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  John Smith - CS/2024/156
                </p>
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>2 hours ago</span>
                </div>
              </div>
            </div>

            {/* Event 2: Attendance Marked */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  Attendance session completed
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  CS301 - Database Systems
                </p>
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>4 hours ago</span>
                </div>
              </div>
            </div>

            {/* Event 3: Lecturer Added */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  New lecturer added
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Dr. Emily Watson
                </p>
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>Yesterday</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Action Button */}
          <div className="px-6 pb-6">
            <button
              onClick={() => onTabChange && onTabChange("audit")}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <span>View All Activity</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <p className="font-medium text-blue-900">
                Register New Student
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Add a new student to the system
              </p>
            </button>
            <button className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
              <p className="font-medium text-green-900">
                Generate Report
              </p>
              <p className="text-xs text-green-600 mt-1">
                Create attendance reports
              </p>
            </button>
            <button className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
              <p className="font-medium text-purple-900">
                Manage Lecturers
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Add or update lecturer information
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}