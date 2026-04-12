import { useState, useEffect, useRef } from 'react';
import { User, CheckCircle, Calendar, Lock, Eye, EyeOff, Shield, Loader2, Camera, Clock, Laptop, Smartphone, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = "http://localhost:8000";

interface StudentData {
  name: string;
  index_number: string;
  email: string;
  personal_email?: string;
  mobile: string;
  faculty?: string;
  department: string;
  degree_program?: string;
  nic_number: string;
  gender: string;
  academic_year: string;
  intake: string;
  profile_picture?: string | null;
  retrain_requested: boolean;
  last_trained_date?: string | null;
}

interface SessionData {
  id: number;
  device_name: string;
  browser: string;
  ip_address: string;
  last_active: string;
  is_current_session: boolean;
}

export default function StudentProfileSecurity() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [isRetraining, setIsRetraining] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());
  
  // Dynamic profile image resolution with Cache Busting
  const profileImage = studentData?.profile_picture 
    ? `${API_BASE}${studentData.profile_picture}?t=${imageTimestamp}` 
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(studentData?.name || 'Student')}&background=random&size=200`;

  const lastTrained = studentData?.last_trained_date || 'Not available';

  useEffect(() => {
    const fetchProfileAndSessions = async () => {
      const token = localStorage.getItem("studentToken");
      if (!token) return;
      try {
        const [profileRes, sessionsRes] = await Promise.all([
          fetch(`${API_BASE}/api/student/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/api/student/sessions`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setStudentData(profileData);
        }
        
        if (sessionsRes.ok) {
           const sessionData = await sessionsRes.json();
           setSessions(sessionData);
        }

      } catch (err) {
        console.error(err);
      }
    };
    fetchProfileAndSessions();
  }, []);

  const handleRevokeSession = async (sessionId: number) => {
    const token = localStorage.getItem("studentToken");
    if (!token) return;
    
    const toastId = toast.loading("Revoking access...");
    try {
      const res = await fetch(`${API_BASE}/api/student/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Session revoked securely.", { id: toastId });
        setSessions(prev => prev.filter(s => s.id !== sessionId));
      } else {
        toast.error("Failed to revoke session.", { id: toastId });
      }
    } catch (err) {
      toast.error("Network error.", { id: toastId });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem("studentToken");
    if (!token) {
      toast.error('Authentication missing.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    const toastId = toast.loading('Uploading profile picture...');

    try {
      const res = await fetch(`${API_BASE}/api/student/upload-profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Profile picture updated successfully!', { id: toastId });
        setStudentData(prev => prev ? { ...prev, profile_picture: data.profile_picture } : null);
        setImageTimestamp(Date.now());
      } else {
        toast.error(data.detail || 'Failed to upload image.', { id: toastId });
      }
    } catch (err) {
      toast.error('Network error during upload.', { id: toastId });
    } finally {
      setIsUploading(false);
      // Reset input so they can select the same file again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRequestRetraining = async () => {
    const token = localStorage.getItem("studentToken");
    if (!token) {
      toast.error('Authentication missing. Please log in again.');
      return;
    }
    
    setIsRetraining(true);
    const toastId = toast.loading("Submitting request...");
    try {
      const res = await fetch(`${API_BASE}/api/student/request-retrain`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Request submitted successfully!", { id: toastId });
        setStudentData(prev => prev ? { ...prev, retrain_requested: true } : null);
      } else {
        toast.error(data.detail || "Failed to submit request.", { id: toastId });
      }
    } catch (err) {
      toast.error("Network error. Try again.", { id: toastId });
    } finally {
      setIsRetraining(false);
    }
  };

  const handleCancelRequest = async () => {
    const token = localStorage.getItem("studentToken");
    if (!token) return;

    const toastId = toast.loading("Cancelling request...");
    try {
      const res = await fetch(`${API_BASE}/api/student/retrain-request`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Request cancelled successfully!", { id: toastId });
        setStudentData(prev => prev ? { ...prev, retrain_requested: false } : null);
      } else {
        toast.error(data.detail || "Failed to cancel request.", { id: toastId });
      }
    } catch (err) {
      toast.error("Network error. Try again.", { id: toastId });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match!');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }

    const token = localStorage.getItem("studentToken");
    if (!token) {
      toast.error('Authentication missing. Please log in again.');
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading('Updating password...');

    try {
      const res = await fetch(`${API_BASE}/api/student/update-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.detail || "Failed to update password.", { id: toastId });
        return;
      }

      toast.success("Password updated successfully!", { id: toastId, duration: 3000 });
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // CRITICAL: Stop the persistent dashboard warning
      localStorage.removeItem('requiresPasswordChange');
      
    } catch (error) {
      toast.error('Server connection error.', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>    
    <style>{`
    input[type="password"]::-ms-reveal,
    input[type="password"]::-ms-clear {
      display: none;
    }
    `}</style>
    <div className="p-8 bg-white">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile & Security</h1>
        <p className="text-gray-600 mt-2">Manage your profile information and security settings</p>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
        {/* Left Side - Profile Card */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">Student Profile</h2>
          </div>

          

          {/* Profile Picture */}
          <div className="flex flex-col items-center mb-6">
            <div 
              className="relative group cursor-pointer w-32 h-32 rounded-full ring-4 ring-gray-100 shadow-lg" 
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
                accept="image/*" 
              />
              
              {/* Aththa Image Eka */}
              <img
                key={imageTimestamp}
                src={profileImage}
                alt="Profile"
                className={`w-full h-full rounded-full object-cover ${isUploading ? 'opacity-50' : ''}`}
              />
              
              {/* Verified check badge - FIXED POSITION */}
              <div className="absolute bottom-0 right-0 w-7 h-7 bg-green-500 rounded-full border-1 border-white flex items-center justify-center shadow-sm z-10">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            </div>
            
            <p 
              className="text-sm text-gray-500 mt-4 hover:text-red-600 transition-colors cursor-pointer font-medium" 
              onClick={() => fileInputRef.current?.click()}
            >
              Change Avatar
            </p>
          </div>

          {/* Student Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Full Name
              </label>
              <p className="text-lg font-bold text-gray-900">{studentData?.name || '...'}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Index Number
              </label>
              <p className="text-lg font-bold text-red-600">{studentData?.index_number || '...'}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                University Email
              </label>
              <p className="text-base text-gray-700">{studentData?.email || '...'}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Personal Email
              </label>
              <p className="text-base text-gray-700">{studentData?.personal_email || '...'}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Faculty
              </label>
              <p className="text-base text-gray-700">{studentData?.faculty || 'N/A'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Department
                </label>
                <p className="text-base text-gray-700">{studentData?.department || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Batch
                </label>
                <p className="text-base text-gray-700">{studentData?.academic_year || 'N/A'}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Degree Program
              </label>
              <p className="text-base text-gray-700">{studentData?.degree_program || 'N/A'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Mobile
                </label>
                <p className="text-base text-gray-700">{studentData?.mobile || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  NIC Number
                </label>
                <p className="text-base text-gray-700">{studentData?.nic_number || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Gender
                </label>
                <p className="text-base text-gray-700">{studentData?.gender || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Intake
                </label>
                <p className="text-base text-gray-700">{studentData?.intake || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Stacked Cards */}
        <div className="space-y-6">
          {/* Face Recognition Status Card */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-red-600" />
              <h2 className="text-xl font-bold text-gray-900">Face Recognition Status</h2>
            </div>

          {/* Status Section */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Current Status
            </label>
            <div className="inline-flex items-center gap-3 px-6 py-4 bg-green-100 border-2 border-green-500 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-700">Face Model Active</p>
                <p className="text-sm text-green-600">Your face recognition is enabled</p>
              </div>
            </div>
          </div>

          {/* Last Trained */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium">Last updated:</span>
              <span className="text-sm font-bold text-gray-900">{lastTrained}</span>
            </div>
          </div>

          {/* Request Re-training Button */}
          <div className="mb-8">
            <button
              onClick={handleRequestRetraining}
              disabled={isRetraining || studentData?.retrain_requested}
              className={`w-full px-6 py-3 border-2 rounded-lg font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${
                studentData?.retrain_requested
                  ? 'bg-yellow-50 border-yellow-500 text-yellow-600'
                  : 'bg-white border-red-600 text-red-600 hover:bg-red-50'
              }`}
            >
              {isRetraining ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting Request...
                </>
              ) : studentData?.retrain_requested ? (
                <>
                  <Clock className="w-5 h-5" />
                  Request Pending Admin Approval
                </>
              ) : (
                "Request Face Re-training"
              )}
            </button>
            {studentData?.retrain_requested && (
              <button 
                onClick={handleCancelRequest} 
                className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium underline-offset-2 hover:underline w-full text-center"
              >
                Cancel Request
              </button>
            )}
            <p className="text-xs text-gray-500 mt-2 text-center">
              Use this if your appearance has changed significantly
            </p>
          </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Face re-training requires admin approval. You will be notified via email once your request is processed.
              </p>
            </div>
          </div>

          {/* Active Sessions & Devices Card */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Active Sessions & Devices</h2>
            </div>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg bg-gray-50 hover:bg-white transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-100 rounded-full text-gray-600">
                      {session.device_name.toLowerCase().includes("pc") || session.device_name.toLowerCase().includes("mac") ? (
                        <Laptop className="w-5 h-5" />
                      ) : (
                        <Smartphone className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {session.device_name} <span className="text-gray-400 font-normal ml-1">• {session.browser}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {session.ip_address} • {session.last_active}
                      </p>
                    </div>
                  </div>
                  <div>
                    {session.is_current_session ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                        Active Now
                      </span>
                    ) : (
                      <button 
                        onClick={() => handleRevokeSession(session.id)}
                        className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-colors"
                      >
                        Revoke Access
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {sessions.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No active sessions tracked securely.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Section - Full Width Below */}
      <div className="mt-6 max-w-6xl">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
          </div>

          <form onSubmit={handleChangePassword} className="max-w-2xl">
            <div className="space-y-5">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Current Password <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  New Password <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm New Password <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </>
  );
}
