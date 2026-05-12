import { useState } from "react";
import { toast } from "react-hot-toast";
import { Camera, Bell, Clock, Info, Shield } from "lucide-react";

const API_BASE = "http://localhost:8000";

export default function SettingsScreen() {
  const [faceThreshold, setFaceThreshold] = useState(75);
  const [cameraSource, setCameraSource] = useState("camera-1");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [lateArrivalTime, setLateArrivalTime] = useState("08:30");

  const handlePurgeData = async () => {
    if (
      !window.confirm(
        "Are you sure you want to purge biometric data for all inactive students? This action cannot be undone.",
      )
    ) {
      return;
    }

    const purgePromise = async () => {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API_BASE}/api/admin/purge-data`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to purge data");
      }
      return await res.json();
    };

    toast.promise(purgePromise(), {
      loading: "Purging inactive biometric data...",
      success: (data: any) => data.message,
      error: (err: any) => err.message,
    });
  };

  const handleSaveChanges = () => {
    // Simulate an API network request
    const saveSettingsPromise = new Promise((resolve) => {
      setTimeout(() => {
        resolve("Settings saved");
      }, 2000); // 2 seconds loading time
    });

    toast.promise(saveSettingsPromise, {
      loading: "Saving system parameters...",
      success: "Settings updated successfully!",
      error: "Error saving settings.",
    });
  };

  const handleReset = () => {
    const resetPromise = new Promise((resolve) => {
      setTimeout(() => {
        setFaceThreshold(75);
        setCameraSource("camera-1");
        setEmailAlerts(true);
        setSmsAlerts(false);
        setLateArrivalTime("08:30");
        resolve("Reset complete");
      }, 800);
    });

    toast.promise(resetPromise, {
      loading: "Restoring default settings...",
      success: "Settings reset to defaults.",
      error: "Error resetting settings.",
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {/* Recognition Parameters Card */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
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
                className="block text-md font-medium text-gray-700"
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
              step="5"
              value={faceThreshold}
              onChange={(e) => setFaceThreshold(Number(e.target.value))}
              className={`w-full h-3 rounded-lg appearance-none cursor-pointer outline-none slider dynamic-slider`}
              style={{
                background: `linear-gradient(to right, #16a34a ${faceThreshold}%, #e5e7eb ${faceThreshold}%)`,
              }}
            />
            <div className="flex justify-between text-sm font-bold text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
            <div className="mt-3 flex items-start space-x-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800 font-bold ">
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
              className="w-full px-4 py-2.5 cursor-pointer   border border-gray-300 rounded-xl font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
      <div className="bg-white rounded-xl  shadow-md p-6 border border-gray-200">
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
              className={`relative inline-flex h-7 w-14 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                emailAlerts ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform cursor-pointer rounded-full bg-white transition-transform ${
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
              className={`relative inline-flex h-7 w-14 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                smsAlerts ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform cursor-pointer rounded-full bg-white transition-transform ${
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
              Configure global attendance policies and time rules
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="w-full">
              <h4 className="font-medium text-gray-900">
                Global Grace Period (Minutes)
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Time allowed after session start before marking a student as
                'Late'
              </p>
            </div>
            <div className="w-full flex justify-end">
              <input
                type="number"
                defaultValue={30}
                className="w-20 px-4 py-2.5 border border-gray-300 rounded-xl text-md text-center font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="w-full">
              <h4 className="font-medium text-gray-900">
                Minimum Required Attendance (%)
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Threshold for warning alerts across all modules
              </p>
            </div>
            <div className="w-full flex justify-end">
              <input
                type="number"
                defaultValue={70}
                className="w-20 px-4 py-2.5 border border-gray-300 rounded-xl text-md text-center font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="w-full">
              <h4 className="font-medium text-gray-900">
                Late Arrival Mark Time
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Students arriving after this time will be marked as late
              </p>
            </div>
            <div className="w-full flex justify-end">
              <input
                type="time"
                id="lateTime"
                value={lateArrivalTime}
                onChange={(e) => setLateArrivalTime(e.target.value)}
                className="w-24 px-4 py-2.5 border border-gray-300 rounded-xl cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-md text-center font-bold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* New Card: Data & Privacy */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Shield className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Data & Privacy</h2>
            <p className="text-sm text-gray-600">
              Manage biometric data retention and system backups
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center py-2">
            <div>
              <h4 className="font-medium text-gray-900">
                Log Retention Period
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Automatically delete attendance logs older than selected period
              </p>
            </div>
            <select className="px-4 py-2.5 border border-gray-300 rounded-xl cursor-pointer text-md font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50">
              <option>6 Months</option>
              <option>1 Academic Year</option>
              <option>4 Years (Graduation)</option>
              <option>Keep Forever</option>
            </select>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium text-red-600">
                Purge Unused Biometric Data
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Delete face encodings of students who have graduated or
                unenrolled
              </p>
            </div>
            <button
              onClick={handlePurgeData}
              className="px-6 py-2.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-lg text-md font-bold transition-colors shadow-sm cursor-pointer"
            >
              Purge Data
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mt-8 mb-4">
        <button
          onClick={handleReset}
          className="px-6 py-2 bg-gray-100 border-2 border-gray-200  hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors cursor-pointer"
        >
          Reset to Defaults
        </button>
        <button
          onClick={handleSaveChanges}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
