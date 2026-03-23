import { useState } from "react";
import { Camera, Bell, Clock, Info } from "lucide-react";

export default function SettingsScreen() {
  const [faceThreshold, setFaceThreshold] = useState(75);
  const [cameraSource, setCameraSource] = useState("camera-1");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [lateArrivalTime, setLateArrivalTime] = useState("08:30");

  const handleSaveChanges = () => {
    alert("Settings saved successfully!");
  };

  const handleResetDefaults = () => {
    setFaceThreshold(75);
    setCameraSource("camera-1");
    setEmailAlerts(true);
    setSmsAlerts(false);
    setLateArrivalTime("08:30");
    alert("Settings reset to defaults.");
  };

  return (
    <div className="space-y-6">
      {/* Recognition Parameters Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Camera className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Recognition Parameters
            </h2>
            <p className="text-sm text-gray-600">
              Configure face detection and camera settings
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Face Matching Threshold Slider */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label
                htmlFor="threshold"
                className="block text-sm font-medium text-gray-700"
              >
                Face Matching Threshold (Confidence %)
              </label>
              <span className="text-2xl font-bold text-blue-600">
                {faceThreshold}%
              </span>
            </div>
            <input
              type="range"
              id="threshold"
              min="0"
              max="100"
              value={faceThreshold}
              onChange={(e) => setFaceThreshold(Number(e.target.value))}
              className={`w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider dynamic-slider`}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
            <div className="mt-3 flex items-start space-x-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800">
                Higher values increase accuracy but may reject valid matches.
                Recommended: 70-80%
              </p>
            </div>
          </div>

          {/* Camera Source Dropdown */}
          <div>
            <label
              htmlFor="camera"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Select Camera Source
            </label>
            <select
              id="camera"
              value={cameraSource}
              onChange={(e) => setCameraSource(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="camera-1">
                Camera 1 - Front Entrance (Built-in Webcam)
              </option>
              <option value="camera-2">
                Camera 2 - Main Classroom (External USB)
              </option>
              <option value="camera-3">
                Camera 3 - Lab Room A (IP Camera)
              </option>
              <option value="camera-4">
                Camera 4 - Lecture Hall B (HD Camera)
              </option>
            </select>
          </div>
        </div>
      </div>

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
              Manage alert settings for attendance events
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Email Alerts Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="font-medium text-gray-900">Enable Email Alerts</p>
              <p className="text-sm text-gray-600 mt-1">
                Receive notifications via email for attendance updates
              </p>
            </div>
            <button
              title="Toggle Email Alerts"
              onClick={() => setEmailAlerts(!emailAlerts)}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                emailAlerts ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  emailAlerts ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* SMS Alerts Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="font-medium text-gray-900">Enable SMS Alerts</p>
              <p className="text-sm text-gray-600 mt-1">
                Receive text message notifications for critical events
              </p>
            </div>
            <button
              title="Toggle SMS Alerts"
              onClick={() => setSmsAlerts(!smsAlerts)}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
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

      {/* Attendance Rules Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Attendance Rules
            </h2>
            <p className="text-sm text-gray-600">
              Configure attendance policies and time rules
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="lateTime"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Late Arrival Mark Time
          </label>
          <input
            type="time"
            id="lateTime"
            value={lateArrivalTime}
            onChange={(e) => setLateArrivalTime(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-lg"
          />
          <p className="text-sm text-gray-500 mt-2">
            Students arriving after this time will be marked as late
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={handleResetDefaults}
          className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Reset to Defaults
        </button>
        <button
          onClick={handleSaveChanges}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
