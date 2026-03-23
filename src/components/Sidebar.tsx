import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  UserCog,
  History,
  GraduationCap,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onCollapseChange?: (isCollapsed: boolean) => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  onCollapseChange,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleToggleCollapse = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    if (onCollapseChange) {
      onCollapseChange(newCollapsedState);
    }
  };

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "students",
      label: "Student Registration",
      icon: Users,
    },
    {
      id: "lecturers",
      label: "Manage Lecturers",
      icon: UserCog,
    },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "audit", label: "Audit Logs", icon: History },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div 
      className={`fixed left-0 top-0 h-screen bg-[#0f172a] text-white flex flex-col transition-all duration-300 z-50 ${
        isCollapsed ? 'w-[80px]' : 'w-[280px]'
      }`}
    >
      {/* Header Section */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          {/* University Logo Icon */}
          <div className="bg-blue-600 p-2.5 rounded-lg flex-shrink-0">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          
          {/* Text Content */}
          {!isCollapsed && (
            <div>
              <h2 className="text-lg font-bold text-white">University Portal</h2>
              <p className="text-xs text-gray-400 mt-0.5">Admin Panel</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-lg transition-all duration-200 group ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/50"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
              title={isCollapsed ? item.label : ''}
            >
              <Icon className={`flex-shrink-0 ${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'}`} />
              {!isCollapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Collapse Trigger */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleToggleCollapse}
          className="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-300 hover:text-white"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? (
            <ChevronsRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronsLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}