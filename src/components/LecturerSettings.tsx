import { useState } from "react";
import { Bell } from "lucide-react";
import toast from "react-hot-toast";

export default function LecturerSettings() {
  const [dailySummary, setDailySummary] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);

  const handleSave = async () => {
    // Logic for saving notification preferences
    toast.success("Notification preferences updated successfully!");
  };

  const handleCancel = () => {
    setDailySummary(true);
    setSmsAlerts(false);
  };

  return (
    <div className="space-y-6">
      {/* Notification Preferences Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-green-100 rounded-lg">
            <Bell className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Notification Preferences
            </h2>
            <p className="text-sm text-gray-600">
              Manage your notification settings
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Daily Attendance Summary Toggle */}
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <p className="font-medium text-gray-900">
                Receive Daily Attendance Summary
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Get a summary email of attendance at the end of each day
              </p>
            </div>
            <button
              aria-label="Toggle Daily Summary View"
              onClick={() => setDailySummary(!dailySummary)}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors cursor-pointer ${
                dailySummary ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  dailySummary ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* SMS Alerts Toggle */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">
                SMS Alerts for Class Schedules
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Receive text messages 30 minutes before scheduled classes
              </p>
            </div>
            <button
              aria-label="Toggle SMS Alerts"
              onClick={() => setSmsAlerts(!smsAlerts)}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors cursor-pointer ${
                smsAlerts ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  smsAlerts ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-4">
        <button
          onClick={handleCancel}
          className="px-6 py-2.5 border-2 cursor-pointer border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-blue-600 cursor-pointer text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
