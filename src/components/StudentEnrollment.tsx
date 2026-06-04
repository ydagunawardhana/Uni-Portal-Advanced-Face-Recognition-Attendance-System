import React, { useState } from "react";
import {
  User,
  Mail,
  Phone,
  CreditCard,
  Briefcase,
  Building2,
  GraduationCap,
  Calendar,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Scan,
  LayoutGrid,
  ClipboardCheck,
  ChevronRight,
  Clock,
  BarChart3,
  RefreshCw,
  ChevronDown as ChevronDownIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../config";

const API_BASE = API_BASE_URL;

const universityData: Record<string, Record<string, string[]>> = {
  "Faculty of Computing": {
    "Department of Software Engineering & Computer Security": [
      "BSc (Hons) in Software Engineering",
      "BSc (Hons) in Computer Networks",
      "BSc (Hons) Computer Security",
      "BSc (Hons) Technology Management",
      "Bachelor of Information Technology (Major in Cyber Security)",
      "Foundation Programme for Bachelor's Degree",
    ],
    "Department of Computer and Data Science": [
      "BSc (Hons) in Computer Science",
      "BSc (Hons) in Data Science",
      "BSc (Hons) Artificial Intelligence",
      "BSc in Management Information Systems (Special)",
    ],
  },
  "Faculty of Business": {
    "Department of Management": [
      "BM (Honors) in Business Analytics",
      "BM (Honors) in Applied Economics",
      "BSc in Business Management (Industrial Management) (Special)",
      "BSc in Business Management (Project Management) (Special)",
      "BSc in Business Management (Human Resource Management) (Special)",
      "BSc (Hons) International Management and Business",
      "BSc (Hons) Business Communication",
      "BA in Business Communication",
      "BSc in Multimedia",
      "Bachelor of Business",
      "Bachelor of Science in Business Administration (BSBA)",
      "Foundation Programme for Bachelor's Degree",
    ],
    "Department of Accounting and Finance": [
      "BM (Hons) in Accounting and Finance",
      "BSc (Hons) Accounting and Finance",
    ],
    "Department of Marketing and Tourism": [
      "BM (Hons) in Marketing Management",
      "BBM (Hons) Tourism, Hospitality & Events",
      "BSc (Hons) Marketing Management",
      "BSc (Hons) Events, Tourism and Hospitality Management",
    ],
    "Department of Operations and Logistics": [
      "BSc in Business Management (Logistics Management) (Special)",
      "BSc (Hons) Operations and Logistics Management",
      "Bachelor of Business: Management and Innovation & Supply Chain and Logistics Management",
    ],
    "Department of Legal Studies": [
      "Bachelor of Laws (Honours)",
      "BM (Hons) in Law and Business Studies",
      "BM (Hons.) in Law and International Trade",
      "BM (Hons) in Law and E-Commerce",
      "LLB (Hons) Law",
    ],
  },
  "Faculty of Engineering": {
    "Department of Electrical, Electronic & Systems Engineering": [
      "Bachelor of Science of Engineering Honours in Electrical and Electronic Engineering",
      "Bachelor of Science of Engineering Honours in Computer Engineering",
      "BEng (Hons) Electrical, Electronics, and Communication Engineering",
      "Foundation Programme for Bachelor's Degree",
    ],
    "Department of Mechatronic and Industrial Engineering": [
      "Bachelor of Science of Engineering Honours in Mechatronic Engineering",
      "BEng (Hons) Mechanical and Mechatronics",
      "BEng (Hons) Robotics and Automation Engineering",
      "BEng (Hons) Civil and Structural Engineering",
      "BSc (Hons) Quantity Surveying",
      "BSc (Hons) Quantity Surveying Top-Up Degree",
    ],
    "Department of Design Studies": [
      "Bachelor of Interior Design",
      "BA (Hons) in Interior Design",
    ],
  },
  "Faculty of Science": {
    "Department of Health Sciences": [
      "BSc (Hons) in Biomedical Science",
      "BSc (Hons) Biomedical Science",
      "BSc (Honours) in Pharmaceutical Science",
      "BSc (Hons) Nutrition and Health",
      "BSc (Hons) Nursing",
      "BSc (Hons) Nursing – Top up",
      "Foundation Programme for Bachelor's Degree",
    ],
    "Department of Life Sciences": ["BSc (Hons) Psychology"],
  },
};

interface StudentEnrollmentProps {
  onBackToHome: () => void;
}

export default function StudentEnrollment({
  onBackToHome,
}: StudentEnrollmentProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    personal_email: "",
    mobile: "",
    nic_number: "",
    gender: "",
    faculty: "",
    department: "",
    degree_program: "",
    academic_year: "",
    intake: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "faculty") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        department: "",
        degree_program: "",
      }));
    } else if (name === "department") {
      setFormData((prev) => ({ ...prev, [name]: value, degree_program: "" }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!formData.name.trim()) {
        toast.error("Full Name is required");
        return false;
      }
      if (!formData.personal_email.trim()) {
        toast.error("Personal Email is required");
        return false;
      }
      if (!formData.personal_email.includes("@")) {
        toast.error("Enter a valid email");
        return false;
      }
      if (!formData.mobile.trim()) {
        toast.error("Mobile Number is required");
        return false;
      }
      if (!formData.mobile.match(/^[0-9]{10}$/)) {
        toast.error("Enter a valid mobile number");
        return false;
      }
      if (!formData.nic_number.trim()) {
        toast.error("NIC Number is required");
        return false;
      }
      if (!formData.nic_number.match(/^[0-9]{12}$/)) {
        toast.error("Enter a valid NIC number");
        return false;
      }
      if (!formData.gender.trim()) {
        toast.error("Gender is required");
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (!formData.faculty.trim()) {
        toast.error("Faculty is required");
        return false;
      }
      if (!formData.department.trim()) {
        toast.error("Department is required");
        return false;
      }
      if (!formData.degree_program.trim()) {
        toast.error("Degree Program is required");
        return false;
      }
      if (!formData.academic_year.trim()) {
        toast.error("Academic Year is required");
        return false;
      }
      if (!formData.intake.trim()) {
        toast.error("Intake/Batch is required");
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setIsSubmitting(true);
    const toastId = toast.loading("Verifying your details...");

    // Simulate verification delay for UX polish
    await new Promise((resolve) => setTimeout(resolve, 2500));

    try {
      const resp = await fetch(`${API_BASE}/api/public/pre-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await resp.json();

      if (!resp.ok) {
        toast.error(data.detail || "Submission failed. Please try again.", {
          id: toastId,
        });
        return;
      }

      toast.success("Pre-registration successful!", { id: toastId });
      setSubmitted(true);
    } catch (error) {
      toast.error("Network error. Please check your connection.", {
        id: toastId,
      });
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: <Clock size={20} />,
      title: "Quick Online Setup",
      desc: "Submit your academic and personal details in under 2 minutes from anywhere.",
    },
    {
      icon: <Scan size={20} />,
      title: "Biometric Ready",
      desc: "Your profile is primed for instant face-data capture when you visit the admin office.",
    },
    {
      icon: <ShieldCheck size={20} />,
      title: "Strict Data Privacy",
      desc: "Enterprise-grade encryption ensures your personal information is securely stored.",
    },
  ];

  if (submitted) {
    return (
      <div className="login-wrapper">
        <div className="login-left">
          <div
            className="glow-circle"
            style={{
              top: "-6rem",
              left: "-6rem",
              width: "24rem",
              height: "24rem",
              background: "rgba(255,255,255,0.16)",
            }}
          />
          <div className="branding-inner-wrapper">
            <div className="flex items-center gap-4 mb-16 relative z-10 ">
              <div className="bg-white text-blue-700 p-3.5 rounded-2xl shadow-xl">
                <GraduationCap size={52} strokeWidth={2} />
              </div>
              <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm">
                University Portal
              </h1>
            </div>
            <h2
              style={{
                fontSize: "clamp(2rem, 3.5vw, 3rem)",
                fontWeight: 800,
                lineHeight: 1.3,
                marginBottom: "1rem",
                gap: "0.5rem",
              }}
              className="text-4xl font-extrabold mb-6 leading-tight text-white"
            >
              Application Successfully <br />
              <span style={{ color: "#93c5fd" }}>Received</span>
            </h2>
            <p className="text-blue-100 text-lg opacity-90 leading-relaxed mb-8 mt-8">
              Thank you for starting your journey with us. Your preliminary
              details are now securely stored in our system.
            </p>
          </div>
        </div>
        <div className="login-right">
          <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500 bg-white p-12 rounded-xl shadow-2xl">
            <div className="bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-100 p-2">
              <CheckCircle2 size={54} />
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Success!
              </h1>
              <p className="text-lg text-gray-600 font-medium">
                Application Submitted Successfully.
              </p>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-xl shadow-md text-left">
              <p className="text-blue-900 font-medium text-sm leading-relaxed">
                Next Steps: Please visit the University Administration Office to
                capture your biometric face data and receive your official Index
                Number & University Email Via Email.
              </p>
            </div>

            <button
              onClick={onBackToHome}
              className="w-full py-4 bg-gray-900 cursor-pointer text-white font-bold rounded-xl hover:bg-black hover:scale-105 transition-all flex items-center justify-center space-x-2"
            >
              <ArrowLeft size={18} />
              <span>Back to Homepage</span>
            </button>
          </div>
        </div>
        <EnrollStyles />
      </div>
    );
  }

  return (
    <div className="login-wrapper">
      {/* Left Branding Panel */}
      <div className="login-left">
        <div
          className="glow-circle"
          style={{
            top: "-6rem",
            left: "-6rem",
            width: "24rem",
            height: "24rem",
            background: "rgba(255,255,255,0.16)",
          }}
        />
        <div
          className="glow-circle"
          style={{
            bottom: "-8rem",
            right: "-8rem",
            width: "30rem",
            height: "30rem",
            background: "rgba(83,85,209,0.27)",
          }}
        />

        {onBackToHome && (
          <button
            onClick={onBackToHome}
            className="absolute top-4 left-6 flex cursor-pointer   items-center gap-2 p-3 text-blue-100 hover:text-white transition-colors z-50"
          >
            <ArrowLeft size={20} />
            <span className="font-medium tracking-wide">Back to Home</span>
          </button>
        )}

        <div className="branding-inner-wrapper">
          <div className="w-full max-w-[36rem]">
            <div className="flex items-center gap-4 mb-16 relative z-10 ">
              <div className="bg-white text-blue-700 p-3.5 rounded-2xl shadow-xl">
                <GraduationCap size={52} strokeWidth={2} />
              </div>
              <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm">
                University Portal
              </h1>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.375rem 0.75rem",
                background: "rgba(255,255,255,0.1)",
                borderRadius: "9999px",
                border: "1px solid rgba(255,255,255,0.1)",
                fontSize: "0.75rem",
                fontWeight: 500,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                marginBottom: "1.5rem",
              }}
            >
              <ShieldCheck size={14} />
              Secure Enrollment
            </div>

            <h2
              style={{
                fontSize: "clamp(2rem, 3.5vw, 3rem)",
                fontWeight: 800,
                lineHeight: 1.15,
                marginBottom: "1rem",
              }}
            >
              Smart Student
              <br />
              <span style={{ color: "#93c5fd" }}>Pre-Registration</span>
            </h2>

            <p
              style={{
                color: "rgba(191,219,254,0.8)",
                fontSize: "1.125rem",
                lineHeight: 1.6,
                maxWidth: "28rem",
                marginBottom: "3rem",
              }}
            >
              Join the future of higher education. Complete your preliminary
              details online to fast-track your biometric enrollment upon campus
              arrival.
            </p>

            <div
              style={{
                position: "relative",
                zIndex: 10,
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                width: "100%",
              }}
            >
              {features.map((f, i) => (
                <div key={i} className="feature-card">
                  <div className="feature-icon">{f.icon}</div>
                  <div>
                    <h4
                      style={{
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        marginBottom: "0.125rem",
                      }}
                    >
                      {f.title}
                    </h4>
                    <p
                      style={{
                        color: "rgba(191,219,254,0.6)",
                        fontSize: "0.75rem",
                        lineHeight: 1.5,
                      }}
                    >
                      {f.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="login-right">
        <div className="max-w-3xl w-full">
          <div className="bg-white rounded-xl shadow-xl p-10 lg:p-14 border border-gray-100">
            {/* Progress Stepper — Flexbox Layout */}
            <div className="mb-10">
              {/* Top row: circles and connecting lines */}
              <div className="flex items-center w-full">
                {[1, 2, 3].map((step, idx) => {
                  const isActive = currentStep === step;
                  const isCompleted = currentStep > step;
                  const lineCompleted = currentStep > step;
                  return (
                    <React.Fragment key={step}>
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-12 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                            isActive
                              ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 scale-110"
                              : isCompleted
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "bg-white border-gray-300 text-gray-400"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 size={24} />
                          ) : (
                            <span className="text-md font-bold">{step}</span>
                          )}
                        </div>
                      </div>
                      {idx < 2 && (
                        <div
                          className={`flex-1 h-1 mx-3 rounded transition-all duration-500 ${
                            lineCompleted ? "bg-blue-600" : "bg-gray-200"
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              {/* Bottom row: step labels, aligned under circles */}
              <div className="flex items-start w-full mt-3">
                {["Personal", "Academic", "Review"].map((label, idx) => (
                  <React.Fragment key={label}>
                    <div
                      className="flex flex-col items-center"
                      style={{ width: "3 rem" }}
                    >
                      <span
                        className={`text-sm font-bold tracking-wider whitespace-nowrap ${
                          currentStep === idx + 1
                            ? "text-blue-600"
                            : "text-gray-400"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                    {idx < 2 && <div className="flex-1 mx-3" />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Step Content */}
            <div className="min-h-[400px] mt-12 animate-in fade-in slide-in-from-right-4 duration-300">
              {currentStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-1 gap-x-6 gap-y-8">
                  {/* Full Name */}
                  <div className="flex flex-col">
                    <label className="mb-2  text-sm  font-medium text-gray-700">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="field-icon text-gray-400" size={18} />
                      <input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        className="login-input py-2.5 border border-gray-300 rounded-xl text-sm font-semibold"
                      />
                    </div>
                  </div>

                  {/* Personal Email */}
                  <div className="flex flex-col">
                    <label className="mb-2 mt-4 text-sm font-medium text-gray-700">
                      Personal Email Address{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="field-icon text-gray-400" size={18} />
                      <input
                        type="email"
                        name="personal_email"
                        value={formData.personal_email}
                        onChange={handleChange}
                        placeholder="e.g. john.doe@gmail.com"
                        className="login-input py-2.5 border border-gray-300 rounded-xl text-sm font-semibold"
                      />
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="flex flex-col">
                    <label className="mb-2 mt-4 text-sm font-medium text-gray-700">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="field-icon text-gray-400" size={18} />
                      <input
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleChange}
                        placeholder="012 3456 789"
                        className="login-input py-2.5 border border-gray-300 rounded-xl text-sm font-semibold"
                      />
                    </div>
                  </div>

                  {/* NIC */}
                  <div className="flex flex-col">
                    <label className="mb-2 mt-4 text-sm font-medium text-gray-700">
                      NIC Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <CreditCard
                        className="field-icon text-gray-400"
                        size={18}
                      />
                      <input
                        name="nic_number"
                        value={formData.nic_number}
                        onChange={handleChange}
                        placeholder="e.g. 200012345678"
                        className="login-input py-2.5 border border-gray-300 rounded-xl text-sm font-semibold"
                      />
                    </div>
                  </div>

                  {/* Gender */}
                  <div className="flex flex-col">
                    <label className="mb-2 mt-4 text-sm font-medium text-gray-700">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <LayoutGrid
                        className="field-icon text-gray-400"
                        size={18}
                      />
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="login-input pl-11 cursor-pointer appearance-none bg-white pr-10 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600">
                        <ChevronDownIcon size={18} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-1 gap-x-6 gap-y-8">
                  {/* Faculty */}
                  <div className="flex flex-col">
                    <label className="mb-2 text-sm font-medium text-gray-700">
                      Faculty <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2
                        className="field-icon text-gray-400"
                        size={18}
                      />
                      <select
                        name="faculty"
                        value={formData.faculty}
                        onChange={handleChange}
                        className="login-input pl-11 appearance-none bg-white pr-10 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold"
                      >
                        <option value="">Select Faculty</option>
                        {Object.keys(universityData).map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600">
                        <ChevronDownIcon size={18} />
                      </div>
                    </div>
                  </div>

                  {/* Department */}
                  <div className="flex flex-col">
                    <label className="mb-2 mt-4 text-sm font-medium text-gray-700">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Briefcase
                        className="field-icon text-gray-400"
                        size={18}
                      />
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        disabled={!formData.faculty}
                        className="login-input pl-11 appearance-none rounded-xl border border-gray-300 text-sm font-semibold bg-white pr-10 disabled:bg-gray-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select Department</option>
                        {formData.faculty &&
                          Object.keys(universityData[formData.faculty]).map(
                            (d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            )
                          )}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600">
                        <ChevronDownIcon size={18} />
                      </div>
                    </div>
                  </div>

                  {/* Degree Program */}
                  <div className="flex flex-col">
                    <label className="mb-2 mt-4 text-sm font-medium text-gray-700">
                      Degree Program <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <GraduationCap
                        className="field-icon text-gray-400"
                        size={20}
                      />
                      <select
                        name="degree_program"
                        value={formData.degree_program}
                        onChange={handleChange}
                        disabled={!formData.department}
                        className="login-input pl-11 appearance-none rounded-xl text-sm font-semibold bg-white pr-10 disabled:bg-gray-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select Degree Program</option>
                        {formData.faculty &&
                          formData.department &&
                          universityData[formData.faculty][
                            formData.department
                          ].map((dp) => (
                            <option key={dp} value={dp}>
                              {dp}
                            </option>
                          ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600">
                        <ChevronDownIcon size={18} />
                      </div>
                    </div>
                  </div>

                  {/* Academic Year */}
                  <div className="flex flex-col">
                    <label className="mb-2 mt-4 text-sm font-medium text-gray-700">
                      Academic Year <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar
                        className="field-icon text-gray-400"
                        size={18}
                      />
                      <input
                        name="academic_year"
                        value={formData.academic_year}
                        onChange={handleChange}
                        placeholder="e.g. 2026"
                        className="login-input text-sm rounded-xl font-semibold"
                      />
                    </div>
                  </div>

                  {/* Intake */}
                  <div className="flex flex-col">
                    <label className="mb-2 mt-4 text-sm font-medium text-gray-700">
                      Intake / Batch <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar
                        className="field-icon text-gray-400"
                        size={18}
                      />
                      <input
                        name="intake"
                        value={formData.intake}
                        onChange={handleChange}
                        placeholder="e.g. 26.1"
                        className="login-input text-sm rounded-xl font-semibold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="bg-blue-50/50 rounded-xl p-8 border-2 border-blue-100 shadow-md">
                    <h3 className="text-md font-bold text-blue-900 uppercase tracking-widest flex items-center gap-3 mb-8">
                      <ClipboardCheck size={20} />
                      Review Application Details
                    </h3>
                    <div className="grid grid-cols-2 gap-8 gap-x-12">
                      <ReviewItem label="Full Name" value={formData.name} />
                      <ReviewItem
                        label="Personal Email"
                        value={formData.personal_email}
                      />
                      <ReviewItem
                        label="Mobile"
                        value={formData.mobile || "N/A"}
                      />
                      <ReviewItem
                        label="NIC"
                        value={formData.nic_number || "N/A"}
                      />
                      <ReviewItem label="Gender" value={formData.gender} />
                      <ReviewItem label="Faculty" value={formData.faculty} />
                      <ReviewItem
                        label="Department"
                        value={formData.department}
                      />
                      <ReviewItem
                        label="Degree"
                        value={formData.degree_program}
                      />
                      <ReviewItem
                        label="Academic Year"
                        value={formData.academic_year}
                      />
                      <ReviewItem label="Intake" value={formData.intake} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Actions */}
            <div className="flex items-center justify-between mt-10 pt-8 border-t border-gray-100">
              <button
                onClick={currentStep === 1 ? onBackToHome : handleBack}
                disabled={isSubmitting}
                className={`px-6 py-3 font-bold cursor-pointer text-sm flex items-center gap-2 transition-all ${
                  isSubmitting
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-500 hover:text-blue-600"
                }`}
              >
                <ArrowLeft size={18} />
                {currentStep === 1 ? "Cancel" : "Back Step"}
              </button>

              {currentStep < 3 ? (
                <button
                  onClick={handleNext}
                  className="login-btn px-10 py-3.5 w-auto min-w-[180px]"
                >
                  <span>Continue</span>
                  <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || loading}
                  className={`login-btn px-10 py-3.5 w-auto min-w-[220px] ${
                    isSubmitting ? "opacity-80 cursor-not-allowed" : ""
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin"
                        width={18}
                        height={18}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      <span>Verifying Details...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Application</span>
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <EnrollStyles />
    </div>
  );
}

function Field({
  label,
  children,
  mandatory = false,
}: {
  label: string;
  children: React.ReactNode;
  mandatory?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {mandatory && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">{children}</div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-sm text-blue-500 font-semibold tracking-widest block mb-0.5">
        {label}
      </span>
      <span className="text-sm font-bold text-gray-900 break-words">
        {value}
      </span>
    </div>
  );
}

const RefreshCwIcon = ({
  className,
  size,
}: {
  className?: string;
  size: number;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);

function EnrollStyles() {
  return (
    <>
      <style>{`
        .login-wrapper {
          display: flex;
          min-height: 100vh;
          width: 100%;
        }
        .login-left {
          display: none;
          width: 50%;
          position: relative;
          overflow: hidden;
          flex-direction: column;
          justify-content: center;
          padding-left: 3rem;
          padding-right: 3rem;
          color: #fff;
          background: linear-gradient(to bottom right, #1d4ed8, #1e40af, #3730a3);
        }
        .login-right {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: #f9fafb;
          position: relative;
        }
        @media (min-width: 1024px) {
          .login-left  { display: flex; }
          .login-right { width: 50%; padding: 3rem; }
        }
        @media (min-width: 1280px) {
          .login-left { padding-left: 5rem; padding-right: 5rem; }
        }
        .glow-circle {
          position: absolute;
          border-radius: 9999px;
          filter: blur(80px);
          pointer-events: none;
        }
        .branding-inner-wrapper {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 36rem;
          margin: 0 auto;
        }
        .feature-card {
           display: flex;
           align-items: flex-start;
           gap: 1rem;
           padding: 0.875rem;
           background: rgba(255,255,255,0.06);
           border-radius: 0.875rem;
           border: 1px solid rgba(255,255,255,0.1);
           transition: all 0.2s;
        }
        .feature-card:hover { 
           background: rgba(255,255,255,0.1); 
           transform: translateX(4px);
        }
        .feature-icon {
           padding: 0.625rem;
           background: rgba(255,255,255,0.12);
           border-radius: 0.75rem;
           color: #67e8f9;
           flex-shrink: 0;
           display: flex;
           align-items: center;
           justify-content: center;
        }
        .login-input {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 3rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          outline: none;
          font-size: 1rem;
          background: rgba(249,250,251,0.5);
          transition: all 0.2s;
          color: #111827;
        }
        .login-input:focus {
          background: #fff;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1), 0 0 0 1px #3b82f6;
        }
        .login-input::placeholder { color: #9ca3af; }
        .field-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          pointer-events: none;
        }
        .login-btn {
          padding: 0.875rem 1.5rem;
          border-radius: 0.75rem;
          font-weight: 600;
          font-size: 0.875rem;
          color: #fff;
          background: #2563eb;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(37,99,235,0.25);
          transition: all 0.2s;
          border: none;
        }
        .login-btn:hover { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 10px 15px -3px rgba(37,99,235,0.4); }
        .login-btn:active { transform: translateY(0); }
        .login-btn:disabled { opacity: 0.7; cursor: not-allowed; }
      `}</style>
    </>
  );
}
