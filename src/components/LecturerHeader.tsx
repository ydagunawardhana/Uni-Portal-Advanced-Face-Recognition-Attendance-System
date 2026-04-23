import React, { useState, useEffect } from "react";
import { User, LogOut } from "lucide-react";

interface LecturerHeaderProps {
  onLogout?: () => void;
}

export default function LecturerHeader({ onLogout }: LecturerHeaderProps) {
  const [lecturerName, setLecturerName] = useState("Lecturer");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("lecturerToken");
        if (!token) return;
        const res = await fetch("http://localhost:8000/api/lecturer/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setLecturerName(data.name || "Lecturer");
        }
      } catch (err) {
        console.error("Failed to fetch lecturer profile", err);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.clear();
      window.location.href = "/";
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Mark Attendances
          </h1>
          <p className="text-sm text-gray-700 mt-1">
            Select a session from your daily schedule to begin live tracking
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg border-2 border-gray-200 shadow-sm transition-all hover:bg-gray-200 cursor-default">
            <User className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-bold text-gray-800">
              {lecturerName}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 cursor-pointer px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-bold shadow-sm"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
