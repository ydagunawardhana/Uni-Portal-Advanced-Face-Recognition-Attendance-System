import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  GraduationCap,
  Loader2,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

// Safe-listed Tailwind classes to prevent compilation drops
const colorPalette = [
  "bg-blue-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-purple-500",
  "bg-teal-500",
  "bg-indigo-500",
];

const getCardColor = (moduleName: string) => {
  if (!moduleName) return colorPalette[0];
  let hash = 0;
  for (let i = 0; i < moduleName.length; i++) {
    hash = moduleName.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = hash + moduleName.length * 7; // Added salt to prevent collisions
  return colorPalette[Math.abs(hash) % colorPalette.length];
};

// Get exactly the 7 dates of the current week (Monday to Sunday)
const getCurrentWeekDates = () => {
  const curr = new Date();
  // Calculate Monday of this week
  const first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1);

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const weekDates: Record<string, string> = {};
  const displayDates: Record<string, string> = {};

  days.forEach((day, index) => {
    const date = new Date(curr.getTime());
    date.setDate(first + index);

    // Format YYYY-MM-DD for matching with database records
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    weekDates[day] = `${y}-${m}-${d}`;

    // Format "Apr 22" for the UI header
    displayDates[day] = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  });

  return { weekDates, displayDates };
};

export default function LecturerTimetable() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { weekDates, displayDates } = getCurrentWeekDates();

  // Calculate today's date based strictly on Local Time, not UTC
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
  const currentDay = String(today.getDate()).padStart(2, "0");
  const todayString = `${currentYear}-${currentMonth}-${currentDay}`;

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      // STRICTLY using lecturerToken
      const token = localStorage.getItem("lecturerToken");
      if (!token) {
        toast.error("Session expired. Please login again.");
        return;
      }

      // STRICTLY hitting lecturer endpoint
      const res = await fetch("http://localhost:8000/api/lecturer/timetable", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch timetable");

      const data = await res.json();
      setSchedule(data);
    } catch (err) {
      console.error(err);
      toast.error("Could not load your teaching schedule.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTimetable();
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Schedule updated successfully!");
    }, 800);
  };

  // Group ONLY the classes that belong to THIS week
  const groupedSchedule: Record<string, any[]> = {
    Monday: schedule.filter((s) => s.date === weekDates["Monday"]),
    Tuesday: schedule.filter((s) => s.date === weekDates["Tuesday"]),
    Wednesday: schedule.filter((s) => s.date === weekDates["Wednesday"]),
    Thursday: schedule.filter((s) => s.date === weekDates["Thursday"]),
    Friday: schedule.filter((s) => s.date === weekDates["Friday"]),
    Saturday: schedule.filter((s) => s.date === weekDates["Saturday"]),
    Sunday: schedule.filter((s) => s.date === weekDates["Sunday"]),
  };

  // Get unique subject names for the legend
  const uniqueSubjects = Array.from(
    new Set(schedule.map((s) => s.module_name || s.module_code)),
  ).filter(Boolean);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-gray-500 font-medium animate-pulse">
          Syncing your teaching schedule...
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 bg-white">
      {/* Page Header with Refresh Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Calendar className="w-10 h-10 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Weekly Teaching Schedule</h2>
            <p className="text-gray-500 text-md mt-1">
              View your sessions for the week of{" "}
              <span className="font-bold text-blue-600">
                {displayDates["Monday"]} - {displayDates["Sunday"]}
              </span>
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 text-gray-700 font-bold transition-all cursor-pointer disabled:opacity-50 active:scale-95"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-600" : "text-gray-500"}`}
          />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Conditional Rendering based on Schedule Data */}
      {schedule.length === 0 && !isLoading ? (
        <div className="w-full flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-100 shadow-md min-h-[500px]">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 border-8 border-white shadow-sm">
            <Calendar className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            No Sessions Scheduled
          </h3>
          <p className="text-gray-500 text-center max-w-md leading-relaxed">
            You don't have any teaching sessions assigned for this week. Enjoy your free
            time!
          </p>
          <button
            onClick={async () => {
              setIsLoading(true);
              await fetchTimetable();
              setTimeout(() => setIsLoading(false), 800);
            }}
            className="mt-8 px-6 py-3 bg-white cursor-pointer border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-all flex items-center gap-2 shadow-sm"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-600" : "text-gray-500"}`}
            />
            Refresh Schedule
          </button>
        </div>
      ) : (
        <>
          {/* 7-Column Grid Layout - ULTRA COMPACT (FORCED 7 COLUMNS) */}
          <div className="grid grid-cols-5 md:grid-cols-5 gap-4 lg:gap-1.5 w-full items-stretch">
            {Object.keys(groupedSchedule).map((dayName) => {
              const isToday = weekDates[dayName] === todayString;

              return (
                <div
                  key={dayName}
                  className={`flex flex-col h-full rounded-2xl overflow-hidden transition-all ${
                    isToday
                      ? "border-2 border-blue-500 bg-white shadow-md"
                      : "border-2 border-gray-200 bg-white shadow-md"
                  }`}
                >
                  {/* Ultra-Compact Day Header */}
                  <div
                    className={`py-1.5 flex flex-col items-center justify-center border-b ${
                      isToday
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-gray-200 text-gray-800 border-gray-200"
                    }`}
                  >
                    <h3 className="font-bold text-[11px] xl:text-xs tracking-tight truncate w-full text-center px-1">
                      {dayName}
                    </h3>
                    <p
                      className={`text-[9px] xl:text-[10px] font-bold mt-0.5 ${
                        isToday ? "text-blue-100" : "text-gray-500"
                      }`}
                    >
                      {displayDates[dayName]}
                    </p>
                    {isToday && (
                      <span className="mt-2 bg-white text-blue-600 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-widest shadow-sm leading-none">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Ultra-Compact Cards Container */}
                  <div
                    className={`p-3 flex-1 flex flex-col gap-3 ${
                      isToday ? "bg-white" : "bg-gray-50/30"
                    }`}
                  >
                    {groupedSchedule[dayName].length > 0 ? (
                      groupedSchedule[dayName].map((cls, idx) => (
                        <div
                          key={idx}
                          className={`${getCardColor(
                            cls.module_name,
                          )} text-white p-3 rounded-lg shadow-md border border-white/20 flex flex-col gap-1 cursor-default hover:brightness-105 hover:scale-105 transition-all`}
                        >
                          <h4 className="font-bold text-md leading-tight line-clamp-2">
                            {cls.module_name } - {cls.module_code}
                          </h4>
                          <div className="space-y-2 text-sm text-white font-medium mt-2">
                            <p className="flex items-center gap-1">
                              <Clock className="w-5 h-5 shrink-0 opacity-80" />
                              <span className="truncate">
                                {cls.start_time} - {cls.end_time}
                              </span>
                            </p>
                            <p className="flex items-center gap-1">
                              <MapPin className="w-5 h-5 shrink-0 opacity-80" />
                              <span className="truncate">
                                {cls.location || "TBA"}
                              </span>
                            </p>
                            {/* Lecturer Specific Info */}
                            <div className="flex flex-col pt-1 mt-1">
                              <p className="flex items-center gap-1">
                                <Users className="w-5 h-5 shrink-0 opacity-80" />
                                <span className="truncate">
                                  {cls.batch || cls.intake || "All Batches"}
                                </span>
                              </p>
                              <p className="flex items-center gap-1 mt-2">
                                <GraduationCap className="w-6 h-6 shrink-0 opacity-80" />
                                <span className="truncate">
                                  {cls.semester || "N/A"}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex-1 flex p-2 h-full">
                        <div className="flex-1 w-full h-full min-h-[130px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50">
                          <p className="text-gray-400 text-[11px] font-bold tracking-widest uppercase">
                            NO CLASSES
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Subject Color Code Legend */}
          {uniqueSubjects.length > 0 && (
            <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-6 shadow-md w-full">
              <h4 className="font-bold text-gray-900 mb-5 flex items-center gap-2 text-lg">
                <span className="w-1.5 h-5 bg-blue-600 rounded-full"></span>
                Subject Color Guide
              </h4>
              <div className="flex flex-wrap gap-x-10 gap-y-4 gap-8">
                {uniqueSubjects.map((subj, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span
                      className={`w-4 h-4 rounded-full shadow-sm ${getCardColor(subj)} border border-gray-200/50`}
                    ></span>
                    <span className="text-sm font-medium text-gray-700">
                      {subj}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
