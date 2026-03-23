import {
  LayoutDashboard,
  Video,
  History,
  BookOpen,
  Settings,
  ClipboardCheck,
  GraduationCap,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface LecturerSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function LecturerSidebar({
  activeTab,
  onTabChange,
  isCollapsed = false,
  onToggleCollapse,
}: LecturerSidebarProps) {
  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "mark-attendance",
      label: "Manual Attendances",
      icon: ClipboardCheck,
    },
    {
      id: "live-class",
      label: "Mark Attendances",
      icon: Video,
    },
    {
      id: "history",
      label: "Attendance History",
      icon: History,
    },
    { id: "subjects", label: "My Subjects", icon: BookOpen },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div
      className={`${isCollapsed ? "w-[80px]" : "w-[280px]"} fixed left-0 top-0 h-screen bg-gradient-to-b from-[#1e293b] to-[#0f172a] text-white flex flex-col transition-all duration-300 z-50`}
    >
      {/* Header Section */}
      <div
        className={`${isCollapsed ? "p-4" : "p-6"} border-b border-gray-700 transition-all duration-300`}
      >
        <div
          className={`flex ${isCollapsed ? "justify-center" : "items-center space-x-3"} mb-2`}
        >
          <div
            className={`${isCollapsed ? "w-10 h-10" : "w-12 h-12"} bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0`}
          >
            <GraduationCap
              className={`${isCollapsed ? "w-6 h-6" : "w-7 h-7"} text-white`}
            />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="text-lg font-bold text-white">
                Lecturer Portal
              </h2>
              <p className="text-xs text-gray-400 ml-0.5">
            Attendance System
          </p>
          </div>
          )}
      </div>
        </div>

      {/* Navigation Menu */}
      <nav
        className={`flex-1 ${isCollapsed ? "px-2" : "px-4"} py-6 space-y-2 transition-all duration-300`}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-3" : "space-x-3 px-4"} py-3 rounded-lg transition-all duration-200 ${
                activeTab === item.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/50"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="text-sm font-medium">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse Sidebar Footer */}
      <div className="border-t border-gray-700">
        <button
          onClick={onToggleCollapse}
          className={`w-full flex items-center ${isCollapsed ? "justify-center px-3" : "justify-between px-6"} py-4 hover:bg-gray-800 transition-colors group`}
          title={
            isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"
          }
        >
          {!isCollapsed && (
            <span className="text-sm font-medium text-gray-300 group-hover:text-white">
              Collapse Sidebar
            </span>
          )}
          {isCollapsed ? (
            <ChevronsRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
          ) : (
            <ChevronsLeft className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
          )}
        </button>
      </div>
    </div>
  );
}