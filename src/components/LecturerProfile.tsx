import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Mail,
  Upload,
  Lock,
  Eye,
  EyeOff,
  BookOpen,
  IdCard,
  Building2,
  GraduationCap,
  Save,
  Plus,
  Trash2,
  Clock,
  Link as LinkIcon,
  Calendar,
} from "lucide-react";
import { toast } from "react-hot-toast";

const API_BASE = "http://localhost:8000";

interface OfficeHour {
  day: string;
  startTime: string;
  endTime: string;
  location: string;
}

interface Qualification {
  degree: string;
  institution: string;
  year: string;
}

interface LecturerData {
  name: string;
  employee_id: string;
  email: string;
  personal_email: string;
  faculty: string;
  department: string;
  assigned_subjects: string;
  profile_picture: string | null;
  office_hours: any;
}

export default function LecturerProfile() {
  const [lecturerData, setLecturerData] = useState<LecturerData | null>(null);
  const [fullName, setFullName] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Dynamic Lists State
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [officeHours, setOfficeHours] = useState<OfficeHour[]>([]);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (window.location.hash === "#password-settings") {
      const element = document.getElementById("password-settings");
      if (element) {
        // Add a small delay to ensure the page is fully rendered
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          // Optional: Highlight the section briefly
          element.classList.add("ring-4", "ring-yellow-500", "ring-offset-4");
          setTimeout(
            () =>
              element.classList.remove(
                "ring-4",
                "ring-yellow-500",
                "ring-offset-4",
              ),
            3000,
          );
          // Clear hash after scroll to prevent re-scroll on other updates
          window.history.replaceState(null, "", window.location.pathname);
        }, 600);
      }
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("lecturerToken");
      if (!token) return;

      const response = await fetch(`${API_BASE}/api/lecturer/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setLecturerData(data);
        setFullName(data.name || "");
        setPersonalEmail(data.personal_email || "");
        if (data.office_hours) {
          try {
            const parsed =
              typeof data.office_hours === "string"
                ? JSON.parse(data.office_hours)
                : data.office_hours;
            if (Array.isArray(parsed)) {
              setOfficeHours(parsed);
            } else {
              setOfficeHours([]);
            }
          } catch (e) {
            console.error("Failed to parse office hours:", e);
            setOfficeHours([]);
          }
        } else {
          setOfficeHours([]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      toast.error("Failed to load profile data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAll = async () => {
    const token = localStorage.getItem("lecturerToken");
    if (!token) return;

    setIsSaving(true);
    const toastId = toast.loading("Saving changes...");

    try {
      // 1. Update Profile (Name & Personal Email)
      const profileRes = await fetch(
        `${API_BASE}/api/lecturer/update-profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: fullName,
            personal_email: personalEmail,
            office_hours: officeHours,
          }),
        },
      );

      // 2. Update Password if fields are filled
      let passwordSuccess = true;
      if (currentPassword || newPassword || confirmPassword) {
        if (newPassword !== confirmPassword) {
          toast.error("New passwords do not match", { id: toastId });
          setIsSaving(false);
          return;
        }

        const pwdRes = await fetch(`${API_BASE}/api/lecturer/update-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        });

        if (!pwdRes.ok) {
          const pwdData = await pwdRes.json();
          toast.error(pwdData.detail || "Failed to update password", {
            id: toastId,
          });
          passwordSuccess = false;
        } else {
          // CRITICAL: Stop the persistent dashboard warning and session toast
          localStorage.removeItem("lecturerRequiresPasswordChange");
          sessionStorage.removeItem("passwordWarningToastShown");

          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        }
      }

      if (profileRes.ok && passwordSuccess) {
        toast.success("Profile updated successfully", { id: toastId });
        fetchProfile();
      } else if (profileRes.ok && !passwordSuccess) {
        // Already handled error toast
      } else {
        toast.error("Failed to update profile", { id: toastId });
      }
    } catch (err) {
      toast.error("Network error. Please try again.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem("lecturerToken");
    if (!token) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    const toastId = toast.loading("Uploading profile photo...");

    try {
      const res = await fetch(
        `${API_BASE}/api/lecturer/upload-profile-picture`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      if (res.ok) {
        const data = await res.json();
        toast.success("Photo updated successfully", { id: toastId });
        setLecturerData((prev) =>
          prev ? { ...prev, profile_picture: data.profile_picture } : null,
        );
        setImageTimestamp(Date.now());
      } else {
        const data = await res.json();
        toast.error(data.detail || "Upload failed", { id: toastId });
      }
    } catch (err) {
      toast.error("Network error during upload", { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const profileImageUrl = lecturerData?.profile_picture
    ? `${API_BASE}${lecturerData.profile_picture}?t=${imageTimestamp}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(lecturerData?.name || "Lecturer")}&background=random&size=200`;

  return (
    <div className="w-full mx-auto flex flex-col gap-6">
      {/* Card 1 - Profile & Contact Information */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm w-full">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Profile Information
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Personal details and contact information
            </p>
          </div>
        </div>

        {/* Profile Photo Section */}
        <div className="flex items-center gap-6 mt-6 mb-8">
          <div className="relative">
            {lecturerData?.profile_picture ? (
              <img
                src={profileImageUrl}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-2 border-gray-300 shadow-sm"
              />
            ) : (
              <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold border-2 border-white shadow-sm">
                {lecturerData?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase() || "L"}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-md font-semibold text-blue-600 cursor-pointer hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-3 rounded-lg transition-colors border-2 border-blue-500 flex items-center gap-3"
            >
              <Upload className="w-5 h-5" />
              Upload New Profile Photo
            </button>
            <p className="text-xs text-gray-500">
              Recommended: Square image, at least 400x400px
            </p>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleImageUpload}
            accept="image/*"
          />
        </div>

        <div className="flex flex-col gap-6 w-full mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Dr. Michael Johnson"
              className="w-full px-4 py-2.5 text-md border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Employee ID
            </label>
            <input
              type="text"
              disabled
              value={lecturerData?.employee_id || ""}
              className="w-full px-4 py-2.5 text-md border border-gray-300 rounded-lg text-gray-900 bg-gray-100 text-gray-500 cursor-not-allowed"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Employee ID cannot be changed.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              University Email
            </label>
            <input
              type="email"
              disabled
              value={lecturerData?.email || ""}
              className="w-full px-4 py-2.5 text-md border border-gray-300 rounded-lg text-gray-900 bg-gray-100 text-gray-500 cursor-not-allowed"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Used as the login username and cannot be changed.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Personal Email
            </label>
            <input
              type="email"
              value={personalEmail}
              onChange={(e) => setPersonalEmail(e.target.value)}
              placeholder="e.g. name@outlook.com"
              className="w-full px-4 py-2.5 text-md border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
      </div>

      {/* Card 2 - Academic Details */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm w-full">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-2 bg-yellow-100 rounded-lg text-indigo-600">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Academic Information
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Faculty, Department and assigned modules
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6 w-full mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Faculty
            </label>
            <input
              type="text"
              disabled
              value={lecturerData?.faculty || "Not Specified"}
              className="w-full px-4 py-2.5 text-md border border-gray-300 rounded-lg text-gray-900 bg-gray-100 text-gray-500 cursor-not-allowed"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Academic assignments are managed by the administration.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Department
            </label>
            <input
              type="text"
              disabled
              value={lecturerData?.department || ""}
              className="w-full px-4 py-2.5 text-md border border-gray-300 rounded-lg text-gray-900 bg-gray-100 text-gray-500 cursor-not-allowed"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Academic assignments are managed by the administration.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Assigned Subjects
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {lecturerData?.assigned_subjects ? (
                lecturerData.assigned_subjects
                  .split(",")
                  .map((subject, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      {subject.trim()}
                    </span>
                  ))
              ) : (
                <span className="text-sm text-gray-500">
                  No subjects assigned yet.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card 3 - Educational Qualifications */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm w-full">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Educational Qualifications
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage your academic degrees and certifications
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full mt-6">
          {qualifications.map((qual, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="Degree/Title"
                  value={qual.degree}
                  onChange={(e) => {
                    const newQuals = [...qualifications];
                    newQuals[index].degree = e.target.value;
                    setQualifications(newQuals);
                  }}
                  className="w-full px-4 py-2.5 text-md border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="col-span-5">
                <input
                  type="text"
                  placeholder="Institution"
                  value={qual.institution}
                  onChange={(e) => {
                    const newQuals = [...qualifications];
                    newQuals[index].institution = e.target.value;
                    setQualifications(newQuals);
                  }}
                  className="w-full px-4 py-2.5 text-md border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="col-span">
                <input
                  type="text"
                  placeholder="Year"
                  value={qual.year}
                  onChange={(e) => {
                    const newQuals = [...qualifications];
                    newQuals[index].year = e.target.value;
                    setQualifications(newQuals);
                  }}
                  className="w-full px-4 py-2.5 text-md border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <button
                  onClick={() =>
                    setQualifications(
                      qualifications.filter((_, i) => i !== index),
                    )
                  }
                  className="text-red-500 hover:text-red-700 p-2 transition-colors bg-red-100 cursor-pointer rounded-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() =>
              setQualifications([
                ...qualifications,
                { degree: "", institution: "", year: "" },
              ])
            }
            className="mt-2 text-sm cursor-pointer font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-2 group w-fit"
          >
            <div className="p-1 bg-blue-50 rounded group-hover:bg-blue-100 transition-colors">
              <Plus className="w-4 h-4" />
            </div>
            Add Qualification
          </button>
        </div>
      </div>

      {/* Card 5 - Office Hours */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm w-full">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Office Hours</h2>
            <p className="text-sm text-gray-500 mt-1">
              Set times when students can reach out for consultation
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full mt-6">
          {officeHours.map((slot, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-3">
                <select
                  value={slot.day}
                  onChange={(e) => {
                    const newSlots = [...officeHours];
                    newSlots[index].day = e.target.value;
                    setOfficeHours(newSlots);
                  }}
                  className="w-full px-4 py-2.5 text-md border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                >
                  {[
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ].map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <input
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => {
                    const newSlots = [...officeHours];
                    newSlots[index].startTime = e.target.value;
                    setOfficeHours(newSlots);
                  }}
                  className="w-full px-3 py-2.5 text-md border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => {
                    const newSlots = [...officeHours];
                    newSlots[index].endTime = e.target.value;
                    setOfficeHours(newSlots);
                  }}
                  className="w-full px-3 py-2.5 text-md border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="Location"
                  value={slot.location}
                  onChange={(e) => {
                    const newSlots = [...officeHours];
                    newSlots[index].location = e.target.value;
                    setOfficeHours(newSlots);
                  }}
                  className="w-full px-4 py-2.5 text-md border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <button
                  onClick={() =>
                    setOfficeHours(officeHours.filter((_, i) => i !== index))
                  }
                  className="text-red-500 hover:text-red-700 p-2 transition-colors bg-red-100 cursor-pointer rounded-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() =>
              setOfficeHours([
                ...officeHours,
                {
                  day: "Monday",
                  startTime: "",
                  endTime: "",
                  location: "",
                },
              ])
            }
            className="mt-2 text-sm cursor-pointer font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-2 group w-fit"
          >
            <div className="p-1 bg-blue-50 rounded group-hover:bg-blue-100 transition-colors">
              <Plus className="w-4 h-4" />
            </div>
            Add Time Slot
          </button>
        </div>
      </div>

      {/* Card 6 - Security */}
      <div
        id="password-settings"
        className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm w-full transition-all duration-500"
      >
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-2 bg-red-100 rounded-lg text-red-600">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Security</h2>
            <p className="text-sm text-gray-500 mt-1">
              Change your password to keep your account secure
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6 w-full mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2.5 text-md border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 text-md  border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 text-md   border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 leading-relaxed">
              <strong>Password Requirements:</strong> Minimum 8 characters,
              include uppercase, lowercase, numbers, and special characters.
            </p>
          </div>
        </div>
      </div>

      {/* Global Action Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="flex items-center cursor-pointer gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Save Changes
        </button>
      </div>
    </div>
  );
}
