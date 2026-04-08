import {
  ScanFace,
  TrendingUp,
  FileText,
  GraduationCap,
  ArrowRight,
  Mail,
  Phone,
} from "lucide-react";

interface LandingPageProps {
  onNavigateToLogin: (role?: "Admin" | "Lecturer" | "Student") => void;
}

export default function LandingPage({ onNavigateToLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                UniPortal
              </span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <a
                href="#features"
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                How it Works
              </a>
              <a
                href="#contact"
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                Contact
              </a>
              <button
                onClick={() => onNavigateToLogin()}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
              >
                Login to Portal
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-[#0f172a] pt-32 pb-20 overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-left">
              <div className="inline-block px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-full mb-6">
                <span className="text-blue-400 text-sm font-medium">
                  AI-Powered Attendance System
                </span>
              </div>

              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Next-Gen AI Attendance Tracking for Universities
              </h1>

              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Eliminate manual registers. Track student attendance in
                real-time using advanced Face Recognition technology.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Student Portal - Primary */}
                <button
                  onClick={() => onNavigateToLogin("Student")}
                  className="group px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold text-lg shadow-xl shadow-blue-900/20 hover:shadow-blue-900/30 hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <GraduationCap className="w-5 h-5" />
                  <span>Student Portal</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Lecturer Portal - Secondary */}
                <button
                  onClick={() => onNavigateToLogin("Lecturer")}
                  className="px-8 py-4 bg-transparent border-2 border-blue-500 text-blue-400 rounded-xl hover:bg-blue-600/10 transition-all font-semibold text-lg hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <span>Lecturer Portal</span>
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 mt-12 pt-12 border-t border-gray-700">
                <div>
                  <p className="text-3xl font-bold text-white mb-1">99%</p>
                  <p className="text-sm text-gray-400">Accuracy Rate</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white mb-1">50K+</p>
                  <p className="text-sm text-gray-400">Students</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white mb-1">200+</p>
                  <p className="text-sm text-gray-400">Universities</p>
                </div>
              </div>
            </div>

            {/* Right - Dashboard Mockup Placeholder */}
            <div className="relative">
              <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
                {/* Mockup Header */}
                <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>

                {/* Mockup Content */}
                <div className="p-8 relative">
                  <div className="bg-blue-600/20 rounded-lg p-6 mb-4 border border-blue-500/30">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-6 bg-blue-500/40 rounded w-32"></div>
                      <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <ScanFace className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="h-4 bg-gray-700 rounded w-48 mb-2"></div>
                    <div className="h-4 bg-gray-700 rounded w-36"></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <div className="h-3 bg-gray-600 rounded w-20 mb-3"></div>
                      <div className="h-8 bg-green-500/40 rounded w-16"></div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <div className="h-3 bg-gray-600 rounded w-20 mb-3"></div>
                      <div className="h-8 bg-purple-500/40 rounded w-16"></div>
                    </div>
                  </div>

                  <div className="h-32 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-gray-700"></div>

                  {/* Face Recognition HUD Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative">
                      {/* Bounding Box with Bracket Corners */}
                      <div className="relative w-64 h-64">
                        {/* Top Left Corner */}
                        <div className="absolute top-0 left-0 w-12 h-12">
                          <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
                          <div className="absolute top-0 left-0 w-1 h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
                        </div>

                        {/* Top Right Corner */}
                        <div className="absolute top-0 right-0 w-12 h-12">
                          <div className="absolute top-0 right-0 w-full h-1 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
                          <div className="absolute top-0 right-0 w-1 h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
                        </div>

                        {/* Bottom Left Corner */}
                        <div className="absolute bottom-0 left-0 w-12 h-12">
                          <div className="absolute bottom-0 left-0 w-full h-1 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
                          <div className="absolute bottom-0 left-0 w-1 h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
                        </div>

                        {/* Bottom Right Corner */}
                        <div className="absolute bottom-0 right-0 w-12 h-12">
                          <div className="absolute bottom-0 right-0 w-full h-1 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
                          <div className="absolute bottom-0 right-0 w-1 h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
                        </div>

                        {/* Horizontal Scanning Line - Animated */}
                        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,1)] animate-pulse"></div>

                        {/* Secondary Scan Lines */}
                        <div className="absolute left-0 right-0 top-1/3 h-px bg-cyan-400/30"></div>
                        <div className="absolute left-0 right-0 top-2/3 h-px bg-cyan-400/30"></div>

                        {/* Tech Labels */}
                        {/* Top Label - Scanning */}
                        <div className="absolute -top-8 left-0 flex items-center space-x-2">
                          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
                          <span className="text-cyan-400 text-xs font-mono tracking-wider">
                            SCANNING...
                          </span>
                        </div>

                        {/* Right Label - Match Percentage */}
                        <div className="absolute -right-4 top-1/4 bg-cyan-950/80 border border-cyan-400/50 px-3 py-1.5 rounded backdrop-blur-sm">
                          <div className="text-cyan-400 text-xs font-mono font-bold">
                            MATCH: 98%
                          </div>
                          <div className="h-1 bg-gray-700 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-cyan-400 to-green-400 w-[98%] shadow-[0_0_8px_rgba(34,211,238,0.6)]"></div>
                          </div>
                        </div>

                        {/* Bottom Label - ID Verified */}
                        <div className="absolute -bottom-10 right-0 flex items-center space-x-2 bg-green-950/80 border border-green-400/50 px-3 py-1.5 rounded backdrop-blur-sm">
                          <div className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
                          <span className="text-green-400 text-xs font-mono font-bold">
                            ID VERIFIED
                          </span>
                        </div>

                        {/* Additional HUD Elements */}
                        {/* Grid Pattern Overlay */}
                        <div
                          className="absolute inset-0 opacity-20"
                          style={{
                            backgroundImage: `
                                 linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px),
                                 linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)
                               `,
                            backgroundSize: "20px 20px",
                          }}
                        ></div>

                        {/* Center Crosshair */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                          <div className="w-8 h-8 border border-cyan-400 rounded-full opacity-50"></div>
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border-2 border-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.6)]"></div>
                        </div>

                        {/* Timestamp */}
                        <div className="absolute -top-8 right-0">
                          <span className="text-cyan-400/70 text-[10px] font-mono">
                            2026.02.09 14:23:47
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Badge */}
              <div className="absolute -top-4 -right-4 bg-green-500 text-white px-6 py-3 rounded-full shadow-xl font-bold flex items-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span>LIVE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Choose Our System?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Cutting-edge technology designed specifically for modern
              educational institutions
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1: Face Recognition */}
            <div className="group bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-blue-500 hover:shadow-2xl transition-all duration-300">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:scale-110 transition-all">
                <ScanFace className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Face Recognition
              </h3>
              <p className="text-gray-600 leading-relaxed">
                99% accurate AI-based identification. Instant student
                verification using advanced facial recognition algorithms.
              </p>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                  <span className="mr-2">Learn more</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Card 2: Real-Time Analytics */}
            <div className="group bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-blue-500 hover:shadow-2xl transition-all duration-300">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-600 group-hover:scale-110 transition-all">
                <TrendingUp className="w-8 h-8 text-green-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Real-Time Analytics
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Live insights on student participation. Track attendance trends
                and generate actionable insights instantly.
              </p>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                  <span className="mr-2">Learn more</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Card 3: Paperless Reports */}
            <div className="group bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-blue-500 hover:shadow-2xl transition-all duration-300">
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-600 group-hover:scale-110 transition-all">
                <FileText className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Paperless Reports
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Generate monthly reports instantly. Export to CSV, PDF, or
                integrate with existing student information systems.
              </p>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                  <span className="mr-2">Learn more</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Simple, automated, and seamless
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Student Registration
              </h3>
              <p className="text-gray-600">
                One-time face enrollment with student ID verification
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Live Class Scanning
              </h3>
              <p className="text-gray-600">
                Automated face detection during lectures in real-time
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Instant Reports
              </h3>
              <p className="text-gray-600">
                Attendance records auto-saved and accessible anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-[#0f172a] text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold">UniPortal</span>
              </div>
              <p className="text-gray-400 text-sm">
                Smart AI-powered attendance tracking for modern universities
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a
                    href="#features"
                    className="hover:text-blue-400 transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#how-it-works"
                    className="hover:text-blue-400 transition-colors"
                  >
                    How it Works
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-400 transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-400 transition-colors">
                    Documentation
                  </a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-blue-400 transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-400 transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-400 transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-400 transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold mb-4">Contact Us</h4>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">support@uniportal.edu</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">+1 (555) 123-4567</span>
                </li>
                <li>
                  <button
                    onClick={() => onNavigateToLogin("Admin")}
                    className="text-gray-400 hover:text-blue-400 transition-colors text-sm text-left cursor-pointer"
                  >
                    System Admin
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-8 mt-8 text-center text-gray-400 text-sm">
            <p>
              &copy; 2026 UniPortal. All rights reserved. | University Smart
              Attendance System
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
