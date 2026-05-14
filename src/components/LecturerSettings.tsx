import { useState } from "react";
import { Bell, Monitor } from "lucide-react";
import toast from "react-hot-toast";

export default function LecturerSettings() {
  const [dailySummary, setDailySummary] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [notifyAppeals, setNotifyAppeals] = useState(true);
  const [notifyAtRisk, setNotifyAtRisk] = useState(true);
  const [use24Hour, setUse24Hour] = useState(false);

  const handleSave = async () => {
    // Logic for saving notification preferences
    toast.success("Notification preferences updated successfully!");
  };

  const handleCancel = () => {
    setDailySummary(true);
    setSmsAlerts(false);
    setNotifyAppeals(true);
    setNotifyAtRisk(true);
    setUse24Hour(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {/* Notification Preferences Card */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
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
          <div className="flex items-center justify-between py-3">
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

          {/* New: Attendance Appeals */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">
                Attendance Correction Requests
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Get notified via notifications when a student submits an
                attendance appeal
              </p>
            </div>
            <button
              aria-label="Toggle Attendance Appeals"
              onClick={() => setNotifyAppeals(!notifyAppeals)}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors cursor-pointer ${
                notifyAppeals ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  notifyAppeals ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* New: At-Risk Alerts */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">
                At-Risk Student Alerts
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Receive warnings when a student's attendance drops below 70%
              </p>
            </div>
            <button
              aria-label="Toggle At-Risk Alerts"
              onClick={() => setNotifyAtRisk(!notifyAtRisk)}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors cursor-pointer ${
                notifyAtRisk ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  notifyAtRisk ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* New Card: Display Preferences */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Monitor className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Display Preferences
            </h2>
            <p className="text-sm text-gray-600">
              Customize how information is shown on your dashboard
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">24-Hour Time Format</p>
              <p className="text-sm text-gray-600 mt-1">
                Display times as 13:00 instead of 01:00 PM
              </p>
            </div>
            <button
              aria-label="Toggle 24-Hour Time Format"
              onClick={() => setUse24Hour(!use24Hour)}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors cursor-pointer ${
                use24Hour ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  use24Hour ? "translate-x-8" : "translate-x-1"
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
