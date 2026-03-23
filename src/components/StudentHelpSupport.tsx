import { useState } from 'react';
import { 
  Search, 
  Camera, 
  LogIn, 
  User, 
  ChevronDown,
  Mail,
  Phone,
  HelpCircle,
  Clock
} from 'lucide-react';

interface AccordionItem {
  question: string;
  answer: string;
}

export default function StudentHelpSupport() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openAccordion, setOpenAccordion] = useState<number | null>(null);

  const faqCategories = [
    {
      title: 'Attendance Issues',
      icon: Camera,
      description: 'Camera detection, Absent marking',
      questions: 5,
      color: 'bg-red-50 text-red-600',
    },
    {
      title: 'Login Problems',
      icon: LogIn,
      description: 'Password reset, Access issues',
      questions: 4,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Profile Updates',
      icon: User,
      description: 'Face re-training, Personal info',
      questions: 3,
      color: 'bg-purple-50 text-purple-600',
    },
  ];

  const popularQuestions: AccordionItem[] = [
    {
      question: 'How do I request an attendance correction?',
      answer: 'Go to "Request Correction" in the sidebar menu. Fill out the form with the date, class details, and reason for correction. Attach any supporting documents if needed. Your lecturer will review and approve the request within 2-3 business days.',
    },
    {
      question: "What should I do if the camera doesn't recognize me?",
      answer: 'Ensure proper lighting and look directly at the camera. Clean your camera lens. If issues persist, go to My Profile > Face Recognition Settings > Retrain Face. Follow the on-screen instructions to capture new face data.',
    },
    {
      question: 'How can I reset my password?',
      answer: 'Click "Forgot Password?" on the login page. Enter your university email. You\'ll receive a reset link within 5 minutes. Click the link and create a new password. Use at least 8 characters with uppercase, lowercase, and numbers.',
    },
    {
      question: 'Why is my attendance showing as absent when I was present?',
      answer: 'This can happen due to face recognition errors or network issues. Check if you marked both entry and exit. If the issue persists, submit a correction request with details of the class. Include any screenshots or proof of attendance.',
    },
    {
      question: 'How do I update my profile picture?',
      answer: 'Navigate to My Profile from the sidebar. Click on your current profile picture. Upload a new photo (JPEG/PNG, max 5MB). Crop and adjust as needed. Click "Save Changes" to update your profile picture.',
    },
  ];

  const toggleAccordion = (index: number) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  return (
    <div className="p-8 bg-white min-h-full">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-10 mb-8 border border-red-100">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-full mb-6">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">How can we help?</h1>
          <p className="text-gray-600 mb-6">Search for answers or browse help topics below</p>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help articles or FAQs..."
              className="w-full pl-14 pr-6 py-4 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:ring-4 focus:ring-red-100 outline-none transition-all text-gray-900 placeholder-gray-500"
            />
          </div>
        </div>
      </div>

      {/* FAQ Grid */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-5">Browse by Topic</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {faqCategories.map((category, index) => {
            const IconComponent = category.icon;
            return (
              <button
                key={index}
                className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-red-300 hover:shadow-lg transition-all duration-300 text-left group"
              >
                <div className={`inline-flex items-center justify-center w-14 h-14 ${category.color} rounded-xl mb-4 group-hover:scale-110 transition-transform`}>
                  <IconComponent className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">{category.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                <div className="flex items-center text-xs text-gray-500">
                  <HelpCircle className="w-4 h-4 mr-1" />
                  {category.questions} articles
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Popular Questions */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-5">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {popularQuestions.map((item, index) => (
            <div
              key={index}
              className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-red-200 transition-colors"
            >
              <button
                onClick={() => toggleAccordion(index)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="font-semibold text-gray-900 pr-4">
                  {item.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-red-600 flex-shrink-0 transition-transform duration-200 ${
                    openAccordion === index ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              {openAccordion === index && (
                <div className="px-5 pb-5 pt-0 text-gray-700 leading-relaxed bg-red-50/30 border-t border-gray-200">
                  <p className="pt-4">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 border-2 border-gray-200">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Still need assistance?</h2>
            <p className="text-gray-600">Our support team is ready to help you</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Email Support */}
            <div className="bg-white rounded-xl p-6 text-center border border-gray-200 hover:border-red-300 hover:shadow-md transition-all">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 text-red-600 rounded-full mb-4">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Email Support</h3>
              <p className="text-xs text-gray-600 mb-3">Response within 24 hours</p>
              <a
                href="mailto:student.support@university.edu"
                className="text-red-600 hover:text-red-700 font-medium text-sm hover:underline"
              >
                student.support@university.edu
              </a>
            </div>

            {/* Hotline */}
            <div className="bg-white rounded-xl p-6 text-center border border-gray-200 hover:border-red-300 hover:shadow-md transition-all">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 text-green-600 rounded-full mb-4">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Student Hotline</h3>
              <p className="text-xs text-gray-600 mb-3">Mon-Fri, 9 AM - 5 PM</p>
              <a
                href="tel:+15551234567"
                className="text-green-600 hover:text-green-700 font-medium text-sm hover:underline"
              >
                +1 (555) 123-4567
              </a>
            </div>

            {/* Office Hours */}
            <div className="bg-white rounded-xl p-6 text-center border border-gray-200 hover:border-red-300 hover:shadow-md transition-all">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-full mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Visit Help Desk</h3>
              <p className="text-xs text-gray-600 mb-3">Student Affairs Office</p>
              <p className="text-blue-600 font-medium text-sm">
                Building A, Room 101
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
