import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import StudentSidebar from './StudentSidebar';
import DashboardOverview from './DashboardOverview';
import StudentTimetable from './StudentTimetable';
import AttendanceCorrectionRequest from './AttendanceCorrectionRequest';
import StudentProfileSecurity from './StudentProfileSecurity';
import StudentHelpSupport from './StudentHelpSupport';
import { Bell, LogOut } from 'lucide-react';

interface StudentDashboardProps {
  onLogout: () => void;
  onNavigate?: (screen: any) => void;
}

export default function StudentDashboard({ onLogout, onNavigate }: StudentDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notificationCount] = useState(3);

  useEffect(() => {
    const requiresPassChange = localStorage.getItem('requiresPasswordChange') === 'true';
    if (requiresPassChange) {
      toast("⚠️ Security Alert: Please go to your Profile to change your auto-generated temporary password.", {
        duration: 10000,
        style: { background: "#fff3cd", color: "#856404", fontWeight: 500, border: "1px solid #ffeeba" },
        id: "password-warning-toast",
      });
    }
  }, []);

  const studentInfo = {
    name: 'Alex Thompson',
    indexNumber: 'CS/2021/045',
    department: 'Computer Science',
    batch: '2021',
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'timetable':
        return <StudentTimetable />;
      case 'request-correction':
        return <AttendanceCorrectionRequest onLogout={onLogout} onNavigate={onNavigate || (() => {})} />;
      case 'profile':
        return <StudentProfileSecurity />;
      case 'help':
        return <StudentHelpSupport />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <StudentSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-4 flex justify-between items-center flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 capitalize">
              {activeTab.replace('-', ' ')}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Welcome back, {studentInfo.name.split(' ')[0]}!
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="relative p-2 hover:bg-gray-100 rounded-lg">
              <Bell className="w-6 h-6 text-gray-600" />
              {notificationCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </button>
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Dynamic Content Body */}
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}