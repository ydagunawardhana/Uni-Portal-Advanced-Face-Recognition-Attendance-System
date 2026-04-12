import React from "react";
import {
  Home,
  CalendarDays,
  Calendar,
  FileText,
  User,
  Settings,
  LogOut,
  HelpCircle,
  Users,
} from "lucide-react";

interface StudentSidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onLogout: () => void;
}

export default function StudentSidebar({
  activeTab,
  onTabChange,
  onLogout,
}: StudentSidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    {
      id: "timetable",
      label: "My Timetable",
      icon: CalendarDays,
    },
    {
      id: "attendance",
      label: "My Attendance",
      icon: Calendar,
    },
    {
      id: "request-correction",
      label: "Request Correction",
      icon: FileText,
    },
    {
      id: "book-consultations",
      label: "Book Consultations",
      icon: Users,
    },
    { id: "profile", label: "My Profile", icon: User },
    { id: "help", label: "Help & Support", icon: HelpCircle },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen flex-shrink-0">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">U</span>
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Student Portal</h2>
            <p className="text-xs text-gray-500">University System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all ${
                isActive
                  ? "bg-red-100 text-red-700 shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon
                className={`w-5 h-5 ${
                  isActive ? "text-red-600" : "text-gray-500"
                }`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
