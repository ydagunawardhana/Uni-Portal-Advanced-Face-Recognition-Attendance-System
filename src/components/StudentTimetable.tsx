import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Loader2,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../config";

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
  hash = hash + moduleName.length * 18;
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

export default function StudentTimetable() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

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
      const studentToken = localStorage.getItem("studentToken");
      if (!studentToken) {
        toast.error("Session expired. Please login again.");
        return;
      }

      const res = await fetch(API_BASE_URL + "/api/student/timetable", {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      if (res.status === 206) {
        const warn = await res.json();
        setWarningMessage(
          warn.message ||
            "Your timetable cannot be displayed. Please update your profile."
        );
        setMissingFields(warn.missing_fields || []);
        setSchedule([]);
        return;
      }

      if (!res.ok) throw new Error("Failed to fetch timetable");

      setWarningMessage(null);
      setMissingFields([]);
      const data = await res.json();
      setSchedule(data);
    } catch (err) {
      console.error(err);
      toast.error("Could not load your timetable.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTimetable();
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Timetable updated successfully!");
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
    new Set(schedule.map((s) => s.module_name || s.module_code))
  ).filter(Boolean);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">
          Syncing your weekly schedule...
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-white dark:bg-gray-800 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {/* Page Header with Refresh Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Calendar className="w-10 h-10 text-red-600" />
          <div>
            {/* Title and Badges in one row */}
            <div className="flex items-center gap-4 mb-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Weekly Class Schedule
              </h2>
              {schedule.length > 0 && (
                <div className="flex items-center gap-3 mt-1 mb-1">
                  <span className="px-2.5 py-0.1 bg-red-50 dark:bg-red-900/20 text-red-600 text-sm font-bold rounded-full border-2 border-red-100 tracking-widest shadow-sm">
                    {schedule[0]?.academic_year || "Year 1"}
                  </span>
                  <span className="px-2.5 py-0.1 bg-red-50 dark:bg-red-900/20 text-red-600 text-sm font-bold rounded-full border-2 border-red-100 tracking-widest shadow-sm">
                    {schedule[0]?.semester || "Semester 1"}
                  </span>
                </div>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
              View your weekly class schedule for{" "}
              <span className="font-bold text-red-600">
                {displayDates["Monday"]} - {displayDates["Sunday"]}
              </span>
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold transition-all cursor-pointer disabled:opacity-50 active:scale-95"
        >
          <RefreshCw
            className={`w-4 h-4 ${
              isRefreshing
                ? "animate-spin text-blue-600"
                : "text-gray-500 dark:text-gray-400"
            }`}
          />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Warning Banner - shown when backend returns 206 (missing profile fields) */}
      {warningMessage && (
        <div className="mb-6 flex gap-3 items-start bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-sm">
          <div className="shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 text-xl font-black">
            !
          </div>
          <div>
            <p className="font-bold text-amber-800 text-sm mb-1">
              Timetable Unavailable — Incomplete Profile
            </p>
            <p className="text-amber-700 text-sm leading-relaxed">
              {warningMessage}
            </p>
            {missingFields.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {missingFields.map((f) => (
                  <span
                    key={f}
                    className="px-2.5 py-1 bg-amber-200 text-amber-900 text-xs font-bold rounded-full border border-amber-300"
                  >
                    Missing: {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conditional Rendering based on Schedule Data */}
      {schedule.length === 0 && !isLoading ? (
        <div className="w-full flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-md min-h-[500px]">
          <div className="w-24 h-24 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6 border-8 border-white shadow-sm">
            <Calendar className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            No Classes Scheduled
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-md leading-relaxed">
            You don't have any classes assigned for this week. Enjoy your free
            time! If you think this is a mistake, please check back later or
            contact your academic coordinator.
          </p>
          <button
            onClick={async () => {
              setIsLoading(true);
              await fetchTimetable();
              setTimeout(() => setIsLoading(false), 800);
            }}
            className="mt-8 px-6 py-3 bg-white dark:bg-gray-800  cursor-pointer border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-100 dark:bg-gray-700 transition-all flex items-center gap-2 shadow-sm"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                isLoading
                  ? "animate-spin text-blue-600"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            />
            Refresh Schedule
          </button>
        </div>
      ) : (
        <>
          {/* Horizontal Scroll Container */}
          <div className="flex flex-nowrap gap-5 overflow-x-auto pb-6 pt-2 w-full items-stretch snap-x custom-scrollbar">
            {Object.keys(groupedSchedule).map((dayName) => {
              const isToday = weekDates[dayName] === todayString;

              return (
                <div
                  key={dayName}
                  className={`flex-none w-[280px] lg:w-[320px] flex flex-col rounded-2xl overflow-hidden snap-start transition-all ${
                    isToday
                      ? "border-2 border-red-500 bg-white dark:bg-gray-800 shadow-md transform -translate-y-1"
                      : "border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md"
                  }`}
                >
                  {/* Day Header */}
                  <div
                    className={`py-4 flex flex-col items-center justify-center border-b ${
                      isToday
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-gray-200 text-gray-800 dark:text-gray-200 border-gray-100 dark:border-gray-700"
                    }`}
                  >
                    <h3 className="font-bold text-lg tracking-wide">
                      {dayName}
                    </h3>
                    <p
                      className={`text-sm mt-0.5 font-bold ${
                        isToday
                          ? "text-red-100"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {displayDates[dayName]}
                    </p>
                    {isToday && (
                      <span className="mt-2 bg-white dark:bg-gray-800 text-red-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Cards Container */}
                  <div
                    className={`p-3 flex-1 flex flex-col gap-3 ${
                      isToday
                        ? "bg-white dark:bg-gray-800"
                        : "bg-gray-50 dark:bg-gray-700/30"
                    }`}
                  >
                    {groupedSchedule[dayName].length > 0 ? (
                      groupedSchedule[dayName].map((cls, idx) => (
                        <div
                          key={idx}
                          className={`${getCardColor(
                            cls.module_name
                          )} text-white p-4 rounded-xl shadow-sm border border-white/30 flex flex-col gap-2 transition-transform hover:-translate-y-0.5`}
                        >
                          <h4 className="font-bold text-sm leading-snug">
                            {cls.module_name || cls.module_code}
                          </h4>
                          <div className="space-y-2 text-xs text-white/90 font-medium mt-2">
                            <p className="flex items-start gap-2">
                              <Clock className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
                              <span>
                                {cls.start_time} - {cls.end_time}
                              </span>
                            </p>
                            <p className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
                              <span className="leading-tight">
                                {cls.location || "TBA"}
                              </span>
                            </p>
                            <p className="flex items-start gap-2">
                              <User className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
                              <span className="truncate">
                                {cls.lecturer || "TBA"}
                              </span>
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex-1 flex p-1">
                        <div className="flex-1 w-full min-h-[120px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                          <p className="text-gray-400 text-[11px] font-bold tracking-widest uppercase">
                            No Classes
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
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-md w-full">
              <h4 className="font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2 text-lg">
                <span className="w-1.5 h-5 bg-blue-600 rounded-full"></span>
                Subject Color Guide
              </h4>
              <div className="flex flex-wrap gap-x-10 gap-y-4 gap-8">
                {uniqueSubjects.map((subj, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span
                      className={`w-4 h-4 rounded-full shadow-sm ${getCardColor(
                        subj
                      )} border border-gray-200 dark:border-gray-700/50`}
                    ></span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
