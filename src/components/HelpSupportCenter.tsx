import { useState } from 'react';
import { 
  Search, 
  Camera, 
  User, 
  Calendar, 
  AlertCircle, 
  ChevronDown,
  Mail,
  Phone,
  HelpCircle
} from 'lucide-react';

interface AccordionItem {
  question: string;
  answer: string;
}

export default function HelpSupportCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openAccordion, setOpenAccordion] = useState<number | null>(null);

  const faqCategories = [
    {
      title: 'Attendance Issues',
      icon: Camera,
      description: 'Camera not detecting, Marking absent',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Account & Profile',
      icon: User,
      description: 'Password reset, Face re-training',
      color: 'bg-green-50 text-green-600',
    },
    {
      title: 'Timetable',
      icon: Calendar,
      description: 'Schedule discrepancies',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: 'Technical Support',
      icon: AlertCircle,
      description: 'App crashing, Login errors',
      color: 'bg-orange-50 text-orange-600',
    },
  ];

  const popularQuestions: AccordionItem[] = [
    {
      question: 'How do I request an attendance correction?',
      answer: 'To request an attendance correction, navigate to your Student Dashboard and click on "Request Correction" in the Attendance section. Fill out the form with the date, class details, and reason for the correction. Your request will be reviewed by the lecturer and admin within 2-3 business days.',
    },
    {
      question: "What should I do if the camera doesn't recognize me?",
      answer: 'If the camera fails to recognize your face, ensure you are in a well-lit area and looking directly at the camera. If the issue persists, you may need to retrain your facial recognition data. Go to Profile Settings > Face Recognition > Retrain Face Data. Contact technical support if the problem continues.',
    },
    {
      question: 'How can I reset my password?',
      answer: 'Click on "Forgot Password?" on the login page. Enter your registered email address and you will receive a password reset link. Follow the instructions in the email to create a new password. Make sure to use a strong password with at least 8 characters, including letters, numbers, and symbols.',
    },
    {
      question: 'Why is my timetable not showing correct classes?',
      answer: 'Timetable discrepancies can occur due to recent schedule changes or system updates. Try refreshing the page or logging out and back in. If the issue persists, contact your department administrator to verify your enrolled courses. Changes typically reflect within 24 hours of enrollment.',
    },
    {
      question: 'What are the system requirements for face recognition?',
      answer: 'The system requires a device with a functional camera (minimum 720p resolution), a modern web browser (Chrome, Firefox, Safari, or Edge - latest versions), and stable internet connection (minimum 2 Mbps). Ensure your browser has camera permissions enabled for the application.',
    },
    {
      question: 'How long does it take to process an attendance correction request?',
      answer: 'Attendance correction requests are typically processed within 2-3 business days. You will receive an email notification once your request has been reviewed. The lecturer will first verify the request, and then it will be approved by the admin. Check your dashboard for the status of your request.',
    },
  ];

  const toggleAccordion = (index: number) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6">
            <HelpCircle className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Help & Support Center</h1>
          <p className="text-xl text-blue-100 mb-8">How can we help you today?</p>
          
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help articles, FAQs, or topics..."
              className="w-full pl-12 pr-4 py-4 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-4 focus:ring-blue-300 outline-none shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* FAQ Categories */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Browse by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {faqCategories.map((category, index) => {
              const IconComponent = category.icon;
              return (
                <button
                  key={index}
                  className="bg-white rounded-lg p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left"
                >
                  <div className={`inline-flex items-center justify-center w-12 h-12 ${category.color} rounded-lg mb-4`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{category.title}</h3>
                  <p className="text-sm text-gray-600">{category.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Popular Questions */}
        <section className="mb-16">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Popular Questions</h2>
            <div className="space-y-3">
              {popularQuestions.map((item, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleAccordion(index)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="font-medium text-gray-900 pr-4">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${
                        openAccordion === index ? 'transform rotate-180' : ''
                      }`}
                    />
                  </button>
                  {openAccordion === index && (
                    <div className="px-4 pb-4 pt-0 text-gray-600 leading-relaxed border-t border-gray-100 bg-gray-50">
                      <p className="pt-4">{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Footer */}
        <section>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8 text-center border border-blue-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Still need help?</h2>
            <p className="text-gray-600 mb-8">Our support team is here to assist you</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* Email Support */}
              <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-full mb-4">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
                <p className="text-sm text-gray-600 mb-3">We'll respond within 24 hours</p>
                <a
                  href="mailto:support@university.edu"
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm hover:underline"
                >
                  support@university.edu
                </a>
              </div>

              {/* Hotline */}
              <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 text-green-600 rounded-full mb-4">
                  <Phone className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Hotline Number</h3>
                <p className="text-sm text-gray-600 mb-3">Available 9 AM - 5 PM (Mon-Fri)</p>
                <a
                  href="tel:+15551234567"
                  className="text-green-600 hover:text-green-700 font-medium text-sm hover:underline"
                >
                  +1 (555) 123-4567
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
